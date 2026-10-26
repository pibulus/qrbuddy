import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { formatInternationalPrice, PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "./modal/CardModal.tsx";
import { getApiUrl } from "../utils/api.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
import { getClientLocale } from "../utils/i18n.ts";
import {
  getOrCreatePassport,
  type QRBuddyPassport,
} from "../utils/passport.ts";
import {
  clearPendingCheckout,
  getPendingCheckout,
  getSupporterPass,
  setPendingCheckout,
  setSupporterPass,
  supporterPassExpiry,
} from "../utils/supporter-pass.ts";

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

function trackUmami(event: string, data?: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  const win = globalThis as any;
  if (win.umami) win.umami.track(event, data);
}

function stripCheckoutParam() {
  const url = new URL(globalThis.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  history.replaceState(null, "", url.toString());
}

const CHECKOUT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Global signal for modal state
export const pricingModalOpen = signal(false);

export function openPricingModal() {
  pricingModalOpen.value = true;
}

export function closePricingModal() {
  pricingModalOpen.value = false;
}

type ClaimStatus = "idle" | "checking" | "waiting" | "error" | "missing";
type CheckoutAvailability =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export function PricingModal({ lang }: { lang?: "en" | "es" } = {}) {
  const isSpanish = getClientLocale(lang) === "es";
  const isOpen = pricingModalOpen.value;
  const [hasPass, setHasPass] = useState(false);
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [pastedPass, setPastedPass] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimRetry, setClaimRetry] = useState(0);
  const [passCopied, setPassCopied] = useState(false);
  const [checkoutAvailability, setCheckoutAvailability] = useState<
    CheckoutAvailability
  >("idle");
  const [checkoutRetry, setCheckoutRetry] = useState(0);
  const checkoutAllowedRef = useRef(false);
  const claimCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    setPassport(getOrCreatePassport());
    const onPassportChanged = () => setPassport(getOrCreatePassport());
    globalThis.addEventListener("qrb-passport-changed", onPassportChanged);
    globalThis.addEventListener("qrb-passport-synced", onPassportChanged);
    return () => {
      globalThis.removeEventListener("qrb-passport-changed", onPassportChanged);
      globalThis.removeEventListener("qrb-passport-synced", onPassportChanged);
    };
  }, [isOpen]);

  // Check the public availability endpoint when the offer opens. This only
  // reads configuration; a payment link is created only after an explicit click.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    checkoutAllowedRef.current = false;
    setCheckoutAvailability("checking");
    setCheckoutError("");
    void apiRequest<{ available: boolean }>(
      `${getApiUrl()}/create-checkout`,
      { method: "GET" },
      "Could not check checkout availability",
    ).then((data) => {
      if (!cancelled) {
        checkoutAllowedRef.current = data.available;
        setCheckoutAvailability(data.available ? "available" : "unavailable");
      }
    }).catch(() => {
      if (!cancelled) {
        checkoutAllowedRef.current = false;
        setCheckoutAvailability("error");
      }
    });
    return () => {
      cancelled = true;
      checkoutAllowedRef.current = false;
    };
  }, [isOpen, checkoutRetry]);

  // Claim poller: back from Square (?checkout=) or a pending checkout in
  // storage → poll get-license until the webhook lands, then store the pass.
  useEffect(() => {
    const hasActivePass = getSupporterPass() !== null;
    setHasPass(hasActivePass);

    const fromUrl = new URL(globalThis.location.href).searchParams.get(
      "checkout",
    );
    const explicitCheckoutId = fromUrl && CHECKOUT_ID_RE.test(fromUrl)
      ? fromUrl
      : null;
    if (fromUrl) {
      if (explicitCheckoutId) {
        claimCheckoutRef.current = explicitCheckoutId;
        try {
          setPendingCheckout(explicitCheckoutId);
        } catch {
          // Keep the id in memory so this page can still finish the claim.
        }
      }
      // Checkout ids are bearer references. Remove them before any claim poll
      // or analytics code can observe this page's query string.
      stripCheckoutParam();
    }

    let storedCheckoutId: string | null = null;
    try {
      storedCheckoutId = getPendingCheckout();
    } catch {
      // The in-memory value still lets this page retry if storage is blocked.
    }
    if (storedCheckoutId && !CHECKOUT_ID_RE.test(storedCheckoutId)) {
      try {
        clearPendingCheckout();
      } catch {
        // Ignore unavailable browser storage.
      }
      storedCheckoutId = null;
    }

    const checkoutId = explicitCheckoutId || storedCheckoutId ||
      claimCheckoutRef.current;
    if (!checkoutId) {
      setClaimStatus("idle");
      return;
    }
    claimCheckoutRef.current = checkoutId;

    let cancelled = false;
    let attempts = 0;
    let requestFailed = false;
    setClaimStatus("checking");
    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const data = await apiRequest<
          { status: string; license: string | null }
        >(
          `${getApiUrl()}/get-license`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkout_id: checkoutId }),
          },
          "Could not check the pass",
        );
        if (data.license && setSupporterPass(data.license)) {
          setHasPass(true);
          try {
            clearPendingCheckout();
          } catch {
            // The pass is already stored; a stale pending id is harmless.
          }
          claimCheckoutRef.current = null;
          setClaimStatus("idle");
          pricingModalOpen.value = true;
          addToast(
            isSpanish
              ? "Pasaporte QRBuddy activo 🛂✨ ¡Gracias!"
              : "QRBuddy Passport active 🛂✨ Thank you!",
            5000,
          );
          trackUmami("upgrade_completed", {
            plan: "supporter_pass",
            billing: "year",
          });
          return;
        }
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          // Not a real checkout — stop chasing it.
          try {
            clearPendingCheckout();
          } catch {
            // Ignore unavailable browser storage.
          }
          claimCheckoutRef.current = null;
          setClaimStatus("missing");
          return;
        }
        requestFailed = true;
      }
      if (attempts < 12) {
        setTimeout(poll, 2500);
      } else {
        setClaimStatus(requestFailed ? "error" : "waiting");
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [claimRetry]);

  const handleUpgrade = async () => {
    if (!checkoutAllowedRef.current || checkoutAvailability !== "available") {
      return;
    }
    setCheckoutError("");
    trackUmami("upgrade_clicked", {
      plan: "supporter_pass",
      billing: "year",
    });
    setIsStartingCheckout(true);
    try {
      const data = await apiRequest<
        { checkout_id: string; checkout_url: string }
      >(
        `${getApiUrl()}/create-checkout`,
        { method: "POST" },
        "Could not start checkout",
      );
      setPendingCheckout(data.checkout_id);
      globalThis.location.href = data.checkout_url;
    } catch (error) {
      setIsStartingCheckout(false);
      if (error instanceof ApiError && error.statusCode === 503) {
        checkoutAllowedRef.current = false;
        setCheckoutAvailability("unavailable");
        setCheckoutError(
          isSpanish
            ? "El pago aún no está disponible. No se abrió una pantalla de pago. Escribe a soporte si necesitas ayuda."
            : "Checkout is not available yet. No payment page was opened. Email support if you need help.",
        );
      } else {
        setCheckoutError(
          isSpanish
            ? "No se pudo abrir el pago. Inténtalo de nuevo o escribe a soporte."
            : "Could not open checkout. Try again or contact support.",
        );
      }
    }
  };

  const handlePastePass = () => {
    if (setSupporterPass(pastedPass)) {
      setHasPass(true);
      setPastedPass("");
      setPassCopied(false);
      addToast(
        isSpanish ? "Pasaporte restaurado 🛂✨" : "Passport restored 🛂✨",
        4000,
      );
    } else {
      addToast(
        isSpanish
          ? "Esa clave de Pasaporte no parece válida"
          : "That doesn't look like a valid Passport key",
        3500,
      );
    }
  };

  const handleCopyPass = async () => {
    const pass = getSupporterPass();
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      setPassCopied(true);
      addToast(
        isSpanish
          ? "Clave de Pasaporte copiada. Guárdala en un lugar privado. 📋"
          : "Passport key copied. Save it somewhere private. 📋",
      );
    } catch {
      addToast(
        isSpanish
          ? "No se pudo acceder al portapapeles"
          : "Couldn't reach the clipboard",
        3000,
      );
    }
  };

  const openLibrary = () => {
    closePricingModal();
    setTimeout(
      () =>
        globalThis.dispatchEvent(
          new CustomEvent("qrb-open-library"),
        ),
      60,
    );
  };

  const expiry = hasPass ? supporterPassExpiry() : null;
  const perks = isSpanish
    ? (PRICING_TIERS.pro.featuresEs ?? PRICING_TIERS.pro.features)
    : PRICING_TIERS.pro.features;
  const intlPrice = formatInternationalPrice(PRICING_TIERS.pro);
  const privacyHref = isSpanish ? "/privacy?lang=es" : "/privacy";
  const termsHref = isSpanish ? "/terms?lang=es" : "/terms";

  return (
    <CardModal
      open={isOpen}
      onClose={closePricingModal}
      labelledby="pricing-modal-title"
      badge={hasPass ? "🛂" : "🛂"}
      badgeClass="from-amber-200 via-pink-300 to-qr-pop"
    >
      <div class="text-center space-y-5">
        <div class="space-y-1.5">
          <h2
            id="pricing-modal-title"
            class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
          >
            {hasPass
              ? (isSpanish
                ? "Tu Pasaporte QRBuddy está activo."
                : "Your QRBuddy Passport is active.")
              : (isSpanish ? "El Pasaporte QRBuddy." : "The QRBuddy Passport.")}
          </h2>
          <p class="text-base font-bold text-qr-pop">
            {hasPass
              ? (isSpanish
                ? "Todo el equipo pro desbloqueado en este dispositivo."
                : "Full pro gear unlocked on this device.")
              : (isSpanish
                ? "Poder Pro, cero suscripciones trampa. Un solo pago por 365 días."
                : "Pro power, zero subscription traps. One flat payment for 365 days.")}
          </p>
        </div>

        {/* Sovereign Identity Strip */}
        {passport && (
          <div class="rounded-2xl border-2 border-black bg-white p-3 text-left shadow-chunky space-y-2.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="w-10 h-10 shrink-0 rounded-full border-2 border-black bg-amber-100 flex items-center justify-center text-xl"
                  aria-hidden="true"
                >
                  {passport.avatarEmoji}
                </span>
                <div class="min-w-0">
                  <div class="font-black text-sm text-black truncate">
                    {passport.name}
                  </div>
                  <span
                    class={`inline-flex items-center px-2 py-0.5 rounded-full border border-black text-[10px] font-black tracking-wide uppercase ${
                      hasPass
                        ? "bg-amber-200 text-black"
                        : "bg-qr-cream text-gray-800"
                    }`}
                  >
                    {hasPass
                      ? (isSpanish ? "PASAPORTE PRO ✨" : "PASSPORT PRO ✨")
                      : (isSpanish ? "PASAPORTE GRATIS" : "FREE PASSPORT")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={openLibrary}
                class="w-full sm:w-auto min-h-[44px] px-3 rounded-full border-2 border-black bg-amber-100 hover:bg-amber-200 text-xs font-black text-black transition-all active:scale-95"
              >
                {isSpanish
                  ? "📚 Biblioteca y Sincronización"
                  : "📚 Open Library & 4-Word Sync"}
              </button>
            </div>
          </div>
        )}

        {claimStatus !== "idle" && (
          <div
            class="rounded-2xl border-2 border-black/15 bg-amber-50 p-3 text-sm text-gray-800 space-y-2"
            role="status"
            aria-live="polite"
          >
            <p>
              {claimStatus === "checking"
                ? (isSpanish
                  ? "Comprobando el pago con Square…"
                  : "Checking the payment with Square…")
                : claimStatus === "waiting"
                ? (isSpanish
                  ? "Square aún no confirma el pago. La referencia queda guardada en este dispositivo; vuelve a comprobarla en un momento."
                  : "Square has not confirmed the payment yet. The checkout reference stays on this device; check again in a moment.")
                : claimStatus === "missing"
                ? (isSpanish
                  ? "No encontramos esa referencia de pago. Escribe a soporte con tu recibo de Square."
                  : "We couldn't find that checkout reference. Email support with your Square receipt.")
                : (isSpanish
                  ? "No se pudo comprobar el Pasaporte. La referencia queda guardada en este dispositivo; inténtalo de nuevo o escribe a soporte."
                  : "We couldn't check the Passport. The checkout reference is saved on this device; try again or contact support.")}
            </p>
            {(claimStatus === "waiting" || claimStatus === "error") && (
              <button
                type="button"
                onClick={() => setClaimRetry((attempt) => attempt + 1)}
                class="min-h-[40px] px-3 rounded-full border-2 border-black bg-white font-bold"
              >
                {isSpanish ? "Comprobar de nuevo" : "Check again"}
              </button>
            )}
          </div>
        )}

        <ul class="text-left space-y-2 text-base font-medium text-gray-800">
          {perks.map((perk) => (
            <li key={perk} class="flex items-start gap-3">
              <span
                class="mt-2 w-2 h-2 shrink-0 rounded-full bg-qr-pop"
                aria-hidden="true"
              />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {hasPass
          ? (
            <div class="space-y-2">
              <div class="w-full min-h-[52px] flex items-center justify-center rounded-full border-3 border-black bg-green-100 text-green-900 font-black text-base">
                ✓ {isSpanish ? "Pasaporte activo" : "Passport active"}
                {expiry
                  ? ` until ${
                    expiry.toLocaleDateString(isSpanish ? "es" : "en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  }`
                  : ""}
              </div>
              <div class="flex gap-2">
                <CardSecondaryButton onClick={handleCopyPass}>
                  {passCopied
                    ? (isSpanish ? "Copiado ✓" : "Copied ✓")
                    : (isSpanish ? "Copiar mi clave" : "Copy Passport key")}
                </CardSecondaryButton>
                <CardSecondaryButton onClick={openLibrary}>
                  {isSpanish
                    ? "Pasaporte y Biblioteca 📚"
                    : "Passport & Library 📚"}
                </CardSecondaryButton>
              </div>
              <p class="text-xs text-gray-600 font-medium">
                {isSpanish
                  ? "Tu clave de Pasaporte se guarda en este navegador. Cópiala a un lugar privado o sincroniza tus dispositivos antes de borrar los datos del navegador."
                  : "Your Passport key is stored in this browser. Copy it somewhere private or sync your devices before clearing browser data."}
              </p>
            </div>
          )
          : (
            <div class="space-y-2">
              <CardPrimaryButton
                onClick={handleUpgrade}
                disabled={isStartingCheckout ||
                  checkoutAvailability !== "available"}
              >
                {isStartingCheckout
                  ? (isSpanish ? "Abriendo el pago…" : "Opening checkout…")
                  : checkoutAvailability === "unavailable"
                  ? (isSpanish
                    ? "El pago estará disponible pronto"
                    : "Checkout opens soon")
                  : checkoutAvailability === "error"
                  ? (isSpanish
                    ? "No se pudo comprobar el pago"
                    : "Checkout status unavailable")
                  : (isSpanish
                    ? `Obtener Pasaporte QRBuddy — ${intlPrice} / año ✨`
                    : `Get QRBuddy Passport — ${intlPrice} / year ✨`)}
              </CardPrimaryButton>
              {checkoutAvailability === "unavailable" && (
                <p class="text-sm text-gray-700 font-medium" role="status">
                  {isSpanish
                    ? "El pago aún no está abierto. No se realizará ningún cobro."
                    : "Checkout is not open yet. No payment will be taken."}
                </p>
              )}
              {checkoutAvailability === "error" && (
                <div
                  class="text-sm text-gray-700 font-medium space-y-1"
                  role="status"
                >
                  <p>
                    {isSpanish
                      ? "No pudimos comprobar si el pago está disponible. No intentes pagar todavía."
                      : "We could not check whether checkout is available. Please wait before trying to pay."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCheckoutRetry((attempt) => attempt + 1)}
                    class="underline underline-offset-2 font-bold"
                  >
                    {isSpanish ? "Comprobar de nuevo" : "Check again"}
                  </button>
                </div>
              )}
              <p class="text-xs text-gray-500 font-medium">
                {isSpanish
                  ? "Un solo pago de ~$32 USD (A$49) · Dura 365 días · Sin renovación automática"
                  : "One ~$32 USD (A$49) payment · Valid for 365 days · No automatic renewal"}
              </p>
              {checkoutError && (
                <p class="text-sm text-red-800 font-bold" role="alert">
                  {checkoutError}{" "}
                  <a
                    class="underline underline-offset-2"
                    href="mailto:pablo@qrbuddy.app"
                  >
                    {isSpanish ? "Contactar soporte" : "Contact support"}
                  </a>
                </p>
              )}
            </div>
          )}

        {/* FAQ tucked under one toggle — the card stays a manifesto */}
        <details class="group text-left pt-2 border-t-2 border-black/10">
          <summary class="cursor-pointer list-none min-h-[44px] flex items-center justify-center gap-1 text-sm font-bold text-gray-600 hover:text-black transition-colors">
            {isSpanish
              ? "Preguntas o ¿ya tienes un Pasaporte?"
              : "Questions, or have a Passport already?"}
            <span class="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div class="space-y-3 text-sm pt-1">
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                {isSpanish ? "¿Es una suscripción?" : "Is this a subscription?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "No. Pagas ~$32 USD (A$49) una vez y el Pasaporte QRBuddy dura 365 días. No se renueva automáticamente. Los archivos compartidos vencen en 30 días y siguen aplicando controles de uso del servicio."
                  : "No. You pay ~$32 USD (A$49) once and the QRBuddy Passport lasts 365 days. It does not renew automatically. Hosted file drops expire after 30 days and standard service abuse controls still apply."}
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                {isSpanish ? "¿Cómo puedo pagar?" : "What payment methods?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "Square muestra los métodos disponibles para tu ubicación al abrir el pago."
                  : "Square shows the payment methods available for your location at checkout."}
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                {isSpanish ? "¿Reembolsos?" : "Refunds?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "Puedes pedir un reembolso dentro de los 30 días posteriores a la compra. Escribe a pablo@qrbuddy.app."
                  : "You can request a refund within 30 days of purchase. Email pablo@qrbuddy.app."}
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                {isSpanish
                  ? "¿Cómo guardo o recupero mi Pasaporte?"
                  : "How do I keep or recover my Passport?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "El Pasaporte se guarda en el navegador de este dispositivo. Cópialo o exporta una copia cifrada desde Historial → Sincronizar dispositivos. Sin una copia, no hay recuperación automática por correo o recibo; escribe a soporte con el recibo de Square."
                  : "The Passport is stored in this device's browser. Copy it or export an encrypted backup from History → Sync Devices. Without a backup there is no automatic recovery by email or receipt; contact support with your Square receipt."}
              </p>
            </details>
            {!hasPass && (
              <details>
                <summary class="font-bold cursor-pointer hover:text-qr-pop">
                  {isSpanish
                    ? "¿Ya tienes un Pasaporte?"
                    : "Already have a Passport?"}
                </summary>
                <div class="mt-2 ml-4 flex gap-2">
                  <label class="sr-only" for="restore-passport-input">
                    {isSpanish
                      ? "Pega tu clave de Pasaporte"
                      : "Paste your Passport key"}
                  </label>
                  <input
                    id="restore-passport-input"
                    type="text"
                    value={pastedPass}
                    onInput={(e) =>
                      setPastedPass((e.target as HTMLInputElement).value)}
                    placeholder={isSpanish
                      ? "Pega tu clave de Pasaporte"
                      : "Paste your Passport key"}
                    class="flex-1 min-w-0 px-3 py-2 border-2 border-black rounded-full text-sm font-mono bg-white focus:border-qr-pop focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handlePastePass}
                    disabled={pastedPass.trim() === ""}
                    class="min-h-[44px] px-4 bg-black text-white rounded-full font-bold text-sm border-2 border-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {isSpanish ? "Restaurar" : "Restore"}
                  </button>
                </div>
              </details>
            )}
          </div>
        </details>
        <p class="text-xs text-gray-600 font-medium">
          <a
            href={privacyHref}
            class="underline underline-offset-2 hover:text-qr-pop"
          >
            {isSpanish ? "Aviso de privacidad" : "Privacy notice"}
          </a>
          {" · "}
          <a
            href={termsHref}
            class="underline underline-offset-2 hover:text-qr-pop"
          >
            {isSpanish ? "Condiciones" : "Terms"}
          </a>
        </p>
      </div>
    </CardModal>
  );
}

// Pricing Link Button
interface PricingLinkProps {
  label?: string;
  className?: string;
}

export function PricingLink({
  label = "Passport 🛂",
  className = "",
}: PricingLinkProps) {
  return (
    <button
      type="button"
      onClick={openPricingModal}
      class={`inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border-2 border-black bg-qr-pop text-white text-sm font-bold shadow-chunky transition-all hover:scale-105 hover:bg-qr-popDeep active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

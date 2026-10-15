import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { formatTierPrice, PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "./modal/CardModal.tsx";
import { getApiUrl } from "../utils/api.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
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
  const isSpanish = lang === "es" || (!lang &&
    typeof globalThis.location !== "undefined" &&
    globalThis.location.pathname.startsWith("/es"));
  const isOpen = pricingModalOpen.value;
  const [hasPass, setHasPass] = useState(false);
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
          addToast("Supporter pass active 💜 Thank you!", 5000);
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
      addToast(isSpanish ? "Pase restaurado 💜" : "Pass restored 💜", 4000);
    } else {
      addToast(
        isSpanish
          ? "Ese pase no parece válido"
          : "That doesn't look like a supporter pass",
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
          ? "Pase copiado. Guárdalo en un lugar privado. 📋"
          : "Pass copied. Save it somewhere private. 📋",
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

  const expiry = hasPass ? supporterPassExpiry() : null;
  const perks = isSpanish
    ? [
      "Archivos individuales de hasta 500 MB; los enlaces vencen en 30 días",
      "Sin marca QRBuddy en páginas compatibles de notas y baúles",
      "Límites más amplios para crear y subir; siguen aplicando controles de uso",
    ]
    : PRICING_TIERS.pro.features;
  const price = formatTierPrice(PRICING_TIERS.pro);
  const privacyHref = isSpanish ? "/privacy?lang=es" : "/privacy";
  const termsHref = isSpanish ? "/terms?lang=es" : "/terms";

  return (
    <CardModal
      open={isOpen}
      onClose={closePricingModal}
      labelledby="pricing-modal-title"
      badge={hasPass ? "💜" : "✨"}
      badgeClass="from-pink-300 via-qr-pop to-purple-500"
    >
      <div class="text-center space-y-5">
        <div class="space-y-1.5">
          <h2
            id="pricing-modal-title"
            class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
          >
            {hasPass
              ? (isSpanish
                ? "Ya tienes el Pase Supporter."
                : "You're a Supporter.")
              : (isSpanish
                ? "Pase Supporter de QRBuddy."
                : "QRBuddy Supporter Pass.")}
          </h2>
          <p class="text-base font-bold text-qr-pop">
            {hasPass
              ? (isSpanish
                ? "Gracias por apoyar QRBuddy."
                : "Thank you for supporting QRBuddy.")
              : (isSpanish
                ? "Un pago amplía algunos límites durante un año."
                : "One payment raises selected limits for a year.")}
          </p>
        </div>

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
                  ? "No se pudo comprobar el pase. La referencia queda guardada en este dispositivo; inténtalo de nuevo o escribe a soporte."
                  : "We couldn't check the pass. The checkout reference is saved on this device; try again or contact support.")}
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
                ✓ {isSpanish ? "Pase activo" : "Pass active"}
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
                    : (isSpanish ? "Copiar mi pase" : "Copy my pass")}
                </CardSecondaryButton>
                <CardSecondaryButton
                  onClick={() => {
                    closePricingModal();
                    setTimeout(
                      () =>
                        globalThis.dispatchEvent(
                          new CustomEvent("qrb-open-library"),
                        ),
                      60,
                    );
                  }}
                >
                  {isSpanish
                    ? "Pasaporte y Biblioteca 📚"
                    : "Passport & Library 📚"}
                </CardSecondaryButton>
              </div>
              <p class="text-xs text-gray-600 font-medium">
                {isSpanish
                  ? "El pase se guarda en este navegador. Cópialo a un lugar privado o crea una copia cifrada desde Historial → Sincronizar dispositivos antes de borrar los datos del navegador."
                  : "Your pass is stored in this browser. Copy it somewhere private or make an encrypted backup from History → Sync Devices before clearing browser data."}
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
                  : checkoutAvailability === "checking" ||
                      checkoutAvailability === "idle"
                  ? (isSpanish ? "Comprobando el pago…" : "Checking checkout…")
                  : checkoutAvailability === "unavailable"
                  ? (isSpanish
                    ? "El pago estará disponible pronto"
                    : "Checkout opens soon")
                  : checkoutAvailability === "error"
                  ? (isSpanish
                    ? "No se pudo comprobar el pago"
                    : "Checkout status unavailable")
                  : (isSpanish
                    ? `Obtener Pase Supporter — ${price} / 365 días`
                    : `Get Supporter Pass — ${price} / 365 days`)}
              </CardPrimaryButton>
              <CardSecondaryButton
                onClick={() => {
                  closePricingModal();
                  setTimeout(
                    () =>
                      globalThis.dispatchEvent(
                        new CustomEvent("qrb-open-library"),
                      ),
                    60,
                  );
                }}
              >
                {isSpanish
                  ? "Abrir Pasaporte y Biblioteca 📚"
                  : "Open Passport & Library 📚"}
              </CardSecondaryButton>
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
                  ? "Un pago de A$49. Dura 365 días. Sin renovación automática."
                  : "One A$49 payment. Valid for 365 days. No automatic renewal."}
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
              ? "Preguntas o ¿ya tienes un pase?"
              : "Questions, or have a pass already?"}
            <span class="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div class="space-y-3 text-sm pt-1">
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                {isSpanish ? "¿Es una suscripción?" : "Is this a subscription?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "No. Pagas A$49 una vez y el pase dura 365 días. No se renueva automáticamente."
                  : "No. You pay A$49 once and the pass lasts 365 days. It does not renew automatically."}
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
                  ? "¿Cómo guardo o recupero mi pase?"
                  : "How do I keep or recover my pass?"}
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                {isSpanish
                  ? "El pase se guarda en el navegador de este dispositivo. Cópialo o exporta una copia cifrada desde Historial → Sincronizar dispositivos. Sin una copia, no hay recuperación automática por correo o recibo; escribe a soporte con el recibo de Square."
                  : "The pass is stored in this device's browser. Copy it or export an encrypted backup from History → Sync Devices. Without a backup there is no automatic recovery by email or receipt; contact support with your Square receipt."}
              </p>
            </details>
            {!hasPass && (
              <details>
                <summary class="font-bold cursor-pointer hover:text-qr-pop">
                  {isSpanish ? "¿Ya tienes un pase?" : "Already have a pass?"}
                </summary>
                <div class="mt-2 ml-4 flex gap-2">
                  <input
                    type="text"
                    value={pastedPass}
                    onInput={(e) =>
                      setPastedPass((e.target as HTMLInputElement).value)}
                    placeholder={isSpanish
                      ? "Pega tu pase Supporter"
                      : "Paste your supporter pass"}
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
  label = "Supporter ✨",
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

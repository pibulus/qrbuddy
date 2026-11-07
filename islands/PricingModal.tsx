import { signal } from "@preact/signals";
import type { ComponentType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { formatInternationalPrice, PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import {
  CardBackBar,
  CardBody,
  CardDot,
  CardHeading,
  CardModal,
  CardPrimaryButton,
  CardQuietLink,
} from "../components/modal/CardModal.tsx";
import { getApiUrl } from "../utils/api.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import { getClientLocale } from "../utils/i18n.ts";
import {
  buildPassportPhraseUrl,
  getOrCreatePassport,
  parsePassportFromUrl,
  type QRBuddyPassport,
  renderPassportQrSvg,
} from "../utils/passport.ts";
import {
  isCode,
  parseFourWordPasskey,
} from "../utils/softstack-passport/index.js";
import type { PassportMembershipCardProps } from "../components/MembershipCard.tsx";
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
type ModalView = "pitch" | "redeem" | "sync";

const PITCH_PERKS = {
  en: [
    "100 editable links, repointed anytime.",
    "500 MB drops, ten times the free size.",
    "90-day Field Report with cities and CSV.",
    "White-label pages and four-word sync.",
  ],
  es: [
    "100 links editables, siempre redirigibles.",
    "Archivos de 500 MB, diez veces más.",
    "Reporte de Campo: 90 días, ciudades y CSV.",
    "Páginas sin marca y sync de 4 palabras.",
  ],
};

export function PricingModal({ lang }: { lang?: "en" | "es" } = {}) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const isOpen = pricingModalOpen.value;
  const [view, setView] = useState<ModalView>("pitch");
  const [hasPass, setHasPass] = useState(false);
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [PassportCard, setPassportCard] = useState<
    ComponentType<PassportMembershipCardProps> | null
  >(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [pastedPass, setPastedPass] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimRetry, setClaimRetry] = useState(0);
  const [passCopied, setPassCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [checkoutAvailability, setCheckoutAvailability] = useState<
    CheckoutAvailability
  >("idle");
  const checkoutAllowedRef = useRef(false);
  const claimCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setView("pitch");
        setPastedPass("");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const synced = parsePassportFromUrl();
    if (synced) {
      setPassport(synced);
      setHasPass(getSupporterPass() !== null);
      addToast(
        isSpanish
          ? "Pasaporte sincronizado en este dispositivo ✨"
          : "Passport synced on this device ✨",
        3500,
      );
      if (
        !getSupporterPass() &&
        synced.phrase &&
        parseFourWordPasskey(synced.phrase)
      ) {
        void apiRequest<{ status: string; license: string | null }>(
          `${getApiUrl()}/get-license`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phrase: synced.phrase }),
          },
          "Could not check passkey",
        ).then((data) => {
          if (data?.license && setSupporterPass(data.license)) {
            setHasPass(true);
            setPassport(getOrCreatePassport());
          }
        }).catch(() => {
          // Free passport sync phrase or offline; keep synced local passport.
        });
      }
    } else {
      setPassport(getOrCreatePassport());
      setHasPass(getSupporterPass() !== null);
    }
    const onPassportChanged = () => {
      setPassport(getOrCreatePassport());
      setHasPass(getSupporterPass() !== null);
    };
    globalThis.addEventListener("qrb-passport-changed", onPassportChanged);
    globalThis.addEventListener("qrb-passport-synced", onPassportChanged);
    return () => {
      globalThis.removeEventListener("qrb-passport-changed", onPassportChanged);
      globalThis.removeEventListener("qrb-passport-synced", onPassportChanged);
    };
  }, [isOpen]);

  // The card pulls DiceBear (~171 KB transfer). Load it only when the Passport
  // modal actually opens, not on every home page.
  useEffect(() => {
    if (!isOpen || PassportCard) return;
    let alive = true;
    import("../components/MembershipCard.tsx").then((module) => {
      if (alive) setPassportCard(() => module.PassportMembershipCard);
    }).catch((error) => {
      console.warn("[PricingModal] Passport card failed to load:", error);
    });
    return () => {
      alive = false;
    };
  }, [isOpen, PassportCard]);

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
  }, [isOpen]);

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
          setPassport(getOrCreatePassport());
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
            ? "El pago aún no está disponible. No se abrió una pantalla de pago."
            : "Checkout is not available yet. No payment page was opened.",
        );
      } else {
        setCheckoutError(
          isSpanish
            ? "No se pudo abrir el pago. Inténtalo de nuevo."
            : "Could not open checkout. Try again or contact support.",
        );
      }
    }
  };

  const handlePastePass = async () => {
    const trimmed = pastedPass.trim();
    if (!trimmed) return;

    if (isCode(trimmed)) {
      sounds.error?.();
      addToast(
        isSpanish
          ? "Ingresa tu clave de 4 palabras — el código SS- es público"
          : "Enter the 4-word passkey — the SS- code is a public handle",
        3500,
      );
      return;
    }

    if (setSupporterPass(trimmed)) {
      setHasPass(true);
      setPassport(getOrCreatePassport());
      setPastedPass("");
      setPassCopied(false);
      setView("pitch");
      sounds.success?.();
      addToast(
        isSpanish ? "Pasaporte restaurado 🛂✨" : "Passport restored 🛂✨",
        4000,
      );
      return;
    }

    const parsedPhrase = parseFourWordPasskey(trimmed);
    if (parsedPhrase) {
      try {
        const data = await apiRequest<
          { status: string; license: string | null }
        >(
          `${getApiUrl()}/get-license`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phrase: parsedPhrase.phrase }),
          },
          isSpanish
            ? "Esa clave de 4 palabras no se encontró"
            : "That 4-word passkey did not match",
        );
        if (data.license && setSupporterPass(data.license)) {
          setHasPass(true);
          setPassport(getOrCreatePassport());
          setPastedPass("");
          setPassCopied(false);
          setView("pitch");
          sounds.success?.();
          addToast(
            isSpanish ? "Pasaporte restaurado 🛂✨" : "Passport restored 🛂✨",
            4000,
          );
          return;
        }
      } catch (err) {
        sounds.error?.();
        addToast(
          err instanceof Error
            ? err.message
            : isSpanish
            ? "Esa clave de 4 palabras no parece válida"
            : "That 4-word passkey didn't match",
          3500,
        );
        return;
      }
    }

    sounds.error?.();
    addToast(
      isSpanish
        ? "Esa clave de Pasaporte no parece válida"
        : "That doesn't look like a valid Passport key",
      3500,
    );
  };

  const handleCopySyncUrl = async () => {
    if (!passport) return;
    haptics.light();
    sounds.copy?.();
    const syncUrl = buildPassportPhraseUrl(passport);
    try {
      await navigator.clipboard.writeText(syncUrl);
      addToast(
        isSpanish
          ? "Link de sincronización copiado. Ábrelo en otro dispositivo."
          : "Sync link copied. Open it on any device to pair.",
        3000,
      );
    } catch {
      addToast(
        isSpanish
          ? "No se pudo copiar el link automáticamente"
          : "Could not copy link automatically",
        3000,
      );
    }
  };

  const handleEmailPass = async () => {
    const pass = getSupporterPass();
    if (!pass) return;
    setEmailStatus("sending");
    try {
      await apiRequest(
        `${getApiUrl()}/email-passport`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailValue.trim(),
            pass,
            passport: passport
              ? {
                name: passport.name,
                code: passport.code,
                phrase: passport.phrase,
                link: buildPassportPhraseUrl(passport),
              }
              : undefined,
          }),
        },
        locale === "es"
          ? "No se pudo enviar la clave"
          : "Could not send the key",
      );
      setEmailStatus("sent");
      setEmailOpen(false);
      haptics.success();
      addToast(locale === "es" ? "Clave enviada" : "Key sent");
    } catch {
      setEmailStatus("error");
      haptics.error();
    }
  };

  const handleCopyPass = async () => {
    const pass = getSupporterPass();
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      setPassCopied(true);
      sounds.copy?.();
      addToast(
        isSpanish ? "Clave de Pasaporte copiada 📋" : "Passport key copied 📋",
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
    const g = globalThis as typeof globalThis & {
      __qrbLibraryListener?: boolean;
    };
    if (g.__qrbLibraryListener) {
      setTimeout(
        () =>
          globalThis.dispatchEvent(
            new CustomEvent("qrb-open-library"),
          ),
        60,
      );
    } else if (typeof globalThis.location !== "undefined") {
      globalThis.location.href = isSpanish ? "/es?library=1" : "/?library=1";
    }
  };

  const expiry = hasPass ? supporterPassExpiry() : null;
  const intlPrice = formatInternationalPrice(PRICING_TIERS.pro);
  const shortPasskey = passport
    ? passport.phrase.split(/[-_\s]+/).filter(Boolean).slice(0, 4).join("-")
    : "golden-falcon-drifts-quietly";
  const appIcon = (
    <img
      src="/icon-192.png"
      alt=""
      class="w-14 h-14 rounded-2xl border-2 border-[#1e1714] shadow-[2px_2px_0_#1e1714]"
    />
  );

  return (
    <CardModal
      open={isOpen}
      onClose={closePricingModal}
      labelledby="pricing-modal-title"
      badge={appIcon}
      badgeTile={false}
    >
      {view === "redeem"
        ? (
          <CardBody>
            <CardBackBar
              onBack={() => {
                setView("pitch");
                sounds.toggleOff?.();
              }}
              back={isSpanish ? "Volver" : "Back"}
              eyebrow={isSpanish ? "Restaurar Pasaporte" : "Redeem Passkey"}
            />

            <CardHeading
              id="pricing-modal-title"
              title={isSpanish
                ? (
                  <>
                    Restaurar un <span class="qr-marker">Pasaporte.</span>
                  </>
                )
                : (
                  <>
                    Restore a <span class="qr-marker">Passport.</span>
                  </>
                )}
              tagline={isSpanish
                ? "Un Pasaporte vale en cualquier navegador."
                : "One Passport works in any browser."}
            />

            <div class="qr-pitch-copy">
              <p>
                {isSpanish
                  ? "La clave se guarda en este navegador al confirmarse el pago. Envíala a tu correo o cópiala desde un dispositivo con el Pasaporte activo."
                  : "The key is saved in this browser once payment confirms. Email it to yourself, or copy it from any device where the Passport is active."}
              </p>
            </div>

            <div class="space-y-2.5 text-left">
              <label class="sr-only" for="restore-passport-input">
                {isSpanish ? "Clave de Pasaporte" : "Passport key"}
              </label>
              <input
                id="restore-passport-input"
                type="text"
                value={pastedPass}
                onInput={(e) =>
                  setPastedPass((e.target as HTMLInputElement).value)}
                placeholder={isSpanish
                  ? "Clave de Pasaporte…"
                  : "Passport key…"}
                class="w-full min-h-[48px] px-4 py-2.5 border-2 border-[#1e1714] rounded-2xl text-sm font-mono bg-[#fffef7] focus:border-[#db2777] focus:outline-none"
              />
              <CardPrimaryButton
                onClick={handlePastePass}
                disabled={pastedPass.trim() === ""}
              >
                {isSpanish ? "Activar Pasaporte" : "Activate Passport"}
              </CardPrimaryButton>
            </div>

            <p class="text-xs font-semibold text-[#6f6158]">
              {isSpanish ? "Sin Pasaporte todavía: " : "No Passport yet: "}
              <CardQuietLink
                onClick={() => {
                  setView("pitch");
                  sounds.click?.();
                }}
              >
                {isSpanish ? "ver qué incluye" : "see what it includes"}
              </CardQuietLink>
            </p>
          </CardBody>
        )
        : view === "sync" && passport
        ? (
          <CardBody>
            <CardBackBar
              onBack={() => {
                setView("pitch");
                sounds.toggleOff?.();
              }}
              back={isSpanish ? "Volver" : "Back"}
              eyebrow={isSpanish ? "Vincular dispositivo" : "Pair Device"}
            />

            <CardHeading
              id="pricing-modal-title"
              title={isSpanish
                ? (
                  <>
                    Escanea para <span class="qr-marker">vincular.</span>
                  </>
                )
                : (
                  <>
                    Scan to <span class="qr-marker">pair.</span>
                  </>
                )}
              tagline={isSpanish
                ? "Cámara del otro teléfono aquí, o el link privado."
                : "Point the other phone here, or copy the private link."}
            />

            <div class="mx-auto w-40 h-40 bg-[#fffef7] rounded-2xl p-2.5 border-2 border-[#1e1714] shadow-[2px_2px_0_#1e1714] flex items-center justify-center">
              <div
                role="img"
                aria-label={isSpanish
                  ? "Código QR para vincular tu Pasaporte"
                  : "Passport pairing QR code"}
                class="w-full h-full"
                // deno-lint-ignore react-no-danger
                dangerouslySetInnerHTML={{
                  __html: renderPassportQrSvg(
                    buildPassportPhraseUrl(passport),
                    4,
                  ),
                }}
              />
            </div>

            <div class="rounded-xl border-2 border-[#1e1714]/20 bg-[#fffef7] px-3 py-2">
              <div class="text-[10px] font-black uppercase tracking-wider text-[#6f6158]">
                {isSpanish ? "Clave de 4 palabras" : "4-word passkey"}
              </div>
              <code class="block font-mono text-xs font-bold text-[#1e1714] whitespace-nowrap overflow-hidden text-ellipsis">
                {shortPasskey}
              </code>
            </div>

            <CardPrimaryButton onClick={handleCopySyncUrl}>
              {isSpanish ? "Copiar link de sincronización" : "Copy sync link"}
            </CardPrimaryButton>
          </CardBody>
        )
        : (
          <CardBody>
            <CardHeading
              id="pricing-modal-title"
              title={hasPass
                ? (
                  isSpanish
                    ? (
                      <>
                        Pasaporte <span class="qr-marker">activo.</span>
                      </>
                    )
                    : (
                      <>
                        Passport <span class="qr-marker">active.</span>
                      </>
                    )
                )
                : (
                  isSpanish
                    ? (
                      <>
                        Desbloquea <span class="qr-marker">todo el poder.</span>
                      </>
                    )
                    : (
                      <>
                        Unlock the full <span class="qr-marker">caboodle.</span>
                      </>
                    )
                )}
              tagline={hasPass
                ? (isSpanish
                  ? "Todo el equipo Pro desbloqueado en este dispositivo."
                  : "Full Pro gear unlocked on this device.")
                : (isSpanish
                  ? "El Pasaporte QRBuddy. Todo lo bueno."
                  : "The QRBuddy Passport. All the good stuff.")}
            />

            <div class="qr-pitch-copy">
              <ul class="qr-pitch-list">
                {PITCH_PERKS[locale].map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
            </div>

            {/* One card, three apps: markup + CSS come from the shared module. */}
            {passport && PassportCard && (
              <div class="mx-auto w-full max-w-[342px]">
                <PassportCard passport={passport} appName="QRBuddy" />
              </div>
            )}

            {claimStatus !== "idle" && (
              <div
                class="rounded-2xl border-2 border-[#1e1714]/15 bg-amber-50 p-3 text-xs font-bold text-[#1e1714] space-y-2"
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
                      ? "Square aún no confirma el pago. Vuelve a comprobar en un momento."
                      : "Square has not confirmed the payment yet. Check again in a moment.")
                    : claimStatus === "missing"
                    ? (isSpanish
                      ? "Esa referencia de pago no apareció."
                      : "That checkout reference didn't turn up.")
                    : (isSpanish
                      ? "La comprobación del Pasaporte no pasó. Otro intento en un momento."
                      : "The Passport check didn't go through. Try again in a moment.")}
                </p>
                {(claimStatus === "waiting" || claimStatus === "error") && (
                  <button
                    type="button"
                    onClick={() => setClaimRetry((attempt) => attempt + 1)}
                    class="min-h-[36px] px-3 rounded-full border-2 border-[#1e1714] bg-[#fffef7] font-black text-xs"
                  >
                    {isSpanish ? "Comprobar de nuevo" : "Check again"}
                  </button>
                )}
              </div>
            )}

            {hasPass
              ? (
                <div class="space-y-2">
                  {expiry && (
                    <p class="text-xs font-black uppercase tracking-wider text-[#6f6158]">
                      {isSpanish
                        ? `Activo hasta ${
                          expiry.toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        }`
                        : `Active until ${
                          expiry.toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        }`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailOpen(true);
                      setEmailStatus("idle");
                      haptics.light();
                    }}
                    class="min-h-[48px] w-full rounded-2xl border-2 border-[#1e1714] bg-[#ffbe0b] px-4 text-sm font-black text-[#1e1714] shadow-[3px_3px_0_#1e1714] transition-all hover:-translate-y-0.5 hover:bg-[#ffd04a] hover:shadow-[4px_4px_0_#1e1714] active:translate-y-0.5 active:bg-[#f2ac00] active:shadow-[1px_1px_0_#1e1714]"
                  >
                    {emailStatus === "sent"
                      ? (isSpanish ? "Pasaporte enviado" : "Passport emailed")
                      : (isSpanish ? "Enviar Pasaporte" : "Email Passport")}
                  </button>
                  {emailStatus === "sent"
                    ? (
                      <p
                        class="text-xs font-bold text-[#1e1714]/70 text-center"
                        role="status"
                      >
                        {isSpanish
                          ? "Clave enviada. Revisa la bandeja."
                          : "Key sent. Check the inbox."}
                      </p>
                    )
                    : emailOpen
                    ? (
                      <div class="flex gap-2">
                        <input
                          type="email"
                          value={emailValue}
                          onInput={(e) =>
                            setEmailValue(
                              (e.target as HTMLInputElement).value,
                            )}
                          placeholder={isSpanish
                            ? "tu@correo.com"
                            : "you@example.com"}
                          aria-label={isSpanish
                            ? "Correo para la clave"
                            : "Email for the key"}
                          class="min-w-0 flex-1 min-h-[44px] px-3 border-2 border-[#1e1714] rounded-xl bg-[#fffef7] text-sm font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleEmailPass}
                          disabled={emailStatus === "sending" ||
                            !emailValue.includes("@")}
                          class="shrink-0 min-h-[44px] px-3 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] text-[#1e1714] text-xs font-black disabled:opacity-50"
                        >
                          {emailStatus === "sending"
                            ? "…"
                            : isSpanish
                            ? "Enviar"
                            : "Send"}
                        </button>
                      </div>
                    )
                    : null}
                  <p class="flex items-center justify-center gap-x-1.5 text-xs font-semibold text-[#6f6158]">
                    <CardQuietLink onClick={handleCopyPass}>
                      {passCopied
                        ? (isSpanish ? "Copiada" : "Copied")
                        : (isSpanish ? "Copiar clave" : "Copy key")}
                    </CardQuietLink>
                    <CardDot />
                    <CardQuietLink onClick={openLibrary}>
                      {isSpanish ? "Biblioteca" : "Library"}
                    </CardQuietLink>
                  </p>
                  {emailStatus === "error" && (
                    <p
                      class="text-xs font-bold text-amber-800 text-center"
                      role="alert"
                    >
                      {isSpanish
                        ? "No se pudo enviar. Otro intento."
                        : "Could not send. Try again."}
                    </p>
                  )}
                </div>
              )
              : (
                <div class="space-y-1.5">
                  {checkoutAvailability === "available"
                    ? (
                      <CardPrimaryButton
                        onClick={handleUpgrade}
                        disabled={isStartingCheckout}
                      >
                        {isStartingCheckout
                          ? (isSpanish
                            ? "Abriendo el pago…"
                            : "Opening checkout…")
                          : (isSpanish
                            ? "Conseguir el Pasaporte"
                            : "Grab the Passport")}
                      </CardPrimaryButton>
                    )
                    : (
                      <p class="min-h-[44px] flex items-center justify-center rounded-2xl border-2 border-dashed border-[#1e1714]/25 px-4 text-xs font-bold text-[#6f6158]">
                        {checkoutAvailability === "checking"
                          ? (isSpanish
                            ? "Comprobando el pago…"
                            : "Checking checkout…")
                          : (isSpanish
                            ? "El pago abre pronto"
                            : "Checkout opens soon")}
                      </p>
                    )}

                  <p class="text-xs text-[#6f6158] font-bold">
                    {isSpanish
                      ? `${intlPrice} al año · sin suscripción`
                      : `${intlPrice} a year · no subscription`}
                  </p>

                  {checkoutError && (
                    <p class="text-xs text-amber-900 font-bold" role="alert">
                      {checkoutError}{" "}
                      <a
                        class="underline underline-offset-2"
                        href="mailto:pablo@qrbuddy.app"
                      >
                        {isSpanish ? "Soporte" : "Support"}
                      </a>
                    </p>
                  )}
                </div>
              )}

            {/* Quiet footer links — TalkType's "I have a passkey" row */}
            <p class="text-xs font-semibold text-[#6f6158] flex items-center justify-center gap-x-1.5 gap-y-1 flex-wrap">
              {hasPass
                ? (
                  <CardQuietLink onClick={openLibrary}>
                    {isSpanish ? "Biblioteca" : "Library"}
                  </CardQuietLink>
                )
                : (
                  <CardQuietLink
                    onClick={() => {
                      setView("redeem");
                      sounds.click?.();
                    }}
                  >
                    {isSpanish ? "Tengo clave" : "I have a passkey"}
                  </CardQuietLink>
                )}
            </p>
          </CardBody>
        )}
    </CardModal>
  );
}

// Pricing Link Button
interface PricingLinkProps {
  label?: string;
  className?: string;
  class?: string;
  children?: preact.ComponentChildren;
}

export function PricingLink({
  label = "Passport 🛂",
  className = "",
  class: cls,
  children,
}: PricingLinkProps) {
  return (
    <button
      type="button"
      onClick={openPricingModal}
      class={cls ??
        `inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border-2 border-black bg-qr-pop text-white text-sm font-bold shadow-chunky transition-all hover:scale-105 hover:bg-qr-popDeep active:scale-95 ${className}`}
    >
      {children ?? label}
    </button>
  );
}

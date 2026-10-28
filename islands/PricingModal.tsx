import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { formatInternationalPrice, PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "../components/modal/CardModal.tsx";
import { getApiUrl } from "../utils/api.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import { getClientLocale } from "../utils/i18n.ts";
import {
  buildPassportSyncUrl,
  getOrCreatePassport,
  parsePassportFromUrl,
  type QRBuddyPassport,
  renderPassportQrSvg,
  rerollPassportIdentity,
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
type ModalView = "pitch" | "redeem" | "sync";

const HOLO_THEMES = [
  {
    name: "Opal",
    bg:
      "linear-gradient(135deg, #312e81 0%, #581c87 38%, #be185d 76%, #701a75 100%)",
  },
  {
    name: "Sunset",
    bg: "linear-gradient(135deg, #7c2d12 0%, #be123c 45%, #7e22ce 100%)",
  },
  {
    name: "Cyber",
    bg: "linear-gradient(135deg, #0f172a 0%, #0e7490 50%, #4338ca 100%)",
  },
  {
    name: "Mint",
    bg: "linear-gradient(135deg, #064e3b 0%, #0f766e 48%, #0369a1 100%)",
  },
  {
    name: "Gold",
    bg: "linear-gradient(135deg, #451a03 0%, #92400e 45%, #b45309 100%)",
  },
  {
    name: "Cosmic",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 48%, #db2777 100%)",
  },
];

const PITCH_PERKS = {
  en: [
    "100 editable links — repoint printed QRs anytime",
    "500 MB file drops — 10× larger 30-day transfers",
    "90-day Field Report — scan stats, cities & CSV",
    "Clean white-label share pages & 4-word sync",
  ],
  es: [
    "100 links editables — redirige QRs impresos",
    "Archivos de 500 MB — envíos 10× más grandes",
    "Reporte de Campo — 90 días, ciudades y CSV",
    "Páginas sin marca y sincronización de 4 palabras",
  ],
};

export function PricingModal({ lang }: { lang?: "en" | "es" } = {}) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const isOpen = pricingModalOpen.value;
  const [view, setView] = useState<ModalView>("pitch");
  const [skinIndex, setSkinIndex] = useState(0);
  const [pointerPos, setPointerPos] = useState({ x: 50, y: 50 });
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
          ? "✨ ¡Sincronizado con tu Pasaporte QRBuddy!"
          : "✨ Synced with your QRBuddy Passport!",
        3500,
      );
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

  const handlePastePass = () => {
    if (setSupporterPass(pastedPass)) {
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
    } else {
      sounds.error?.();
      addToast(
        isSpanish
          ? "Esa clave de Pasaporte no parece válida"
          : "That doesn't look like a valid Passport key",
        3500,
      );
    }
  };

  const handleRerollMoniker = (e: Event) => {
    e.stopPropagation();
    haptics.light();
    sounds.gradientShimmer(Math.floor(Math.random() * 6));
    const updated = rerollPassportIdentity(passport);
    setPassport(updated);
    addToast(
      isSpanish
        ? `🎲 ¡Nuevo apodo: ${updated.avatarEmoji} ${updated.name}!`
        : `🎲 Re-rolled to ${updated.avatarEmoji} ${updated.name}!`,
      2500,
    );
  };

  const handleRollSkin = () => {
    const next = (skinIndex + 1) % HOLO_THEMES.length;
    setSkinIndex(next);
    sounds.gradientShimmer(next);
    haptics.light();
  };

  const handleCardPointerMove = (e: PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPointerPos({ x, y });
  };

  const handleCopySyncUrl = async () => {
    if (!passport) return;
    haptics.light();
    sounds.copy?.();
    const syncUrl = buildPassportSyncUrl(passport);
    try {
      await navigator.clipboard.writeText(syncUrl);
      addToast(
        isSpanish
          ? "📋 ¡Link de sincronización copiado!"
          : "📋 Sync link copied! Open on any device to pair",
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
  const privacyHref = isSpanish ? "/privacy?lang=es" : "/privacy";
  const termsHref = isSpanish ? "/terms?lang=es" : "/terms";
  const activeSkin = HOLO_THEMES[skinIndex] ?? HOLO_THEMES[0];
  const shortPasskey = passport
    ? passport.phrase.split(/[-_\s]+/).filter(Boolean).slice(0, 4).join("-")
    : "golden-falcon-drifts-quietly";

  return (
    <CardModal
      open={isOpen}
      onClose={closePricingModal}
      labelledby="pricing-modal-title"
      badge={view === "pitch"
        ? (
          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 via-pink-200 to-purple-300 text-2xl leading-none select-none">
            🛂
          </div>
        )
        : undefined}
    >
      {view === "redeem"
        ? (
          <div class="text-center space-y-4">
            <div class="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setView("pitch");
                  sounds.toggleOff?.();
                }}
                class="min-h-[38px] px-3 rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 transition-transform"
              >
                ← {isSpanish ? "Volver" : "Back"}
              </button>
              <span class="text-xs font-black uppercase tracking-wider text-[#6f6158]">
                {isSpanish ? "Restaurar Pasaporte" : "Redeem Passkey"}
              </span>
            </div>

            <div class="space-y-1">
              <h2
                id="pricing-modal-title"
                class="font-black text-2xl tracking-tight text-[#1e1714]"
              >
                {isSpanish
                  ? "Ingresa tu clave de Pasaporte"
                  : "Enter your Passport key"}
              </h2>
              <p class="text-sm font-semibold text-[#6f6158]">
                {isSpanish
                  ? "Pega la clave de tu compra para desbloquear este navegador."
                  : "Paste your Passport license key to unlock this browser."}
              </p>
            </div>

            <div class="space-y-2.5 text-left">
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
                  ? "Pega tu clave de Pasaporte…"
                  : "Paste your Passport key…"}
                class="w-full min-h-[48px] px-4 py-2.5 border-2 border-[#1e1714] rounded-2xl text-sm font-mono bg-[#fffef7] focus:border-[#ec4899] focus:outline-none"
              />
              <CardPrimaryButton
                onClick={handlePastePass}
                disabled={pastedPass.trim() === ""}
              >
                {isSpanish ? "Activar Pasaporte ✨" : "Activate Passport ✨"}
              </CardPrimaryButton>
            </div>
          </div>
        )
        : view === "sync" && passport
        ? (
          <div class="text-center space-y-4">
            <div class="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setView("pitch");
                  sounds.toggleOff?.();
                }}
                class="min-h-[38px] px-3 rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 transition-transform"
              >
                ← {isSpanish ? "Volver" : "Back"}
              </button>
              <span class="text-xs font-black uppercase tracking-wider text-[#6f6158]">
                {isSpanish ? "Vincular dispositivo" : "Pair Device"}
              </span>
            </div>

            <div class="space-y-1">
              <h2
                id="pricing-modal-title"
                class="font-black text-2xl tracking-tight text-[#1e1714]"
              >
                {isSpanish
                  ? "Escanea para vincular"
                  : "Scan to pair another device"}
              </h2>
              <p class="text-sm font-semibold text-[#6f6158]">
                {isSpanish
                  ? "Abre la cámara de tu teléfono o copia el link privado."
                  : "Point your phone camera here or copy the private sync link."}
              </p>
            </div>

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
                    buildPassportSyncUrl(passport),
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
              {isSpanish
                ? "📋 Copiar link de sincronización"
                : "📋 Copy Sync Link"}
            </CardPrimaryButton>
          </div>
        )
        : (
          <div class="text-center space-y-4">
            <div class="space-y-1 pr-6 sm:pr-0">
              <h2
                id="pricing-modal-title"
                class="font-black text-2xl sm:text-[26px] tracking-tight leading-tight text-[#1e1714]"
              >
                {hasPass
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
                          Desbloquea{" "}
                          <span class="qr-marker">todo el poder.</span>
                        </>
                      )
                      : (
                        <>
                          Unlock the full{" "}
                          <span class="qr-marker">caboodle.</span>
                        </>
                      )
                  )}
              </h2>
              <p class="text-base font-bold text-[#ec4899]">
                {hasPass
                  ? (isSpanish
                    ? "Todo el equipo Pro desbloqueado en este dispositivo."
                    : "Full Pro gear unlocked on this device.")
                  : (isSpanish
                    ? "El Pasaporte QRBuddy. Todo lo bueno."
                    : "The QRBuddy Passport. All the good stuff.")}
              </p>
            </div>

            <ul class="qr-pitch-list">
              {PITCH_PERKS[locale].map((perk) => <li key={perk}>{perk}</li>)}
            </ul>

            {/* Interactive Holographic Passport Preview Card (TalkType gold standard) */}
            {passport && (
              <div class="space-y-1.5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleRollSkin}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRollSkin();
                    }
                  }}
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={() => setPointerPos({ x: 50, y: 50 })}
                  style={{
                    background: activeSkin.bg,
                    "--mx": `${pointerPos.x}%`,
                    "--my": `${pointerPos.y}%`,
                    "--rx": `${((50 - pointerPos.y) / 9).toFixed(2)}deg`,
                    "--ry": `${((pointerPos.x - 50) / 9).toFixed(2)}deg`,
                  } as Record<string, string>}
                  class="qr-holo-card mx-auto w-full max-w-[300px] aspect-[1.68/1] p-4 flex flex-col justify-between text-left text-[#fffef7]"
                  aria-label={isSpanish
                    ? "Tarjeta previa de Pasaporte — toca para cambiar diseño holográfico"
                    : "Passport preview card — tap to roll holographic skin"}
                >
                  <div class="relative z-10 flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <span class="block text-[10px] font-black uppercase tracking-[0.14em] text-white/75">
                        {hasPass || passport.tier === "plus"
                          ? (isSpanish ? "PASAPORTE PRO ✨" : "PASSPORT PRO ✨")
                          : (isSpanish
                            ? "VISTA PREVIA · PASAPORTE"
                            : "PASSPORT PREVIEW")}
                      </span>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="font-black text-lg leading-tight text-white drop-shadow-sm truncate">
                          {passport.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleRerollMoniker}
                          title={isSpanish
                            ? "Tirar otro apodo"
                            : "Roll a new moniker"}
                          aria-label={isSpanish
                            ? "Tirar otro apodo"
                            : "Roll a new moniker"}
                          class="w-6 h-6 rounded-full bg-black/35 hover:bg-black/55 border border-white/30 flex items-center justify-center text-xs transition-transform active:scale-90"
                        >
                          🎲
                        </button>
                      </div>
                    </div>
                    <span
                      class="w-9 h-9 rounded-full bg-white/15 border border-white/35 flex items-center justify-center text-lg shrink-0 shadow-sm"
                      aria-hidden="true"
                    >
                      {passport.avatarEmoji}
                    </span>
                  </div>

                  <div class="relative z-10 space-y-1">
                    <div class="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em] text-white/70">
                      <span>{isSpanish ? "CLAVE" : "PASSKEY"}</span>
                      <span>{activeSkin.name}</span>
                    </div>
                    <div class="rounded-lg bg-black/45 border border-white/20 px-2.5 py-1.5 font-mono text-[11px] font-bold text-white/95 whitespace-nowrap overflow-hidden text-ellipsis">
                      {shortPasskey}
                    </div>
                  </div>
                </div>
                <p class="text-[11px] font-semibold text-[#6f6158]">
                  {isSpanish
                    ? "✦ Toca la tarjeta para cambiar diseño · Inclina para brillar"
                    : "✦ Tap card to roll holo skins · Tilt to shine"}
                </p>
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
                      ? "No encontramos esa referencia de pago."
                      : "We couldn't find that checkout reference.")
                    : (isSpanish
                      ? "No se pudo comprobar el Pasaporte. Inténtalo de nuevo."
                      : "We couldn't check the Passport. Try again in a moment.")}
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
                  <div class="w-full min-h-[48px] flex items-center justify-center rounded-2xl border-2 border-[#1e1714] bg-emerald-100 text-emerald-950 font-black text-sm">
                    ✓ {isSpanish ? "Pasaporte activo" : "Passport active"}
                    {expiry
                      ? ` · ${
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
                        : (isSpanish ? "Copiar clave" : "Copy key")}
                    </CardSecondaryButton>
                    <CardSecondaryButton onClick={openLibrary}>
                      {isSpanish ? "Biblioteca 📚" : "Library 📚"}
                    </CardSecondaryButton>
                  </div>
                </div>
              )
              : (
                <div class="space-y-1.5">
                  <CardPrimaryButton
                    onClick={handleUpgrade}
                    disabled={isStartingCheckout ||
                      checkoutAvailability === "unavailable" ||
                      checkoutAvailability === "error"}
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
                        ? "✦ + ¡Obtener el Pasaporte QRBuddy!"
                        : "✦ + Grab the QRBuddy Passport!")}
                  </CardPrimaryButton>

                  {checkoutAvailability === "error" && (
                    <button
                      type="button"
                      onClick={() => setCheckoutRetry((attempt) => attempt + 1)}
                      class="text-xs underline underline-offset-2 font-bold text-[#6f6158] hover:text-[#1e1714]"
                    >
                      {isSpanish
                        ? "Reintentar conexión de pago"
                        : "Retry checkout status"}
                    </button>
                  )}

                  <p class="text-xs text-[#6f6158] font-bold">
                    {isSpanish
                      ? `${intlPrice} por todo un año · sin suscripción`
                      : `${intlPrice} for a whole year · no subscription`}
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

            {/* Quiet footer links — matches TalkType's "I have a passkey" row */}
            <div class="pt-1 flex items-center justify-center gap-x-1.5 gap-y-1 flex-wrap text-[11px] font-bold text-[#6f6158]">
              {!hasPass && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setView("redeem");
                      sounds.click?.();
                    }}
                    class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
                  >
                    {isSpanish ? "Tengo clave" : "I have a passkey"}
                  </button>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setView("sync");
                  sounds.click?.();
                }}
                class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
              >
                {isSpanish ? "Vincular" : "Pair device"}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={openLibrary}
                class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
              >
                {isSpanish ? "Biblioteca" : "Library"}
              </button>
              <span aria-hidden="true">·</span>
              <a
                href={privacyHref}
                class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
              >
                {isSpanish ? "Privacidad" : "Privacy"}
              </a>
              <span aria-hidden="true">·</span>
              <a
                href={termsHref}
                class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
              >
                {isSpanish ? "Términos" : "Terms"}
              </a>
            </div>
          </div>
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

import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface ShareActionsProps {
  shareUrl: string;
  sharedTarget?: string;
  shareText?: string;
  onShared?: () => void;
  compact?: boolean;
  lang?: Locale;
}

export default function ShareActions(
  {
    shareUrl,
    sharedTarget,
    shareText,
    onShared,
    compact = false,
    lang,
  }: ShareActionsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      haptics.copy();
      addToast(isSpanish ? "Enlace copiado" : "Share link copied", 2500);
      onShared?.();
    } catch (error) {
      console.error("Copy share link failed:", error);
      addToast(
        isSpanish ? "No se pudo copiar el enlace" : "Couldn't copy link",
        3000,
      );
      haptics.error();
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: isSpanish ? "Compartido con QRBuddy" : "QRBuddy Share",
        text: shareText ??
          (sharedTarget
            ? (isSpanish
              ? `Escanea este QR para ${sharedTarget}`
              : `Scan this QR for ${sharedTarget}`)
            : (isSpanish
              ? "Mira este código QRBuddy"
              : "Check out this QRBuddy code")),
        url: shareUrl,
      });
      haptics.medium();
      onShared?.();
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
      console.error("Native share failed:", error);
      handleCopyLink();
    }
  };

  const canWebShare = typeof navigator !== "undefined" && !!navigator.share;

  if (compact) {
    return (
      <div class="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={isSpanish ? "Copiar enlace" : "Copy share link"}
          class="flex-1 min-h-[44px] px-3.5 py-2 bg-[#fffef7] text-[#1e1714] border-2 border-[#1e1714] rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-chunky hover:bg-amber-100 active:translate-y-px transition"
        >
          {isSpanish ? "Copiar enlace" : "Copy link"}
        </button>

        {canWebShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label={isSpanish ? "Compartir enlace del QR" : "Share QR link"}
            class="min-h-[44px] px-4 py-2 bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-2 border-[#1e1714] rounded-2xl text-xs sm:text-sm font-black shadow-chunky hover:opacity-90 active:translate-y-px transition shrink-0"
          >
            {isSpanish ? "Compartir" : "Share"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div class="space-y-3">
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={isSpanish ? "Copiar enlace" : "Copy share link"}
        class="w-full min-h-[52px] px-4 py-3 bg-[#fffef7] text-[#1e1714] border-3 border-[#1e1714] rounded-xl font-black flex items-center justify-center gap-2 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 transition"
      >
        {isSpanish ? "Copiar enlace" : "Copy share link"}
      </button>

      {canWebShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          aria-label={canWebShare
            ? (isSpanish ? "Compartir enlace del QR" : "Share QR link")
            : (isSpanish ? "Copiar enlace" : "Copy share link")}
          class="qr-pitch-cta"
        >
          {canWebShare
            ? (isSpanish ? "Compartir" : "Share")
            : (isSpanish ? "Copiar enlace" : "Copy share link")}
        </button>
      )}
    </div>
  );
}

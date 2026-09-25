import { Signal, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import QRCodeStyling from "qr-code-styling";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "./GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { addToast } from "./ToastManager.tsx";
import { checkBlobScannability } from "../utils/qr-decode.ts";
import { useModalShell } from "./modal/useModalShell.ts";

const DICE_PROBE_DATA = "https://qrbuddy.app";
const DICE_MAX_ATTEMPTS = 4;

// Two stops only, with luma-aware lightness: yellows/greens/cyans read far
// lighter than blues/purples at the same HSL lightness, and a washed finder
// pattern in any corner kills scannability — this is a starting bias, not a
// guarantee, which is why every roll gets decode-checked before it commits.
function rollGradient(): QRStyle {
  const baseHue = Math.floor(Math.random() * 360);
  const spread = 80 + Math.floor(Math.random() * 100); // 80–180° apart
  const hues = [baseHue, (baseHue + spread) % 360];
  const lightnessFor = (h: number) =>
    h >= 40 && h <= 200
      ? 26 + Math.floor(Math.random() * 8)
      : 34 + Math.floor(Math.random() * 12);
  const stops = hues.map((h, i) => ({
    offset: i / (hues.length - 1),
    color: `hsl(${h}, ${65 + Math.floor(Math.random() * 20)}%, ${
      lightnessFor(h)
    }%)`,
  }));
  const gradient = {
    type: "linear" as const,
    rotation: Math.random() * Math.PI,
    colorStops: stops,
  };
  return {
    dots: { type: "gradient", gradient },
    background: { color: `hsl(${baseHue}, 60%, 96%)` },
    cornersSquare: { gradient },
    cornersDot: { gradient },
  };
}

/** Off-DOM render of a candidate style, for the decode-before-commit probe. */
async function renderProbeBlob(candidate: QRStyle): Promise<Blob | null> {
  const qr = new QRCodeStyling({
    width: 250,
    height: 250,
    data: DICE_PROBE_DATA,
    margin: 8,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
    dotsOptions: {
      type: "rounded",
      gradient: "gradient" in candidate.dots
        ? candidate.dots.gradient
        : undefined,
    },
    backgroundOptions: {
      color: "color" in candidate.background
        ? candidate.background.color
        : undefined,
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      gradient: candidate.cornersSquare && "gradient" in candidate.cornersSquare
        ? candidate.cornersSquare.gradient
        : undefined,
    },
    cornersDotOptions: {
      type: "dot",
      gradient: candidate.cornersDot && "gradient" in candidate.cornersDot
        ? candidate.cornersDot.gradient
        : undefined,
    },
  });
  try {
    return await qr.getRawData("png") as Blob | null;
  } catch {
    return null;
  }
}

interface StyleSelectorProps {
  style: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  isHidden?: Signal<boolean>;
}

export const STYLE_DISPLAY = {
  // Swatch colors mirror the actual dot gradients in utils/qr-styles.ts —
  // keep them in sync so the gallery doesn't lie about the output. Order is
  // warm → cool → dark; eight presets, one family (pastel-punk, 135° sweep).
  sunset: { name: "Sunset", colors: ["#FF8C42", "#FF69B4", "#9370DB"] },
  candy: { name: "Candy", colors: ["#FF69B4", "#FF8C00", "#2EB5AC"] },
  blush: { name: "Blush", colors: ["#D48166", "#BA5566", "#8E44AD"] },
  matcha: { name: "Matcha", colors: ["#65A30D", "#047857"] },
  pool: { name: "Pool", colors: ["#0EA5E9", "#0D9488"] },
  vapor: { name: "Vapor", colors: ["#8B5CF6", "#DB2777"] },
  grape: { name: "Grape", colors: ["#4F46E5", "#9333EA"] },
  noir: { name: "Licorice", colors: ["#1E1B4B", "#0F172A"] },
};

// Styles that still render but left the public gallery: brutalist (the 666
// easter egg), terminal (1337 easter egg + the locker landing pages' default).
// The trigger pill needs their names too.
const HIDDEN_STYLE_DISPLAY: Record<string, { name: string; colors: string[] }> =
  {
    brutalist: { name: "Brutal", colors: ["#000000", "#FFFF00"] },
    terminal: { name: "Matrix", colors: ["#00FF41", "#0A0A0A"] },
  };

export default function StyleSelector(
  { style, customStyle, isHidden }: StyleSelectorProps,
) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const isCreatorOpen = useSignal(false);

  // Escape/scroll-lock/focus/backdrop machinery — the shared modal shell.
  const shell = useModalShell({
    open: isGalleryOpen,
    onClose: () => setIsGalleryOpen(false),
  });

  // The Create modal's Design tab can summon the gradient builder from here
  // so brand-minded users never dead-end on a "colors live elsewhere" note.
  useEffect(() => {
    const openCreator = () => {
      isCreatorOpen.value = true;
    };
    globalThis.addEventListener("open-gradient-creator", openCreator);
    return () =>
      globalThis.removeEventListener("open-gradient-creator", openCreator);
  }, []);

  if (isHidden?.value) return null;

  const handleStyleSelect = (s: string) => {
    style.value = s;
    haptics.light();
    sounds.click();
    shell.requestClose();
    addToast(`🎨 ${STYLE_DISPLAY[s as keyof typeof STYLE_DISPLAY].name}`);
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

  // 🎲 Roll a random vivid gradient. Hues are picked a third of the wheel
  // apart so the combo always has contrast-with-harmony; light backgrounds
  // keep the QR scannable.
  const DICE_QUIPS = [
    "Ooh, spicy 🌶️",
    "The dice have spoken 🎲",
    "Certified fresh combo ✨",
    "This one's got soul 🎷",
    "Chaos, but make it pretty 💅",
    "Nat 20 energy 🐉",
  ];

  // Roll, decode-check, reroll on a fail — up to DICE_MAX_ATTEMPTS times —
  // so "the dice must never roll an unscannable QR" is an enforced gate,
  // not just a hand-tuned hope. Last attempt wins even if every check comes
  // back null/false, so this can never hang or soft-lock the button.
  const handleDiceRoll = async () => {
    if (!customStyle || isRolling) return;
    setIsRolling(true);
    try {
      let candidate = rollGradient();
      for (let attempt = 0; attempt < DICE_MAX_ATTEMPTS; attempt++) {
        candidate = attempt === 0 ? candidate : rollGradient();
        const blob = await renderProbeBlob(candidate);
        if (!blob) break; // render/probe unavailable — accept, don't hang
        const verdict = await checkBlobScannability(blob, DICE_PROBE_DATA);
        if (verdict !== false) break; // true or null (unknown) both pass
      }
      customStyle.value = candidate;
      style.value = "custom";
      haptics.medium();
      sounds.click();
      addToast(DICE_QUIPS[Math.floor(Math.random() * DICE_QUIPS.length)]);
    } finally {
      setIsRolling(false);
    }
  };

  const currentStyleInfo = style.value === "custom"
    ? { name: "Custom", colors: ["#9370DB", "#FF69B4"] }
    : STYLE_DISPLAY[style.value as keyof typeof STYLE_DISPLAY] ??
      HIDDEN_STYLE_DISPLAY[style.value] ??
      HIDDEN_STYLE_DISPLAY.brutalist;

  const getGradientPreview = (colors: string[]) => {
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  };

  return (
    <>
      <div class="relative">
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsGalleryOpen(true);
            haptics.light();
            sounds.click();
          }}
          aria-label={`Select QR style, current: ${currentStyleInfo.name}`}
          aria-haspopup="dialog"
          aria-expanded={isGalleryOpen}
          class="inline-flex items-center gap-1.5 px-3 min-h-[36px] bg-white border-2 border-black rounded-full text-xs font-black text-black shadow-chunky hover:scale-105 active:scale-95 transition-all"
        >
          <div
            class="w-4 h-4 rounded-full border-2 border-black"
            style={{ background: getGradientPreview(currentStyleInfo.colors) }}
          />
          <span class="hidden sm:inline">
            {currentStyleInfo.name}
          </span>
          {
            /* The ▾ stays on mobile — a bare swatch reads as decoration,
            not a menu. */
          }
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      {/* Style Gallery — bottom sheet on mobile, centered card on desktop */}
      {shell.mounted && (
        <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            ref={shell.backdropRef}
            class="absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm animate-fade-in"
            onClick={shell.onBackdropClick}
          />
          <div
            ref={shell.dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-gallery-title"
            tabindex={-1}
            class="relative z-10 w-full max-w-lg bg-white sm:border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-6 animate-slide-up sm:animate-pop-in max-h-[92dvh] overflow-y-auto scrollbar-none"
          >
            {/* Header */}
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-pink-600 font-bold">
                  Style Gallery
                </p>
                <p
                  id="style-gallery-title"
                  class="text-2xl font-black text-gray-900 leading-tight"
                >
                  Pick your Vibe
                </p>
              </div>
              <button
                type="button"
                onClick={shell.requestClose}
                aria-label="Close style gallery"
                class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Grid */}
            <div class="grid grid-cols-2 gap-3">
              {Object.entries(STYLE_DISPLAY).map(([key, info]) => {
                const active = style.value === key;
                return (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={active}
                    onClick={() => handleStyleSelect(key)}
                    class={`group rounded-2xl border-2 p-1.5 text-left transition-all duration-200 ${
                      active
                        ? "border-black bg-amber-200 shadow-chunky"
                        : "border-black/15 bg-white hover:border-black/60 hover:scale-[1.02]"
                    }`}
                  >
                    {/* Enamel badge: gradient inside a black ring with a white bezel */}
                    <div
                      class="h-16 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 transition-transform group-active:scale-95"
                      style={{ background: getGradientPreview(info.colors) }}
                    />
                    <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                      {info.name}
                    </span>
                  </button>
                );
              })}

              {
                /* Dice and Custom fill the last row so the grid stays an even
                2×5 — no full-width stragglers. */
              }
              <button
                type="button"
                onClick={handleDiceRoll}
                disabled={isRolling}
                class="group rounded-2xl border-2 border-black/15 bg-white p-1.5 text-left transition-all duration-200 hover:border-black/60 hover:scale-[1.02] disabled:opacity-60"
              >
                <div class="h-16 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200 flex items-center justify-center text-2xl">
                  <span class="group-hover:rotate-[360deg] transition-transform duration-500">
                    🎲
                  </span>
                </div>
                <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                  Surprise me
                </span>
              </button>

              <button
                type="button"
                aria-pressed={style.value === "custom"}
                onClick={() => {
                  isCreatorOpen.value = true;
                  haptics.medium();
                  sounds.click();
                  shell.requestClose();
                }}
                class={`group rounded-2xl border-2 p-1.5 text-left transition-all duration-200 ${
                  style.value === "custom"
                    ? "border-black bg-amber-200 shadow-chunky"
                    : "border-black/15 bg-white hover:border-black/60 hover:scale-[1.02]"
                }`}
              >
                <div class="h-16 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 bg-white flex items-center justify-center text-2xl">
                  🎨
                </div>
                <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                  Build your own
                </span>
              </button>
            </div>

            <div class="flex justify-center">
              <button
                type="button"
                onClick={shell.requestClose}
                class="px-8 py-3 rounded-xl bg-black text-white font-bold hover:scale-105 transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Gradient Creator Modal */}
      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}

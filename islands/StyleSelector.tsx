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
import { getClientLocale, type Locale } from "../utils/i18n.ts";

const DICE_PROBE_DATA = "https://qrbuddy.app";
const DICE_MAX_ATTEMPTS = 4;

// Two stops only, with luma-aware lightness and muddy-zone avoidance:
// hues 45°–95° (and adjacent olive/khaki angles) turn into brown/swamp sludge
// at QR-safe darkness. Picking both stops along the continuous clean jewel arc
// (135° emerald → teal → cobalt → violet → magenta → crimson → 35° coral)
// with a 40°–110° harmony step guarantees vibrant stops and a clean midpoint.
const CLEAN_ARC_MIN = 135;
const CLEAN_ARC_MAX = 395; // 395 % 360 === 35°

export function rollGradient(): QRStyle {
  const arcSpan = CLEAN_ARC_MAX - CLEAN_ARC_MIN;
  const u1 = CLEAN_ARC_MIN + Math.floor(Math.random() * (arcSpan + 1));
  const spread = 40 + Math.floor(Math.random() * 71); // 40°–110° harmony
  const canGoUp = u1 + spread <= CLEAN_ARC_MAX;
  const canGoDown = u1 - spread >= CLEAN_ARC_MIN;
  const goUp = canGoUp && canGoDown ? Math.random() < 0.5 : canGoUp;
  const u2 = goUp ? u1 + spread : u1 - spread;

  const hues = [u1 % 360, u2 % 360];
  const lightnessFor = (h: number) =>
    h >= 135 && h <= 200
      ? 26 + Math.floor(Math.random() * 7) // 26%–32% for emerald/teal/cyan
      : 32 + Math.floor(Math.random() * 9); // 32%–40% for coral/magenta/violet/cobalt
  const stops = hues.map((h, i) => ({
    offset: i / (hues.length - 1),
    color: `hsl(${h}, ${75 + Math.floor(Math.random() * 16)}%, ${
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
    background: { color: `hsl(${hues[0]}, 65%, 96%)` },
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
  lang?: Locale;
}

export const STYLE_DISPLAY = {
  // Swatch colors mirror the actual dot gradients (or dot+bg pair for solid
  // high-contrast styles) in utils/qr-styles.ts — keep them in sync so the
  // gallery never lies about the output.
  sunset: {
    name: "Sunset",
    nameEs: "Atardecer",
    colors: ["#F97316", "#FF69B4", "#9370DB"],
  },
  pool: {
    name: "Ocean",
    nameEs: "Océano",
    colors: ["#0EA5E9", "#0891B2", "#0D9488"],
  },
  matcha: {
    name: "Forest",
    nameEs: "Bosque",
    colors: ["#15803D", "#059669", "#0F766E"],
  },
  blush: {
    name: "Crimson",
    nameEs: "Carmesí",
    colors: ["#E11D48", "#DB2777", "#9D174D"],
  },
  vapor: {
    name: "Vaporwave",
    nameEs: "Vaporwave",
    colors: ["#6D28D9", "#9333EA", "#DB2777"],
  },
  grape: {
    name: "Cosmic",
    nameEs: "Cósmico",
    colors: ["#4F46E5", "#7C3AED", "#9333EA"],
  },
  candy: {
    name: "Candy",
    nameEs: "Dulce",
    colors: ["#FF2E93", "#7C3AED", "#0891B2"],
  },
  terminal: {
    name: "Matrix",
    nameEs: "Matrix",
    colors: ["#00FF41", "#0A0A0A"],
  },
  brutalist: {
    name: "Brutal",
    nameEs: "Brutal",
    colors: ["#000000", "#FFFF00"],
  },
  noir: {
    name: "Classic",
    nameEs: "Clásico",
    colors: ["#1E1B4B", "#0F172A"],
  },
};

const TOTAL_PRESETS = Object.keys(STYLE_DISPLAY).length;

export default function StyleSelector(
  { style, customStyle, isHidden, lang }: StyleSelectorProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
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

  const handleStyleSelect = (s: string, index = 0) => {
    style.value = s;
    sounds.playAt("bloop", index, { total: TOTAL_PRESETS, force: true });
    haptics.light();
    shell.requestClose();
    const info = STYLE_DISPLAY[s as keyof typeof STYLE_DISPLAY];
    addToast(`🎨 ${isSpanish ? (info.nameEs ?? info.name) : info.name}`);
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
  const DICE_QUIPS = isSpanish
    ? [
      "Uff, qué buena mezcla 🌶️",
      "Los dados hablaron 🎲",
      "Combinación bien fresca ✨",
      "Este tiene mucha onda 🎷",
      "Caos bonito 💅",
      "Energía de 20 natural 🐉",
    ]
    : [
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
      sounds.sploosh();
      addToast(DICE_QUIPS[Math.floor(Math.random() * DICE_QUIPS.length)]);
    } finally {
      setIsRolling(false);
    }
  };

  const currentStyleInfo = style.value === "custom"
    ? {
      name: "Custom",
      nameEs: "Propio",
      colors: ["#9370DB", "#FF69B4"],
    }
    : STYLE_DISPLAY[style.value as keyof typeof STYLE_DISPLAY] ??
      STYLE_DISPLAY.sunset;

  const currentStyleName = isSpanish
    ? (currentStyleInfo.nameEs ?? currentStyleInfo.name)
    : currentStyleInfo.name;

  const getGradientPreview = (colors: string[], key?: string) => {
    if ((key === "terminal" || key === "brutalist") && colors.length === 2) {
      return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 52%, ${
        colors[1]
      } 52%, ${colors[1]} 100%)`;
    }
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
          aria-label={isSpanish
            ? `Elige una Vibra, estilo actual: ${currentStyleName}`
            : `Select QR style, current: ${currentStyleName}`}
          aria-haspopup="dialog"
          aria-expanded={isGalleryOpen}
          class="inline-flex items-center gap-1.5 px-3 min-h-[36px] bg-white border-2 border-black rounded-full text-xs font-black text-black shadow-chunky hover:scale-105 active:scale-95 transition-all"
        >
          <div
            class="w-4 h-4 rounded-full border-2 border-black"
            style={{
              background: getGradientPreview(
                currentStyleInfo.colors,
                style.value,
              ),
            }}
          />
          <span class="hidden sm:inline">
            {currentStyleName}
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
            class={`absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm charm-modal-backdrop animate-fade-in${
              shell.closing
                ? " charm-modal-backdrop--closing charm-modal--closing"
                : ""
            }`}
            onClick={shell.onBackdropClick}
          />
          <div
            ref={shell.dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-gallery-title"
            tabindex={-1}
            class={`relative z-10 w-full max-w-lg bg-qr-cream border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-chunky-hover p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-5 charm-modal-sheet animate-slide-up sm:animate-pop-in max-h-[92dvh] overflow-y-auto scrollbar-none${
              shell.closing ? " charm-modal--closing" : ""
            }`}
          >
            {/* Header */}
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="style-gallery-title"
                  class="text-2xl font-black text-black tracking-tight leading-tight"
                >
                  {isSpanish ? "Elige una Vibra." : "Choose a Vibe."}
                </h2>
                <p class="text-sm font-bold text-qr-pop">
                  {isSpanish
                    ? "Degradados para imprenta, Matrix, Brutal y paletas propias."
                    : "Print-verified gradients, Matrix, Brutal & custom palettes."}
                </p>
              </div>
              <button
                type="button"
                onClick={shell.requestClose}
                aria-label={isSpanish
                  ? "Cerrar galería de estilos"
                  : "Close style gallery"}
                class="group shrink-0 w-11 h-11 -mr-1 -mt-1 rounded-full flex items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  class="w-9 h-9 rounded-full bg-white border-2 border-black text-black font-black text-base leading-none flex items-center justify-center shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
                >
                  ✕
                </span>
              </button>
            </div>

            {/* Grid */}
            <div class="grid grid-cols-2 gap-2.5">
              {Object.entries(STYLE_DISPLAY).map(([key, info], index) => {
                const active = style.value === key;
                const displayName = isSpanish
                  ? (info.nameEs ?? info.name)
                  : info.name;
                return (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={active}
                    onMouseEnter={() =>
                      sounds.playAt("bloop", index, {
                        total: TOTAL_PRESETS,
                        gain: 0.012,
                      })}
                    onClick={() => handleStyleSelect(key, index)}
                    class={`group rounded-2xl border-2 p-1.5 text-left transition-all duration-200 ${
                      active
                        ? "border-black bg-amber-200 shadow-chunky"
                        : "border-black/15 bg-white hover:border-black/60 hover:scale-[1.02]"
                    }`}
                  >
                    {/* Enamel badge: gradient inside a black ring with a white bezel */}
                    <div
                      class="h-12 sm:h-13 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 transition-transform group-active:scale-95"
                      style={{
                        background: getGradientPreview(info.colors, key),
                      }}
                    />
                    <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                      {displayName}
                    </span>
                  </button>
                );
              })}

              {
                /* Dice and Custom fill the last row so the grid stays an even
                2×6 — no full-width stragglers. */
              }
              <button
                type="button"
                onClick={handleDiceRoll}
                disabled={isRolling}
                class="group rounded-2xl border-2 border-black/15 bg-white p-1.5 text-left transition-all duration-200 hover:border-black/60 hover:scale-[1.02] disabled:opacity-60"
              >
                <div class="h-12 sm:h-13 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200 flex items-center justify-center text-2xl">
                  <span class="group-hover:rotate-[360deg] transition-transform duration-500">
                    🎲
                  </span>
                </div>
                <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                  {isSpanish ? "Al azar" : "Surprise me"}
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
                <div class="h-12 sm:h-13 rounded-xl border-2 border-black ring-2 ring-inset ring-white/70 bg-white flex items-center justify-center text-2xl">
                  {isSpanish ? "🌈" : "🎨"}
                </div>
                <span class="block px-1 pt-1.5 font-black text-sm text-black leading-none">
                  {isSpanish ? "Degradado propio" : "Custom gradient"}
                </span>
              </button>
            </div>

            <div class="pt-1">
              <button
                type="button"
                onClick={shell.requestClose}
                class="w-full min-h-[52px] rounded-full border-3 border-black bg-qr-pop text-white text-lg font-black shadow-chunky hover:scale-[1.02] hover:bg-qr-popDeep hover:shadow-chunky-hover active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {isSpanish ? "Listo ✨" : "Done ✨"}
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

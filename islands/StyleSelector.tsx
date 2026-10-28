import { Signal, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import QRCodeStyling from "qr-code-styling";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "../components/GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { addToast } from "./ToastManager.tsx";
import { checkBlobScannability } from "../utils/qr-decode.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

const DICE_PROBE_DATA = "https://qrbuddy.app";
const DICE_MAX_ATTEMPTS = 4;

/**
 * 24 pre-vetted, print-verified harmonic pairs (dark rich anchor -> vibrant accent).
 * Every stop avoids the muddy 45°–95° olive zone, keeps saturation in 82%–90%,
 * and locks relative luminance <= 0.28 for guaranteed camera contrast.
 */
export const CURATED_HARMONIC_PAIRS: ReadonlyArray<{
  stops: readonly [string, string];
  bg: string;
}> = [
  {
    stops: ["hsl(268, 86%, 22%)", "hsl(332, 88%, 38%)"],
    bg: "hsl(268, 65%, 97%)",
  },
  {
    stops: ["hsl(280, 88%, 24%)", "hsl(345, 86%, 38%)"],
    bg: "hsl(280, 65%, 97%)",
  },
  {
    stops: ["hsl(225, 88%, 26%)", "hsl(190, 88%, 30%)"],
    bg: "hsl(225, 65%, 97%)",
  },
  {
    stops: ["hsl(232, 86%, 24%)", "hsl(272, 85%, 36%)"],
    bg: "hsl(232, 65%, 97%)",
  },
  {
    stops: ["hsl(162, 86%, 20%)", "hsl(142, 82%, 28%)"],
    bg: "hsl(162, 65%, 97%)",
  },
  {
    stops: ["hsl(178, 86%, 22%)", "hsl(214, 88%, 34%)"],
    bg: "hsl(178, 65%, 97%)",
  },
  {
    stops: ["hsl(348, 88%, 28%)", "hsl(18, 90%, 38%)"],
    bg: "hsl(348, 65%, 97%)",
  },
  {
    stops: ["hsl(292, 85%, 24%)", "hsl(326, 88%, 38%)"],
    bg: "hsl(292, 65%, 97%)",
  },
  {
    stops: ["hsl(240, 86%, 28%)", "hsl(284, 84%, 36%)"],
    bg: "hsl(240, 65%, 97%)",
  },
  {
    stops: ["hsl(355, 85%, 26%)", "hsl(24, 88%, 36%)"],
    bg: "hsl(355, 65%, 97%)",
  },
  {
    stops: ["hsl(206, 88%, 24%)", "hsl(174, 85%, 28%)"],
    bg: "hsl(206, 65%, 97%)",
  },
  {
    stops: ["hsl(305, 84%, 24%)", "hsl(338, 88%, 38%)"],
    bg: "hsl(305, 65%, 97%)",
  },
  {
    stops: ["hsl(168, 85%, 22%)", "hsl(220, 86%, 34%)"],
    bg: "hsl(168, 65%, 97%)",
  },
  {
    stops: ["hsl(274, 86%, 24%)", "hsl(28, 90%, 38%)"],
    bg: "hsl(274, 65%, 97%)",
  },
  {
    stops: ["hsl(228, 88%, 26%)", "hsl(320, 86%, 36%)"],
    bg: "hsl(228, 65%, 97%)",
  },
  {
    stops: ["hsl(148, 84%, 22%)", "hsl(186, 86%, 28%)"],
    bg: "hsl(148, 65%, 97%)",
  },
  {
    stops: ["hsl(342, 86%, 26%)", "hsl(288, 84%, 36%)"],
    bg: "hsl(342, 65%, 97%)",
  },
  {
    stops: ["hsl(246, 86%, 24%)", "hsl(198, 88%, 32%)"],
    bg: "hsl(246, 65%, 97%)",
  },
  {
    stops: ["hsl(154, 85%, 22%)", "hsl(236, 84%, 34%)"],
    bg: "hsl(154, 65%, 97%)",
  },
  {
    stops: ["hsl(14, 90%, 36%)", "hsl(328, 88%, 36%)"],
    bg: "hsl(14, 65%, 97%)",
  },
  {
    stops: ["hsl(298, 85%, 24%)", "hsl(352, 88%, 36%)"],
    bg: "hsl(298, 65%, 97%)",
  },
  {
    stops: ["hsl(212, 88%, 24%)", "hsl(158, 84%, 26%)"],
    bg: "hsl(212, 65%, 97%)",
  },
  {
    stops: ["hsl(258, 85%, 26%)", "hsl(16, 88%, 38%)"],
    bg: "hsl(258, 65%, 97%)",
  },
  {
    stops: ["hsl(22, 88%, 34%)", "hsl(276, 86%, 28%)"],
    bg: "hsl(22, 65%, 97%)",
  },
];

let lastRolledPairIndex = -1;

export function rollGradient(): QRStyle {
  let idx = Math.floor(Math.random() * CURATED_HARMONIC_PAIRS.length);
  if (idx === lastRolledPairIndex) {
    idx = (idx + 1) % CURATED_HARMONIC_PAIRS.length;
  }
  lastRolledPairIndex = idx;
  const pair = CURATED_HARMONIC_PAIRS[idx];
  const stops = [
    { offset: 0, color: pair.stops[0] },
    { offset: 1, color: pair.stops[1] },
  ];
  const gradient = {
    type: "linear" as const,
    rotation: Math.PI * 0.75,
    colorStops: stops,
  };
  return {
    dots: { type: "gradient", gradient },
    background: { color: pair.bg },
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
  // 6 High-Contrast Archetypes — swatch colors mirror the actual dot gradients
  // (or dot+bg pair for solid high-contrast styles) in utils/qr-styles.ts.
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
  vapor: {
    name: "Vaporwave",
    nameEs: "Vaporwave",
    colors: ["#6D28D9", "#9333EA", "#DB2777"],
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

const LEGACY_STYLE_DISPLAY: Record<
  string,
  { name: string; nameEs: string; colors: string[] }
> = {
  blush: {
    name: "Crimson",
    nameEs: "Carmesí",
    colors: ["#E11D48", "#DB2777", "#9D174D"],
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
};

const ARCHETYPE_KEYS = Object.keys(
  STYLE_DISPLAY,
) as (keyof typeof STYLE_DISPLAY)[];

export default function StyleSelector(
  { style, customStyle, isHidden, lang }: StyleSelectorProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [isRolling, setIsRolling] = useState(false);
  const isCreatorOpen = useSignal(false);

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

  const handleCycleVibe = () => {
    const currentIndex = ARCHETYPE_KEYS.indexOf(
      style.value as keyof typeof STYLE_DISPLAY,
    );
    const nextIndex = (currentIndex + 1) % ARCHETYPE_KEYS.length;
    const nextKey = ARCHETYPE_KEYS[nextIndex];
    style.value = nextKey;
    if (customStyle) customStyle.value = null;
    sounds.gradientShimmer(nextIndex);
    haptics.light();
    const info = STYLE_DISPLAY[nextKey];
    addToast(`🎨 ${isSpanish ? (info.nameEs ?? info.name) : info.name}`);
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

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

  const handleDiceRoll = async () => {
    if (!customStyle || isRolling) return;
    setIsRolling(true);
    try {
      let candidate = rollGradient();
      for (let attempt = 0; attempt < DICE_MAX_ATTEMPTS; attempt++) {
        candidate = attempt === 0 ? candidate : rollGradient();
        const blob = await renderProbeBlob(candidate);
        if (!blob) break;
        const verdict = await checkBlobScannability(blob, DICE_PROBE_DATA);
        if (verdict !== false) break;
      }
      customStyle.value = candidate;
      style.value = "custom";
      haptics.medium();
      sounds.gradientShimmer(Math.floor(Math.random() * 6));
      addToast(DICE_QUIPS[Math.floor(Math.random() * DICE_QUIPS.length)]);
    } finally {
      setIsRolling(false);
    }
  };

  const customStops = customStyle?.value?.dots &&
      "gradient" in customStyle.value.dots &&
      customStyle.value.dots.gradient?.colorStops
    ? customStyle.value.dots.gradient.colorStops.map((s) => s.color)
    : ["#9370DB", "#FF69B4"];

  const currentStyleInfo = style.value === "custom"
    ? {
      name: "Custom",
      nameEs: "Propio",
      colors: customStops,
    }
    : STYLE_DISPLAY[style.value as keyof typeof STYLE_DISPLAY] ??
      LEGACY_STYLE_DISPLAY[style.value] ??
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
      <div class="inline-flex items-center gap-1.5">
        {/* Direct Vibe Cycler Pill */}
        <button
          type="button"
          onClick={handleCycleVibe}
          aria-label={isSpanish
            ? `Cambiar vibra (actual: ${currentStyleName})`
            : `Cycle QR vibe (current: ${currentStyleName})`}
          title={isSpanish
            ? "Clic para cambiar de vibra"
            : "Click to cycle through the 6 vibes"}
          class="inline-flex items-center gap-1.5 px-3 min-h-[36px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-chunky hover:scale-105 active:scale-95 transition-all"
        >
          <div
            class="w-4 h-4 rounded-full border-2 border-[#1e1714] shrink-0"
            style={{
              background: getGradientPreview(
                currentStyleInfo.colors,
                style.value,
              ),
            }}
          />
          <span class="hidden sm:inline whitespace-nowrap">
            {currentStyleName}
          </span>
        </button>

        {/* Compact 1-tap Curated Dice Roll */}
        {customStyle && (
          <button
            type="button"
            onClick={handleDiceRoll}
            disabled={isRolling}
            aria-label={isSpanish
              ? "Combinación al azar"
              : "Surprise me colour pair"}
            title={isSpanish
              ? "Combinación armónica al azar"
              : "Roll a curated high-contrast colour pair"}
            class="group inline-flex items-center justify-center w-9 h-9 bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-sm font-black text-[#1e1714] shadow-chunky hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
          >
            <span class="group-hover:rotate-180 transition-transform duration-300">
              🎲
            </span>
          </button>
        )}
      </div>

      {/* Custom Gradient Creator Modal (summoned from Design tab) */}
      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}

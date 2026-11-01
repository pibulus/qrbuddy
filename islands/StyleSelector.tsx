import { Signal, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "../components/GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

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
  const isCreatorOpen = useSignal(false);
  // Phones hide the vibe name to keep the rail slim; after a cycle the pill
  // widens to show it for a beat, right where the tap happened. No toast —
  // the old one landed on the footer dock.
  const revealName = useSignal(false);
  const revealTimer = useRef<number | null>(null);

  // The Create modal's Design tab can summon the gradient builder from here
  // so brand-minded users never dead-end on a "colors live elsewhere" note.
  useEffect(() => {
    const openCreator = () => {
      isCreatorOpen.value = true;
    };
    globalThis.addEventListener("open-gradient-creator", openCreator);
    return () => {
      globalThis.removeEventListener("open-gradient-creator", openCreator);
      if (revealTimer.current !== null) clearTimeout(revealTimer.current);
    };
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
    revealName.value = true;
    if (revealTimer.current !== null) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      revealName.value = false;
      revealTimer.current = null;
    }, 1400) as unknown as number;
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
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
      {
        /* Vibe cycler — the whole top rail. Custom colours live in the
          Design tab → gradient builder, never in a random roll. */
      }
      <button
        type="button"
        onClick={handleCycleVibe}
        aria-label={isSpanish
          ? `Cambiar vibra (actual: ${currentStyleName})`
          : `Cycle QR vibe (current: ${currentStyleName})`}
        title={isSpanish
          ? "Clic para cambiar de vibra"
          : "Click to cycle through the 6 vibes"}
        class="inline-flex items-center gap-1.5 px-3 min-h-[36px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow] duration-[70ms] hover:-translate-y-px hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none"
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
        <span
          class={`${
            revealName.value ? "inline animate-pop-in" : "hidden"
          } sm:inline whitespace-nowrap`}
        >
          {currentStyleName}
        </span>
      </button>

      {/* Custom Gradient Creator Modal (summoned from Design tab) */}
      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}

import { Signal, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getHistory } from "../utils/history.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "../components/GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface StyleSelectorProps {
  style?: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  isHidden?: Signal<boolean>;
  lang?: Locale;
  variant?: "theme" | "saved";
}

export const STYLE_DISPLAY = {
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
    colors: ["#1e1714", "#FFE94A"],
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

/** The vibe pill opens a gallery: six looks in one tap, not a blind cycle. */
export default function StyleSelector(
  { style, customStyle, isHidden, lang, variant = "theme" }: StyleSelectorProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const isCreatorOpen = useSignal(false);
  const isOpen = useSignal(false);
  const savedCount = useSignal(0);
  const isVaultOpen = useSignal(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "saved") return;
    const syncCount = () => {
      savedCount.value = getHistory().length;
    };
    const syncVisibility = (event: Event) => {
      const open = Boolean(
        (event as CustomEvent<{ open?: boolean }>).detail?.open,
      );
      isVaultOpen.value = open;
    };
    syncCount();
    globalThis.addEventListener("history-updated", syncCount);
    globalThis.addEventListener("qrb-vault-visibility", syncVisibility);
    return () => {
      globalThis.removeEventListener("history-updated", syncCount);
      globalThis.removeEventListener("qrb-vault-visibility", syncVisibility);
    };
  }, [variant]);

  useEffect(() => {
    if (variant === "saved") return;
    const openCreator = () => {
      isCreatorOpen.value = true;
    };
    globalThis.addEventListener("open-gradient-creator", openCreator);
    return () =>
      globalThis.removeEventListener("open-gradient-creator", openCreator);
  }, [variant]);

  useEffect(() => {
    if (!isOpen.value || variant === "saved") return;
    const dismiss = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") isOpen.value = false;
        return;
      }
      if (!rootRef.current?.contains(event.target as Node)) {
        isOpen.value = false;
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [isOpen.value, variant]);

  if (isHidden?.value) return null;

  if (variant === "saved") {
    return (
      <div ref={rootRef} class="relative">
        <button
          type="button"
          onClick={() => {
            isVaultOpen.value = true;
            haptics.light();
            globalThis.dispatchEvent(new CustomEvent("qrb-open-vault"));
          }}
          aria-expanded={isVaultOpen.value}
          aria-haspopup="dialog"
          aria-label={isSpanish
            ? `Códigos guardados${
              savedCount.value > 0 ? ` (${savedCount.value})` : ""
            }`
            : `Saved codes${
              savedCount.value > 0 ? ` (${savedCount.value})` : ""
            }`}
          class="relative inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 min-h-[38px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow] duration-[70ms] hover:-translate-y-px hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
          >
            <path d="M12 3a9 9 0 1 1-6.36 2.64M3 3v5h5M12 7v5l3 2" />
          </svg>
          <span class="hidden sm:inline whitespace-nowrap">
            {isSpanish ? "Guardados" : "Saved"}
          </span>
          {savedCount.value > 0 && (
            <span class="px-1.5 py-0.5 rounded-full bg-[#f7ecdc] border border-[#1e1714]/40 text-[10px] font-black leading-none tabular-nums max-[379px]:absolute max-[379px]:-top-1.5 max-[379px]:-right-1.5 max-[379px]:bg-[#fffef7] max-[379px]:border-2 max-[379px]:border-[#1e1714]">
              {savedCount.value > 99 ? "99+" : savedCount.value}
            </span>
          )}
        </button>
      </div>
    );
  }

  const styleValue = style?.value ?? "sunset";

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle && style) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

  const customStops = customStyle?.value?.dots &&
      "gradient" in customStyle.value.dots &&
      customStyle.value.dots.gradient?.colorStops
    ? customStyle.value.dots.gradient.colorStops.map((s) => s.color)
    : ["#9370DB", "#FF69B4"];

  const currentStyleInfo = styleValue === "custom"
    ? { name: "Custom", nameEs: "Propio", colors: customStops }
    : STYLE_DISPLAY[styleValue as keyof typeof STYLE_DISPLAY] ??
      LEGACY_STYLE_DISPLAY[styleValue] ??
      STYLE_DISPLAY.sunset;

  const currentStyleName = isSpanish
    ? (currentStyleInfo.nameEs ?? currentStyleInfo.name)
    : currentStyleInfo.name;

  const gradientFor = (colors: string[], key?: string) => {
    if ((key === "terminal" || key === "brutalist") && colors.length === 2) {
      return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 52%, ${
        colors[1]
      } 52%, ${colors[1]} 100%)`;
    }
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  };

  const pick = (key: keyof typeof STYLE_DISPLAY) => {
    if (style) style.value = key;
    if (customStyle) customStyle.value = null;
    sounds.gradientShimmer(ARCHETYPE_KEYS.indexOf(key));
    haptics.light();
    isOpen.value = false;
  };

  return (
    <div ref={rootRef} class="relative">
      <button
        type="button"
        onClick={() => {
          isOpen.value = !isOpen.value;
          haptics.light();
        }}
        aria-expanded={isOpen.value}
        aria-haspopup="menu"
        aria-label={isSpanish
          ? `Elegir tema (actual: ${currentStyleName})`
          : `Choose theme (current: ${currentStyleName})`}
        class="inline-flex items-center gap-2 px-3 min-h-[38px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow] duration-[70ms] hover:-translate-y-px hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none"
      >
        <span
          class="w-4 h-4 rounded-full border-2 border-[#1e1714] shrink-0"
          style={{
            background: gradientFor(currentStyleInfo.colors, styleValue),
          }}
        />
        <span class="hidden sm:inline whitespace-nowrap">
          {currentStyleName}
        </span>
        <span aria-hidden="true" class="text-[10px] opacity-60">▾</span>
      </button>

      {isOpen.value && (
        <div
          role="menu"
          aria-label={isSpanish ? "Temas" : "Themes"}
          class="absolute right-0 top-[calc(100%+8px)] w-[252px] p-2 rounded-2xl border-2 border-[#1e1714] bg-[#fbf1e4] shadow-[0_6px_0_#1e1714] z-[60] animate-pop-in"
        >
          <div class="grid grid-cols-3 gap-1.5">
            {ARCHETYPE_KEYS.map((key) => {
              const info = STYLE_DISPLAY[key as keyof typeof STYLE_DISPLAY];
              const active = styleValue === key;
              const name = isSpanish ? (info.nameEs ?? info.name) : info.name;
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  aria-pressed={active}
                  aria-current={active ? "true" : undefined}
                  onClick={() => pick(key)}
                  class={`min-h-[64px] rounded-xl border-2 px-1 py-1.5 flex flex-col items-center gap-1 text-[10px] font-black ${
                    active
                      ? "border-[#1e1714] bg-[#fffef7] shadow-[0_2px_0_#1e1714]"
                      : "border-[#1e1714]/20 bg-[#fffef7]/60 hover:border-[#1e1714]"
                  }`}
                >
                  <span
                    class="w-6 h-6 rounded-full border-2 border-[#1e1714]"
                    style={{ background: gradientFor(info.colors, key) }}
                  />
                  <span class="truncate w-full text-center">{name}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                isOpen.value = false;
                isCreatorOpen.value = true;
                sounds.click();
              }}
              class="col-span-3 min-h-[44px] rounded-xl border-[1.5px] border-[#1e1714]/25 bg-[#fffef7]/60 px-2 flex items-center justify-center gap-1.5 text-[11px] font-black hover:border-[#1e1714]"
            >
              <span class="text-base leading-none">+</span>
              {isSpanish ? "Colores propios" : "Custom colours"}
            </button>
          </div>
        </div>
      )}

      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </div>
  );
}

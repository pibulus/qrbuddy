import type { ComponentChildren } from "preact";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { sounds } from "../../utils/sounds.ts";
import { STYLE_DISPLAY } from "../../islands/StyleSelector.tsx";

export const PALETTE_PILL =
  "min-h-[42px] inline-flex items-center gap-2 rounded-2xl border-2 px-3 text-xs sm:text-[13px] font-black transition-all hover:-translate-y-0.5 active:translate-y-0";

export const pillState = (active: boolean) =>
  active
    ? "relative border-2 border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_2px_0_#1e1714]"
    : "border-[1.5px] border-[#1e1714]/[0.22] bg-[#fffef7] text-[#1e1714] hover:border-[#1e1714]/60";

interface PalettePillsProps {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  /** Extra pill(s) after the presets — e.g. the custom-gradient entry. */
  trailing?: ComponentChildren;
  lang?: Locale;
  /** One row of tactile swatches; the active name lives in the header. */
  swatches?: boolean;
}

/** The six high-contrast vibe archetypes — CreateModal's Design tab and the
 * share page's owner strip pick from the same six. */
export default function PalettePills(
  { value, onChange, disabled = false, trailing, lang, swatches = false }:
    PalettePillsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const entries = Object.entries(STYLE_DISPLAY);

  const swatchBg = (
    colors: readonly string[],
    solidPair: boolean,
  ) =>
    solidPair
      ? `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 52%, ${
        colors[1]
      } 52%, ${colors[1]} 100%)`
      : `linear-gradient(135deg, ${colors.join(", ")})`;

  if (swatches) {
    return (
      <div class="grid grid-cols-7 gap-2 place-items-center">
        {entries.map(([key, info], index) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              title={isSpanish ? (info.nameEs ?? info.name) : info.name}
              aria-label={isSpanish ? (info.nameEs ?? info.name) : info.name}
              onClick={() => {
                onChange(key);
                sounds.gradientShimmer(index);
                haptics.light();
              }}
              class={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full border-2 border-[#1e1714] transition-transform active:scale-95 ${
                active
                  ? "ring-2 ring-[#1e1714] ring-offset-2 ring-offset-[#fbf1e4] scale-105"
                  : "hover:scale-105"
              }`}
              style={{
                background: swatchBg(
                  info.colors,
                  (key === "terminal" || key === "brutalist") &&
                    info.colors.length === 2,
                ),
              }}
            />
          );
        })}
        {trailing}
      </div>
    );
  }

  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([key, info], index) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            disabled={disabled}
            onClick={() => {
              onChange(key);
              sounds.gradientShimmer(index);
              haptics.light();
            }}
            class={`w-full justify-start ${PALETTE_PILL} ${
              pillState(value === key)
            }`}
          >
            <span
              class="w-4 h-4 rounded-full border-2 border-[#1e1714] shrink-0"
              style={{
                background: swatchBg(
                  info.colors,
                  (key === "terminal" || key === "brutalist") &&
                    info.colors.length === 2,
                ),
              }}
            />
            <span class="whitespace-nowrap">
              {isSpanish ? (info.nameEs ?? info.name) : info.name}
            </span>
          </button>
        ))}
      </div>
      {trailing}
    </div>
  );
}

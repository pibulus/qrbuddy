import type { ComponentChildren } from "preact";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { sounds } from "../../utils/sounds.ts";
import { STYLE_DISPLAY } from "../StyleSelector.tsx";

export const PALETTE_PILL =
  "min-h-[42px] inline-flex items-center gap-1.5 rounded-2xl border-2 px-2.5 text-xs sm:text-[13px] font-black transition-all hover:-translate-y-0.5 active:translate-y-0";

export const pillState = (active: boolean) =>
  active
    ? "border-[#1e1714] bg-amber-200 text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
    : "border-[#1e1714]/15 bg-[#fffef7] text-neutral-800 hover:border-[#1e1714]/60";

interface PalettePillsProps {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  /** Extra pill(s) after the presets — e.g. the custom-gradient entry. */
  trailing?: ComponentChildren;
  lang?: Locale;
}

/** The 5×2 grid of preset swatch pills — CreateModal's Design tab and the
 * share page's owner strip pick from the same ten. */
export default function PalettePills(
  { value, onChange, disabled = false, trailing, lang }: PalettePillsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const entries = Object.entries(STYLE_DISPLAY);
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {entries.map(([key, info], index) => {
          const isSolidPair = (key === "terminal" || key === "brutalist") &&
            info.colors.length === 2;
          const swatchBg = isSolidPair
            ? `linear-gradient(135deg, ${info.colors[0]} 0%, ${
              info.colors[0]
            } 52%, ${info.colors[1]} 52%, ${info.colors[1]} 100%)`
            : `linear-gradient(135deg, ${info.colors.join(", ")})`;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={value === key}
              disabled={disabled}
              onClick={() => {
                onChange(key);
                sounds.playAt?.("bloop", index, { total: entries.length });
                haptics.light();
              }}
              class={`w-full justify-start ${PALETTE_PILL} ${
                pillState(value === key)
              }`}
            >
              <span
                class="w-4 h-4 rounded-full border-2 border-[#1e1714] shrink-0"
                style={{ background: swatchBg }}
              />
              <span class="truncate">
                {isSpanish ? (info.nameEs ?? info.name) : info.name}
              </span>
            </button>
          );
        })}
      </div>
      {trailing}
    </div>
  );
}

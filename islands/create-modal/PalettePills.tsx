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

/** The 4×2 grid of preset swatch pills — CreateModal's Design tab and the
 * share page's owner strip pick from the same eight. */
export default function PalettePills(
  { value, onChange, disabled = false, trailing, lang }: PalettePillsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(STYLE_DISPLAY).map(([key, info], index) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            disabled={disabled}
            onClick={() => {
              onChange(key);
              sounds.playAt?.("bloop", index, { total: 8 });
              haptics.light();
            }}
            class={`w-full justify-start ${PALETTE_PILL} ${
              pillState(value === key)
            }`}
          >
            <span
              class="w-4 h-4 rounded-full border-2 border-[#1e1714] shrink-0"
              style={{
                background: `linear-gradient(135deg, ${
                  info.colors.join(", ")
                })`,
              }}
            />
            <span class="truncate">
              {isSpanish ? (info.nameEs ?? info.name) : info.name}
            </span>
          </button>
        ))}
      </div>
      {trailing}
    </div>
  );
}

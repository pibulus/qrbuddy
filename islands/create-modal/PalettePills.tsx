import type { ComponentChildren } from "preact";
import { haptics } from "../../utils/haptics.ts";
import { STYLE_DISPLAY } from "../StyleSelector.tsx";

export const PALETTE_PILL =
  "min-h-[40px] inline-flex items-center gap-2 rounded-full border-2 px-3 text-sm font-black transition-all hover:scale-105 active:scale-95";

export const pillState = (active: boolean) =>
  active
    ? "border-black bg-amber-200 text-black shadow-chunky"
    : "border-black/15 bg-white text-neutral-800 hover:border-black/60";

interface PalettePillsProps {
  value: string;
  onChange: (key: string) => void;
  /** Extra pill(s) after the presets — e.g. the custom-gradient entry. */
  trailing?: ComponentChildren;
}

/** The one row of preset swatch pills — CreateModal's Design tab and the
 * share page's owner strip pick from the same eight. */
export default function PalettePills(
  { value, onChange, trailing }: PalettePillsProps,
) {
  return (
    <div class="flex flex-wrap gap-2">
      {Object.entries(STYLE_DISPLAY).map(([key, info]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => {
            onChange(key);
            haptics.light();
          }}
          class={`${PALETTE_PILL} ${pillState(value === key)}`}
        >
          <span
            class="w-4 h-4 rounded-full border-2 border-black shrink-0"
            style={{
              background: `linear-gradient(135deg, ${info.colors.join(", ")})`,
            }}
          />
          {info.name}
        </button>
      ))}
      {trailing}
    </div>
  );
}

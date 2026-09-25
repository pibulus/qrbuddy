import type { ComponentChildren } from "preact";

interface ChoiceRowProps {
  icon: string;
  title: string;
  description: string;
  active?: boolean;
  /** Tall variant: icon on top, room for a full sentence. Behavior tab. */
  rich?: boolean;
  /** Optional trailing control (e.g. an Upload button) — clicks inside it
   * don't toggle the row. */
  trailing?: ComponentChildren;
  onClick: () => void;
}

/** The one selectable card across CreateModal's tabs. State is carried by
 * inversion alone — active cards go amber with a black border and the chunky
 * shadow; inactive ones sit quiet. No "Active" pills, no eyebrow tags. */
export default function ChoiceRow(
  { icon, title, description, active = false, rich = false, trailing, onClick }:
    ChoiceRowProps,
) {
  const shell = active
    ? "border-black bg-amber-200 shadow-chunky"
    : "border-black/15 bg-white hover:border-black/60";

  if (rich) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        class={`group w-full h-full rounded-2xl border-2 p-4 text-left transition-all flex flex-col gap-2 ${shell}`}
      >
        <span class="w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center text-xl">
          {icon}
        </span>
        <span class="font-black text-black text-lg leading-tight">{title}</span>
        <span class="text-sm text-neutral-700 leading-snug">{description}</span>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      class={`group w-full min-h-[60px] rounded-2xl border-2 px-3 py-2.5 text-left transition-all flex items-center gap-3 cursor-pointer select-none ${shell}`}
    >
      <span class="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center text-lg shrink-0">
        {icon}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block font-black text-black leading-tight">{title}</span>
        <span class="block text-xs text-neutral-700 leading-snug mt-0.5">
          {description}
        </span>
      </span>
      {trailing && (
        <span class="shrink-0" onClick={(e) => e.stopPropagation()}>
          {trailing}
        </span>
      )}
    </div>
  );
}

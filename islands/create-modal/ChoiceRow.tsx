import type { ComponentChildren } from "preact";

interface ChoiceRowProps {
  icon: string;
  title: string;
  description: string;
  active?: boolean;
  /** Tall variant: icon on top, room for a full sentence. Behavior tab. */
  rich?: boolean;
  /** Show trailing step chevron `→` (default true on standard rows without custom trailing). */
  chevron?: boolean;
  /** Optional status pill text shown beside the chevron when configured/active. */
  badge?: string;
  /** Optional trailing control (e.g. an Upload button) — clicks inside it
   * don't toggle the row. */
  trailing?: ComponentChildren;
  onClick: () => void;
}

/** The one selectable card across CreateModal's tabs. State is carried by
 * inversion alone — active cards go amber with a black border and the chunky
 * shadow; inactive ones sit quiet. */
export default function ChoiceRow(
  {
    icon,
    title,
    description,
    active = false,
    rich = false,
    chevron = true,
    badge,
    trailing,
    onClick,
  }: ChoiceRowProps,
) {
  const shell = active
    ? "border-[#1e1714] bg-amber-200 shadow-chunky"
    : "border-[#1e1714]/15 bg-[#fffef7] hover:border-[#1e1714]/60";

  if (rich) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        class={`group w-full h-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] flex flex-col gap-2 ${shell}`}
      >
        <span class="w-11 h-11 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-xl">
          {icon}
        </span>
        <span class="font-black text-[#1e1714] text-lg leading-tight">
          {title}
        </span>
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
      class={`group w-full min-h-[60px] rounded-2xl border-2 px-3 py-2.5 text-left transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer select-none ${shell}`}
    >
      <span class="w-10 h-10 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-lg shrink-0">
        {icon}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block font-black text-[#1e1714] leading-tight">
          {title}
        </span>
        <span class="block text-xs text-neutral-700 leading-snug mt-0.5">
          {description}
        </span>
      </span>
      {trailing
        ? (
          <span class="shrink-0" onClick={(e) => e.stopPropagation()}>
            {trailing}
          </span>
        )
        : chevron && (
          <span
            aria-hidden="true"
            class={`shrink-0 inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${
              badge || active
                ? "rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2 py-0.5 text-[11px] font-black text-[#1e1714]"
                : "text-sm font-black text-neutral-400 group-hover:text-[#1e1714]"
            }`}
          >
            {badge && <span>{badge}</span>}
            <span>→</span>
          </span>
        )}
    </div>
  );
}

import type { ComponentChildren } from "preact";

interface ChoiceRowProps {
  icon: string;
  title: string;
  description?: string;
  active?: boolean;
  /** Optional chromatic pastel/gradient background for the icon square. */
  iconBg?: string;
  /** Optional subtle shimmy/float on the icon tile for flagship cards. */
  shimmer?: boolean;
  /** Tall variant: icon on top, room for a full sentence. */
  rich?: boolean;
  /** Show trailing step chevron `→` (default false on grid cards unless passed). */
  chevron?: boolean;
  /** Toggle/accordion mode: replaces redirect `→` with an expand/collapse indicator and merges `children` into one unified card when active. */
  accordion?: boolean;
  /** Optional status pill text shown beside the chevron/toggle when configured/active. */
  badge?: string;
  /** Optional explicit "Turn off" action for accordion rows so collapsing only hides. */
  onClearBadge?: () => void;
  clearBadgeLabel?: string;
  /** Optional trailing control (e.g. an Upload button) — clicks inside it
   * don't toggle the row. */
  trailing?: ComponentChildren;
  /** Optional expanded body rendered inside the unified card when `accordion && active`. */
  children?: ComponentChildren;
  onClick: () => void;
}

/** The one selectable card across CreateModal's tabs. State is carried by
 * theme-synced tint + chunky border/shadow when active; inactive rows sit crisp on warm paper. */
export default function ChoiceRow(
  {
    icon,
    title,
    description,
    active = false,
    iconBg,
    shimmer = false,
    rich = false,
    chevron = false,
    accordion = false,
    badge,
    onClearBadge,
    clearBadgeLabel = "Turn off",
    trailing,
    children,
    onClick,
  }: ChoiceRowProps,
) {
  const shell = active
    ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] shadow-[2px_2px_0_#1e1714]"
    : "border-[#1e1714]/25 bg-[#fffef7] hover:border-[#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)]/40 hover:shadow-[0_2px_0_#1e1714]";
  const iconStyle = iconBg ? { background: iconBg } : undefined;
  const iconShimmy = shimmer
    ? "transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
    : "transition-transform duration-200 group-hover:scale-105";

  if (rich) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        class={`group w-full h-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] flex flex-col gap-2 ${shell}`}
      >
        <span
          style={iconStyle}
          class={`w-11 h-11 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-xl shadow-[1.5px_1.5px_0_#1e1714] ${iconShimmy}`}
        >
          {icon}
        </span>
        <span class="font-black text-[#1e1714] text-lg leading-tight">
          {title}
        </span>
        {description && (
          <span class="text-sm text-[#4a3f39] leading-snug">
            {description}
          </span>
        )}
      </button>
    );
  }

  if (accordion) {
    const configured = Boolean(badge);
    return (
      <div
        class={`w-full rounded-2xl border-2 transition-all overflow-hidden ${
          active || configured
            ? "border-[#1e1714] bg-[#fffef7] shadow-[0_2px_0_#1e1714]"
            : "border-[#1e1714]/25 bg-[#fffef7] hover:border-[#1e1714]"
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={active}
          aria-pressed={active}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
          class={`group w-full min-h-[54px] px-3.5 py-2.5 text-left flex items-center gap-3 cursor-pointer select-none transition-colors ${
            active
              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] border-b-2 border-[#1e1714]"
              : configured
              ? "bg-[var(--qr-theme-tint,#fce7f3)]/55 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
              : "hover:bg-[#fbf1e4]"
          }`}
        >
          <span
            style={iconStyle}
            class={`w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-base shrink-0 shadow-[1.5px_1.5px_0_#1e1714] ${iconShimmy}`}
          >
            {icon}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-black text-sm text-[#1e1714] leading-tight">
              {title}
            </span>
            {description && (
              <span class="block text-xs text-[#574c44] leading-snug mt-0.5">
                {description}
              </span>
            )}
          </span>
          {trailing
            ? (
              <span class="shrink-0" onClick={(e) => e.stopPropagation()}>
                {trailing}
              </span>
            )
            : (
              <span class="shrink-0 inline-flex items-center gap-1.5">
                {badge && (
                  <span class="inline-flex items-center gap-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] pl-2.5 pr-1.5 py-0.5 text-[11px] font-black text-[#1e1714] shadow-[1px_1px_0_#1e1714]">
                    <span
                      aria-hidden="true"
                      class="w-1.5 h-1.5 rounded-full bg-[var(--qr-theme-accent,#ec4899)] shrink-0"
                    />
                    <span>{badge}</span>
                    {onClearBadge && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearBadge();
                        }}
                        class="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-black text-[#4a3f39] hover:bg-[#1e1714] hover:text-[#fffef7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714]"
                        aria-label={`${clearBadgeLabel}: ${title}`}
                        title={clearBadgeLabel}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  class={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                    active
                      ? "border-[#1e1714] bg-[#fffef7] text-[#1e1714]"
                      : "border-[#1e1714]/20 bg-[#fbf1e4] text-[#4a3f39] group-hover:border-[#1e1714] group-hover:text-[#1e1714]"
                  }`}
                >
                  {active ? "▴" : "▾"}
                </span>
              </span>
            )}
        </div>
        {active && children && (
          <div class="p-3.5 sm:p-4 bg-[#fffef7] animate-slide-down">
            {children}
          </div>
        )}
      </div>
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
      class={`group w-full min-h-[68px] rounded-2xl border-2 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-3 cursor-pointer select-none ${shell}`}
    >
      <span
        style={iconStyle}
        class={`w-10 h-10 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-lg shrink-0 shadow-[1.5px_1.5px_0_#1e1714] ${iconShimmy}`}
      >
        {icon}
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1.5 flex-wrap">
          <span class="font-black text-sm sm:text-[15px] text-[#1e1714] leading-tight">
            {title}
          </span>
          {badge && !chevron && (
            <span class="inline-flex items-center rounded-full border border-[#1e1714] bg-[#fffef7] px-2 py-0.5 text-[10px] font-black text-[#1e1714]">
              {badge}
            </span>
          )}
        </span>
        {description && (
          <span class="block text-xs text-[#4a3f39] font-medium leading-snug mt-0.5">
            {description}
          </span>
        )}
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
            class={`shrink-0 inline-flex items-center gap-1 whitespace-nowrap transition-transform group-hover:translate-x-0.5 ${
              badge || active
                ? "rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2 py-0.5 text-[11px] font-black text-[#1e1714]"
                : "text-sm font-black text-[#6e6058] group-hover:text-[#1e1714]"
            }`}
          >
            {badge && <span>{badge}</span>}
            <span>→</span>
          </span>
        )}
    </div>
  );
}

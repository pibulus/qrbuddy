import type { ComponentChildren } from "preact";
import type { Locale } from "../utils/i18n.ts";

/** The one tucked "back to the studio" pill every utility page opens with. */
export default function PageTopBar(
  {
    lang = "en",
    class: className = "",
    rightSlot,
  }: { lang?: Locale; class?: string; rightSlot?: ComponentChildren },
) {
  const es = lang === "es";
  return (
    <nav
      aria-label={es ? "Navegación del estudio" : "Studio navigation"}
      class={`flex items-center justify-between gap-2 ${className}`}
    >
      <a
        href={es ? "/es" : "/"}
        class="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-3.5 py-1.5 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow,background-color] duration-[70ms] hover:-translate-y-px hover:bg-[#fbf1e4] hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none"
      >
        <span aria-hidden="true">←</span>
        <span>QRBuddy</span>
      </a>
      {rightSlot}
    </nav>
  );
}

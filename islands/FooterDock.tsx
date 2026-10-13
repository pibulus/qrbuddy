/**
 * FooterDock — the one bottom bar: a single white capsule (About ·
 * Solutions · pink Supporter inset) with the maker line under it on phones
 * and beside it on desktop. One object, one line — never a pile of pills.
 * No divider line: the dock is the page's bottom edge, not a fence across
 * the canvas.
 */
import { useEffect, useRef } from "preact/hooks";
import { openAboutModal } from "./AboutModal.tsx";
// import { KofiButton } from "./KofiModal.tsx"; — Tip Jar parked, see below.
import { openPricingModal } from "./PricingModal.tsx";
import { MAKER_URL } from "../utils/constants.ts";

type Lang = "en" | "es";

const COPY = {
  en: {
    made: "Made by Pablo",
    solutions: "Solutions",
    about: "About",
    tip: "Tip Jar ☕",
    supporter: "Supporter ✨",
    links: [
      { href: "/for/menus", label: "Restaurant Menus 📜" },
      { href: "/for/weddings", label: "Weddings & Photo Drops 📸" },
      { href: "/for/music", label: "Music Mixtapes 📼" },
      { href: "/for/lockers", label: "Secret Drops 🔐" },
      { href: "/guide/printing", label: "Print Calculator & Guide 📐" },
    ],
  },
  es: {
    made: "Hecho por Pablo",
    solutions: "Soluciones",
    about: "Acerca de",
    tip: "Propina ☕",
    supporter: "Apoya ✨",
    links: [
      { href: "/es/menus", label: "Menús para Restaurantes 📜" },
      { href: "/es/bodas", label: "Bodas y Fotos 📸" },
      { href: "/es/musica", label: "Mixtapes y Música 📼" },
      { href: "/es/archivos", label: "Archivos Secretos 🔐" },
      { href: "/es/guia/impresion", label: "Calculadora & Guía 📐" },
    ],
  },
} as const;

// Items sit flat inside the capsule — the capsule owns border + shadow.
// Padding and type flex with the viewport so the dock stays one line down
// to 320px, in both languages.
const ITEM =
  "inline-flex items-center justify-center gap-1 px-[clamp(8px,2.6vw,14px)] min-h-[44px] rounded-full text-[clamp(13px,3.6vw,14px)] font-bold text-black whitespace-nowrap transition-all hover:bg-amber-100 active:scale-95 select-none";

export default function FooterDock({ lang = "en" }: { lang?: Lang }) {
  const t = COPY[lang];
  const year = new Date().getFullYear();
  const solutionsRef = useRef<HTMLDetailsElement>(null);

  // Light-dismiss for the Solutions pop-up: a tap anywhere else, or Escape,
  // folds it back into the dock.
  useEffect(() => {
    const dismiss = (e: Event) => {
      const el = solutionsRef.current;
      if (!el?.open) return;
      const outside = e instanceof KeyboardEvent
        ? e.key === "Escape"
        : !el.contains(e.target as Node);
      if (outside) el.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <footer class="w-full mt-auto pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div class="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-5">
        <nav
          class="inline-flex items-center p-1 rounded-full border-2 border-black bg-white shadow-chunky"
          aria-label="Site"
        >
          <button type="button" onClick={() => openAboutModal()} class={ITEM}>
            {t.about}
          </button>

          {/* Solutions pops UP from the dock — native details, light-dismissed */}
          <details ref={solutionsRef} class="relative group">
            <summary
              class={`list-none cursor-pointer group-open:bg-amber-100 ${ITEM}`}
            >
              {t.solutions}
              <span
                class="text-xs transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                ▴
              </span>
            </summary>
            {
              /* Centering lives on this wrapper so pop-in's transform can't
                knock the panel off-axis mid-animation. */
            }
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50">
              <div class="w-64 bg-qr-cream border-3 border-black rounded-2xl shadow-chunky-hover p-2 flex flex-col origin-bottom animate-pop-in">
                {t.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    class="px-3 min-h-[44px] flex items-center rounded-xl text-sm font-bold text-gray-800 hover:bg-white hover:text-black transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </details>

          {
            /* Tip Jar parked for now. To bring it back: un-comment the
              KofiButton import, drop in <KofiButton size="sm" label={t.tip} />
              here, and re-mount <KofiModal> in the home routes. */
          }

          <button
            type="button"
            onClick={openPricingModal}
            class="inline-flex items-center justify-center px-[clamp(10px,3vw,16px)] min-h-[44px] rounded-full border-2 border-black bg-qr-pop text-white text-[clamp(13px,3.6vw,14px)] font-black whitespace-nowrap transition-all hover:bg-qr-popDeep active:scale-95"
          >
            {t.supporter}
          </button>
        </nav>

        <p class="sm:order-first text-xs font-bold text-gray-600">
          © {year} QRBuddy ·{" "}
          <a
            href={MAKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center min-h-[44px] underline decoration-2 decoration-qr-pop/40 underline-offset-2 transition-colors hover:text-black hover:decoration-qr-pop"
          >
            {t.made}
          </a>{" "}
          💖
        </p>
      </div>
    </footer>
  );
}

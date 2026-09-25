/**
 * FooterDock — the one bottom bar. Metadata left, utility pills right, a
 * Solutions pill that pops the vertical guides upward. No divider line: the
 * dock is the page's bottom edge, not a fence across the canvas.
 */
import { AboutLink } from "./AboutModal.tsx";
import { KofiButton } from "./KofiModal.tsx";
import { PricingLink } from "./PricingModal.tsx";

type Lang = "en" | "es";

const COPY = {
  en: {
    made: "Made by Pablo 💖",
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
    made: "Hecho por Pablo 💖",
    solutions: "Soluciones",
    about: "Acerca de",
    tip: "Propina ☕",
    supporter: "Pase de Soporte ✨",
    links: [
      { href: "/es/menus", label: "Menús para Restaurantes 📜" },
      { href: "/es/bodas", label: "Bodas y Fotos 📸" },
      { href: "/es/musica", label: "Mixtapes y Música 📼" },
      { href: "/es/archivos", label: "Archivos Secretos 🔐" },
      { href: "/es/guia/impresion", label: "Calculadora & Guía 📐" },
    ],
  },
} as const;

export default function FooterDock({ lang = "en" }: { lang?: Lang }) {
  const t = COPY[lang];
  const year = new Date().getFullYear();

  return (
    <footer class="w-full mt-auto pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs font-bold text-gray-600 order-2 sm:order-1">
          © {year} QRBuddy · {t.made}
        </p>

        <nav
          class="flex items-center justify-center gap-2 flex-wrap order-1 sm:order-2"
          aria-label="Site"
        >
          <AboutLink label={t.about} />

          {/* Solutions pops UP from the dock — pure HTML, no state */}
          <details class="relative group">
            <summary class="list-none cursor-pointer inline-flex items-center gap-1 px-4 min-h-[44px] rounded-full border-2 border-black bg-white text-sm font-bold text-black shadow-chunky transition-all hover:scale-105 active:scale-95 select-none">
              {t.solutions}
              <span class="text-xs transition-transform group-open:rotate-180">
                ▴
              </span>
            </summary>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-qr-cream border-3 border-black rounded-2xl shadow-chunky-hover p-2 flex flex-col animate-pop-in z-50">
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
          </details>

          <KofiButton size="sm" label={t.tip} />
          <PricingLink label={t.supporter} />
        </nav>
      </div>
    </footer>
  );
}

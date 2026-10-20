import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "./modal/CardModal.tsx";
import { openPricingModal } from "./PricingModal.tsx";
import { MAKER_URL } from "../utils/constants.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

// Global signal for modal state
export const aboutModalOpen = signal(false);
// "intro" = first-visit poster: what it does, one CTA, no asks.
// "about" = the manifesto: why it exists, who made it, how to back it.
export const aboutModalMode = signal<"intro" | "about">("about");

export function openAboutModal(mode: "intro" | "about" = "about") {
  aboutModalMode.value = mode;
  aboutModalOpen.value = true;
}

export function closeAboutModal() {
  aboutModalOpen.value = false;
}

const INTRO_SEEN_KEY = "qrbuddy_intro_seen";

const PUNCHES = {
  en: [
    {
      icon: "🎨",
      tint: "bg-rose-100",
      title: "Gorgeous by default",
      body: '8 gradients, a style dice, printable "SCAN ME" frames.',
    },
    {
      icon: "💣",
      tint: "bg-amber-100",
      title: "Codes with superpowers",
      body: "Self-destructing files, mixtapes, editable links, PIN'd lockers.",
    },
    {
      icon: "🔍",
      tint: "bg-purple-100",
      title: "Reads them too",
      body: "Scan any code — then remake the ugly ones beautiful.",
    },
  ],
  es: [
    {
      icon: "🎨",
      tint: "bg-rose-100",
      title: "Chulos por defecto",
      body: "8 degradados, dado de estilos y marcos listos para imprimir.",
    },
    {
      icon: "💣",
      tint: "bg-amber-100",
      title: "QRs con superpoderes",
      body:
        "Archivos con autodestrucción, mixtapes, links editables y buzones con PIN.",
    },
    {
      icon: "🔍",
      tint: "bg-purple-100",
      title: "También los revisa",
      body: "Checa a dónde lleva cualquier QR antes de abrirlo.",
    },
  ],
};

// The deal, as stickers — a bold run-on line kept orphaning "links." on
// phones.
const DEAL = {
  en: [
    { label: "Free", class: "bg-rose-100 -rotate-2" },
    { label: "Zero accounts", class: "bg-amber-100 rotate-1" },
    { label: "No hostage links", class: "bg-purple-100 -rotate-1" },
  ],
  es: [
    { label: "Gratis", class: "bg-rose-100 -rotate-2" },
    { label: "Cero cuentas", class: "bg-amber-100 rotate-1" },
    { label: "Sin links secuestrados", class: "bg-purple-100 -rotate-1" },
  ],
};

const SIGNATURE_LINK =
  "inline-flex items-center min-h-[44px] font-bold text-gray-700 underline decoration-2 decoration-qr-pop/40 underline-offset-2 transition-colors hover:text-black hover:decoration-qr-pop";

// One modal at a time (the shell's scroll-lock is single-slot), so hand off
// to the next card after this one has let go.
function handOff(open: () => void) {
  closeAboutModal();
  setTimeout(open, 60);
}

export function AboutModal({ lang }: { lang?: Locale } = {}) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const isOpen = aboutModalOpen.value;
  const isIntro = aboutModalMode.value === "intro";

  // First visit: open once as the intro poster, after the page has had its
  // bloom-in moment, but don't interrupt someone who's already using the page.
  useEffect(() => {
    try {
      if (localStorage.getItem(INTRO_SEEN_KEY)) return;
      let hasInteracted = false;
      const markInteracted = () => {
        hasInteracted = true;
      };
      document.addEventListener("pointerdown", markInteracted, { once: true });
      document.addEventListener("keydown", markInteracted, { once: true });
      const t = setTimeout(() => {
        const activeDialog = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"][aria-modal="true"]',
          ),
        ).some((dialog) =>
          !dialog.hasAttribute("inert") &&
          dialog.getAttribute("aria-hidden") !== "true"
        );
        const activeElement = document.activeElement;
        const focusIsEngaged = activeElement &&
          activeElement !== document.body &&
          activeElement !== document.documentElement;
        if (hasInteracted || activeDialog || focusIsEngaged) return;

        try {
          localStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          // Showing the intro should not depend on persisting the seen flag.
        }
        openAboutModal("intro");
      }, 1200);
      return () => {
        clearTimeout(t);
        document.removeEventListener("pointerdown", markInteracted);
        document.removeEventListener("keydown", markInteracted);
      };
    } catch {
      // localStorage unavailable — skip the intro, never block the app.
    }
  }, []);

  return (
    <CardModal
      open={isOpen}
      onClose={closeAboutModal}
      labelledby="about-title"
      badge="🌸"
    >
      <div class="text-center space-y-5">
        <h2
          id="about-title"
          class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black text-balance"
        >
          {isIntro
            ? (isSpanish ? "Pega un link." : "Drop a link.")
            : (isSpanish ? "Los QRs comunes aburren." : "QR codes are boring.")}
          <span class="block text-qr-pop">
            {isIntro
              ? (isSpanish ? "Hazlo brillar." : "Watch it bloom.")
              : (isSpanish
                ? "QRBuddy les dio buena onda."
                : "QRBuddy fixed that.")}
          </span>
        </h2>

        {isIntro
          ? (
            <ul class="space-y-3.5 text-left">
              {PUNCHES[locale].map((punch) => (
                <li key={punch.title} class="flex items-center gap-3">
                  <span
                    class={`w-10 h-10 shrink-0 rounded-xl border-2 border-black ${punch.tint} flex items-center justify-center text-lg`}
                    aria-hidden="true"
                  >
                    {punch.icon}
                  </span>
                  <span class="min-w-0 text-sm text-gray-700 leading-snug">
                    <span class="block font-black text-black">
                      {punch.title}
                    </span>
                    {punch.body}
                  </span>
                </li>
              ))}
            </ul>
          )
          : (
            <div class="space-y-4">
              <div class="space-y-2 text-[15px] leading-relaxed text-gray-700 font-medium text-balance">
                <p>
                  {isSpanish
                    ? "La mayoría de los QRs parecen errores de impresora y te atrapan en suscripciones mensuales."
                    : "Most QR codes look like printer errors and trap you in monthly subscriptions."}
                </p>
                <p>
                  {isSpanish
                    ? (
                      <>
                        QRBuddy los hace bonitos, interactivos y{" "}
                        <span class="font-black text-black">
                          tuyos para siempre.
                        </span>
                      </>
                    )
                    : (
                      <>
                        QRBuddy makes them gorgeous, interactive, and{" "}
                        <span class="font-black text-black">
                          forever yours.
                        </span>
                      </>
                    )}
                </p>
              </div>
              <ul
                class="flex flex-wrap justify-center gap-2"
                aria-label={isSpanish ? "El trato" : "The deal"}
              >
                {DEAL[locale].map((deal) => (
                  <li
                    key={deal.label}
                    class={`px-3 py-1 rounded-full border-2 border-black text-xs font-black text-black ${deal.class}`}
                  >
                    {deal.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div class="space-y-2.5">
          <CardPrimaryButton onClick={closeAboutModal}>
            {isSpanish ? "Crear algo chido 🌸" : "Make something 🌸"}
          </CardPrimaryButton>
          {!isIntro && (
            <div class="flex">
              <CardSecondaryButton onClick={() => handOff(openPricingModal)}>
                {isSpanish ? "Pase Supporter ✨" : "Supporter Pass ✨"}
              </CardSecondaryButton>
            </div>
          )}
        </div>

        {/* Signature row — the maker credit lives on both faces of the card */}
        <p class="text-xs font-medium text-gray-500">
          <a
            href={MAKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            class={SIGNATURE_LINK}
          >
            {isSpanish ? "Hecho por Pablo" : "Made by Pablo"}
          </a>
          {isIntro
            ? (
              <>
                <span class="mx-2" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => (aboutModalMode.value = "about")}
                  class="inline-flex items-center min-h-[44px] font-bold text-gray-500 transition-colors hover:text-qr-pop"
                >
                  {isSpanish ? "Toda la historia →" : "The whole story →"}
                </button>
              </>
            )
            : (isSpanish
              ? " en Melbourne · Cero VC, cero rollos"
              : " in Melbourne · No VC, no BS")}
        </p>
      </div>
    </CardModal>
  );
}

// About Link Button
interface AboutLinkProps {
  label?: string;
  className?: string;
}

export function AboutLink({
  label = "About",
  className = "",
}: AboutLinkProps) {
  return (
    <button
      type="button"
      onClick={() => openAboutModal()}
      class={`inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border-2 border-black bg-white text-sm font-bold text-black shadow-chunky transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

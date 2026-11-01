import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import {
  CardBody,
  CardDot,
  CardHeading,
  CardModal,
  CardPrimaryButton,
  CardQuietLink,
  CardSignature,
} from "../components/modal/CardModal.tsx";
import { openPricingModal } from "./PricingModal.tsx";
import { MAKER_URL } from "../utils/constants.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { sounds } from "../utils/sounds.ts";

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

// Intro poster: three plain lines that say what the thing does.
const INTRO_LINES = {
  en: [
    "Paste a link, pick a palette, save a print-ready PNG or SVG.",
    "Wi-Fi cards, contact cards, photo drops and file lockers too.",
    "No account needed. Static codes stay free and work forever.",
  ],
  es: [
    "Pega un link, elige una paleta y guarda un PNG o SVG listo para imprimir.",
    "También tarjetas Wi-Fi, de contacto, fotos y buzones de archivos.",
    "Sin cuenta. Los códigos estáticos son gratis y funcionan para siempre.",
  ],
};

// About manifesto: what's wrong with the others, then what this one does.
const PITCH_ITEMS = {
  en: [
    "Print-ready codes from one paste.",
    "Static codes free forever, no account.",
    "Editable links and scan stats on a flat yearly Passport. No auto-renew.",
    "Wi-Fi and contact cards, photo drops, mixtapes, file lockers.",
  ],
  es: [
    "Códigos listos para imprimir con un solo pegado.",
    "Códigos estáticos gratis para siempre, sin cuenta.",
    "Links editables y estadísticas con un Pasaporte anual fijo. Sin renovación automática.",
    "Tarjetas Wi-Fi y de contacto, fotos, mixtapes, buzones de archivos.",
  ],
};

const PABLO_EMOJIS = ["☕", "🌴", "🍸", "🌮"];

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
  const [emojiIdx, setEmojiIdx] = useState(0);

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

  const shuffleCharm = () => {
    setEmojiIdx((i) => (i + 1) % PABLO_EMOJIS.length);
    sounds.bloop?.();
  };

  return (
    <CardModal
      open={isOpen}
      onClose={closeAboutModal}
      labelledby="about-title"
      badge={
        <img
          src="/icon-192.png"
          alt=""
          width={64}
          height={64}
          class="w-16 h-16 select-none"
        />
      }
      badgeTile={false}
    >
      <CardBody>
        {isIntro
          ? (
            <>
              <CardHeading
                id="about-title"
                title={isSpanish
                  ? (
                    <>
                      Pega un link.<br />
                      <span class="qr-marker">Hazlo brillar.</span>
                    </>
                  )
                  : (
                    <>
                      Drop a link.<br />
                      <span class="qr-marker">Watch it bloom.</span>
                    </>
                  )}
                tagline={isSpanish
                  ? "Códigos QR listos para imprimir, gratis para siempre."
                  : "Print-ready QR codes, free forever."}
              />

              <div class="qr-pitch-lines">
                {INTRO_LINES[locale].map((line) => <p key={line}>{line}</p>)}
              </div>

              <div class="pt-1">
                <CardPrimaryButton onClick={closeAboutModal}>
                  {isSpanish ? "Crear un QR" : "Make a QR code"}
                </CardPrimaryButton>
              </div>
            </>
          )
          : (
            <>
              <CardHeading
                id="about-title"
                title={isSpanish
                  ? (
                    <>
                      QR bonitos.<br />
                      <span class="qr-marker">Sin rescate.</span>
                    </>
                  )
                  : (
                    <>
                      Nice QR codes.<br />
                      <span class="qr-marker">No ransom.</span>
                    </>
                  )}
                tagline={isSpanish
                  ? "Pega un link. Imprímelo grande. Para siempre."
                  : "Paste a link. Print it big. Keep it forever."}
              />

              <div class="qr-pitch-copy">
                <p>
                  {isSpanish
                    ? "La mayoría de los sitios de QR parecen un formulario de impuestos, esconden la descarga tras un registro y cobran cada mes mientras el código siga impreso. Deja de pagar y cada menú, sticker y póster se muere."
                    : "Most QR sites look like a tax form, hide the download behind a signup, then bill monthly for as long as the code is in print. Stop paying and every menu, sticker and poster goes dead."}
                </p>
                <p>
                  {isSpanish
                    ? "Me harté, así que hice QRBuddy."
                    : "I got sick of it, so I made QRBuddy."}
                </p>
                <ul class="qr-pitch-list">
                  {PITCH_ITEMS[locale].map((item) => <li key={item}>{item}
                  </li>)}
                </ul>
              </div>

              <div class="pt-1">
                <CardPrimaryButton onClick={() => handOff(openPricingModal)}>
                  {isSpanish ? "Pasaporte QRBuddy" : "QRBuddy Passport"}
                </CardPrimaryButton>
              </div>
            </>
          )}

        <CardSignature
          isSpanish={isSpanish}
          makerUrl={MAKER_URL}
          charm={PABLO_EMOJIS[emojiIdx]}
          onCharm={shuffleCharm}
        >
          {isIntro && (
            <>
              <CardDot />
              <CardQuietLink onClick={() => (aboutModalMode.value = "about")}>
                {isSpanish ? "Toda la historia →" : "The whole story →"}
              </CardQuietLink>
            </>
          )}
        </CardSignature>
      </CardBody>
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
      class={`inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-sm font-bold text-[#1e1714] shadow-chunky transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

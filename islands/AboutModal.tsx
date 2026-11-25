import { useState } from "preact/hooks";
import { signal } from "@preact/signals";
import {
  CardBody,
  CardHeading,
  CardModal,
  CardPrimaryButton,
  CardSignature,
} from "../components/modal/CardModal.tsx";
import { openPricingModal } from "./PricingModal.tsx";
import { MAKER_URL } from "../utils/constants.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { sounds } from "../utils/sounds.ts";

// Global signal for modal state
export const aboutModalOpen = signal(false);
export function openAboutModal() {
  aboutModalOpen.value = true;
}

export function closeAboutModal() {
  aboutModalOpen.value = false;
}

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
  const [emojiIdx, setEmojiIdx] = useState(0);

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
        {
          <>
            <CardHeading
              id="about-title"
              title={isSpanish
                ? (
                  <>
                    QR bonitos.
                    <span class="qr-marker">Sin rescate.</span>
                  </>
                )
                : (
                  <>
                    Nice QR codes.
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
                {PITCH_ITEMS[locale].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div class="pt-1">
              <CardPrimaryButton onClick={() => handOff(openPricingModal)}>
                {isSpanish ? "Pasaporte QRBuddy" : "QRBuddy Passport"}
              </CardPrimaryButton>
            </div>
          </>
        }

        <CardSignature
          isSpanish={isSpanish}
          makerUrl={MAKER_URL}
          charm={PABLO_EMOJIS[emojiIdx]}
          onCharm={shuffleCharm}
        >
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

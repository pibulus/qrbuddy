import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { CardModal, CardPrimaryButton } from "./modal/CardModal.tsx";
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

const PITCH_ITEMS = {
  en: [
    "8 print-ready palettes, custom logos & frames",
    "Editable links, photo slideshows & lockers",
    "Street-safe QR Inspector — unmask mystery codes",
    "Zero accounts, zero hostage links — free forever",
  ],
  es: [
    "8 paletas listas para imprimir, logos y marcos",
    "Links editables, galerías de fotos y buzones",
    "Inspector seguro — revela QRs sospechosos",
    "Cero cuentas, cero links secuestrados — gratis",
  ],
};

const PABLO_EMOJIS = ["☕", "🌴", "🍸", "🌮"];

// One modal at a time (the shell's scroll-lock is single-slot), so hand off
// to the next card after this one has let go.
function handOff(open: () => void) {
  closeAboutModal();
  setTimeout(open, 60);
}

function openInspectorFromAbout(isSpanish: boolean) {
  closeAboutModal();
  const g = globalThis as typeof globalThis & {
    __qrbInspectorListener?: boolean;
  };
  if (g.__qrbInspectorListener) {
    setTimeout(
      () => globalThis.dispatchEvent(new CustomEvent("qrb-open-inspector")),
      60,
    );
  } else if (typeof globalThis.location !== "undefined") {
    globalThis.location.href = isSpanish ? "/es?inspect=1" : "/?inspect=1";
  }
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

  const privacyHref = isSpanish ? "/privacy?lang=es" : "/privacy";
  const termsHref = isSpanish ? "/terms?lang=es" : "/terms";

  return (
    <CardModal
      open={isOpen}
      onClose={closeAboutModal}
      labelledby="about-title"
      badge="🌸"
      badgeClass="from-amber-200 via-pink-300 to-purple-400"
    >
      <div class="text-center space-y-4">
        <div class="space-y-1">
          <h2
            id="about-title"
            class="font-black text-2xl sm:text-[26px] tracking-tight leading-tight text-[#1e1714]"
          >
            {isIntro
              ? (
                isSpanish
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
                  )
              )
              : (
                isSpanish
                  ? (
                    <>
                      QRBuddy es lo <span class="qr-marker">máximo.</span>
                      <br />
                      Olvida el resto.
                    </>
                  )
                  : (
                    <>
                      QRBuddy’s the <span class="qr-marker">best.</span>
                      <br />
                      Kick out the rest.
                    </>
                  )
              )}
          </h2>
          <p class="text-base font-bold text-[#ec4899]">
            {isSpanish
              ? "Es rápido, divertido y ridículamente bueno."
              : "It’s fast, it’s fun, it’s freaky good."}
          </p>
        </div>

        <p class="qr-pitch-copy">
          {isSpanish
            ? "Otros generadores parecen errores de impresora y secuestran tus links con cobros mensuales. QRBuddy crea códigos hermosos, listos para imprimir y gratis para siempre."
            : "Other QR tools look like printer errors and hold links hostage behind monthly subscriptions. QRBuddy makes gorgeous, print-ready codes that stay free forever."}
        </p>

        <ul class="qr-pitch-list">
          {PITCH_ITEMS[locale].map((item) => <li key={item}>{item}</li>)}
        </ul>

        <div class="pt-1">
          {isIntro
            ? (
              <CardPrimaryButton onClick={closeAboutModal}>
                {isSpanish ? "Crear un código QR ✨" : "Make a QR code ✨"}
              </CardPrimaryButton>
            )
            : (
              <CardPrimaryButton onClick={() => handOff(openPricingModal)}>
                {isSpanish ? "Pasaporte QRBuddy" : "QRBuddy Passport"}
              </CardPrimaryButton>
            )}
        </div>

        {/* Signature row — matches TalkType Pitch Kit */}
        <p class="text-xs font-medium text-[#6f6158] flex items-center justify-center gap-1 flex-wrap pt-0.5">
          <span>{isSpanish ? "Hecho por" : "Made by"}</span>
          <a
            href={MAKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="font-bold text-[#1e1714] underline decoration-2 decoration-[#ec4899]/50 underline-offset-2 hover:text-[#ec4899] transition-colors"
          >
            Pablo
          </a>
          <button
            type="button"
            onClick={() => {
              setEmojiIdx((i) => (i + 1) % PABLO_EMOJIS.length);
              sounds.bloop?.();
            }}
            class="inline-block text-sm leading-none hover:scale-125 active:scale-95 transition-transform cursor-pointer select-none"
            aria-label="Change vibe"
          >
            {PABLO_EMOJIS[emojiIdx]}
          </button>
          <span>{isSpanish ? "en Melbourne" : "in Melbourne"}</span>
          <span aria-hidden="true">·</span>
          {isIntro
            ? (
              <button
                type="button"
                onClick={() => (aboutModalMode.value = "about")}
                class="font-bold text-[#1e1714] hover:text-[#ec4899] underline underline-offset-2 transition-colors"
              >
                {isSpanish ? "Toda la historia →" : "The whole story →"}
              </button>
            )
            : (
              <>
                <button
                  type="button"
                  onClick={() => openInspectorFromAbout(isSpanish)}
                  class="font-bold text-[#1e1714] hover:text-[#ec4899] underline underline-offset-2 transition-colors"
                >
                  {isSpanish ? "🔍 Revisar QR" : "🔍 Inspect QR"}
                </button>
                <span aria-hidden="true">·</span>
                <a
                  href={privacyHref}
                  class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
                >
                  {isSpanish ? "Privacidad" : "Privacy"}
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href={termsHref}
                  class="hover:text-[#1e1714] underline underline-offset-2 transition-colors"
                >
                  {isSpanish ? "Términos" : "Terms"}
                </a>
              </>
            )}
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

import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "./modal/CardModal.tsx";
import { openPricingModal } from "./PricingModal.tsx";
import { openKofiModal } from "./KofiModal.tsx";

// Global signal for modal state
export const aboutModalOpen = signal(false);
// "intro" = first-visit poster with the three punches; "about" = the manifesto.
export const aboutModalMode = signal<"intro" | "about">("about");

export function openAboutModal(mode: "intro" | "about" = "about") {
  aboutModalMode.value = mode;
  aboutModalOpen.value = true;
}

export function closeAboutModal() {
  aboutModalOpen.value = false;
}

const INTRO_SEEN_KEY = "qrbuddy_intro_seen";

// One modal at a time (the shell's scroll-lock is single-slot), so hand off
// to the next card after this one has let go.
function handOff(open: () => void) {
  closeAboutModal();
  setTimeout(open, 60);
}

export function AboutModal() {
  const isOpen = aboutModalOpen.value;
  const isIntro = aboutModalMode.value === "intro";

  // First visit: open once as the intro poster, after the page has had its
  // bloom-in moment. Never again after that.
  useEffect(() => {
    try {
      if (localStorage.getItem(INTRO_SEEN_KEY)) return;
      localStorage.setItem(INTRO_SEEN_KEY, "1");
      const t = setTimeout(() => openAboutModal("intro"), 1200);
      return () => clearTimeout(t);
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
          class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
        >
          QR codes are boring.
          <br />
          QRBuddy fixed that.
          <br />
          <span class="text-qr-pop">Drop a link. Watch it bloom.</span>
        </h2>

        {isIntro
          ? (
            <ul class="space-y-3 text-left">
              <li class="flex items-start gap-3">
                <span class="w-10 h-10 shrink-0 rounded-xl border-2 border-black bg-rose-100 flex items-center justify-center text-lg">
                  🎨
                </span>
                <span class="min-w-0 text-sm text-gray-800 leading-snug">
                  <span class="font-black block">Gorgeous by default</span>
                  8 gradients, a style dice, printable "SCAN ME" frames.
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="w-10 h-10 shrink-0 rounded-xl border-2 border-black bg-amber-100 flex items-center justify-center text-lg">
                  💣
                </span>
                <span class="min-w-0 text-sm text-gray-800 leading-snug">
                  <span class="font-black block">Codes with superpowers</span>
                  Self-destructing files, mixtapes, editable links, PIN'd
                  lockers.
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="w-10 h-10 shrink-0 rounded-xl border-2 border-black bg-purple-100 flex items-center justify-center text-lg">
                  🔍
                </span>
                <span class="min-w-0 text-sm text-gray-800 leading-snug">
                  <span class="font-black block">Reads them too</span>
                  Scan any code — then remake the ugly ones beautiful.
                </span>
              </li>
            </ul>
          )
          : (
            <div class="space-y-3 text-base leading-relaxed text-gray-800 font-medium">
              <p>
                Most QR codes look like printer errors and trap you in monthly
                subscriptions.
              </p>
              <p>
                QRBuddy makes them gorgeous, interactive, and{" "}
                <span class="font-black text-black">forever yours.</span>
              </p>
              <p class="font-black text-black">
                Free. Zero accounts. No hostage links.
              </p>
            </div>
          )}

        <div class="space-y-3 pt-1">
          <CardPrimaryButton onClick={closeAboutModal}>
            Make something 🌸
          </CardPrimaryButton>
          <div class="flex gap-2">
            <CardSecondaryButton onClick={() => handOff(openPricingModal)}>
              Supporter Pass
            </CardSecondaryButton>
            <CardSecondaryButton onClick={() => handOff(openKofiModal)}>
              Tip Jar ☕
            </CardSecondaryButton>
          </div>
          {isIntro
            ? (
              <button
                type="button"
                onClick={() => (aboutModalMode.value = "about")}
                class="text-xs font-bold text-gray-500 hover:text-qr-pop transition-colors min-h-[44px] px-2"
              >
                the whole story →
              </button>
            )
            : (
              <p class="text-xs text-gray-500 font-medium pt-1">
                Made by Pablo in Melbourne · No VC, no BS ·{" "}
                <a
                  href="https://github.com/pibulus/qrbuddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-black"
                >
                  GitHub
                </a>
              </p>
            )}
        </div>
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

import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";

// Global signal for modal state
export const aboutModalOpen = signal(false);
// "intro" = short first-visit poster; "about" = the full tour.
export const aboutModalMode = signal<"intro" | "about">("about");

export function openAboutModal(mode: "intro" | "about" = "about") {
  aboutModalMode.value = mode;
  aboutModalOpen.value = true;
}

export function closeAboutModal() {
  aboutModalOpen.value = false;
}

const INTRO_SEEN_KEY = "qrbuddy_intro_seen";

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeAboutModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── First-visit poster: mascot, rhyme, three punches, one CTA ───
  if (isIntro) {
    return (
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeAboutModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
      >
        <div
          class="relative w-full max-w-sm bg-qr-cream border-4 border-black rounded-3xl shadow-chunky-hover p-6 sm:p-8 space-y-5 animate-slide-up text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mini buddy */}
          <div class="flex justify-center">
            <div class="w-16 h-16 rounded-2xl border-3 border-black bg-gradient-to-br from-qr-sunset1 via-pink-400 to-purple-500 shadow-chunky animate-float flex items-center justify-center text-3xl select-none">
              🌸
            </div>
          </div>

          <div class="space-y-1.5">
            <h2
              id="intro-title"
              class="text-2xl sm:text-3xl font-black leading-tight text-gray-900"
            >
              QRBuddy makes 'em{" "}
              <span class="bg-pink-200 px-1.5 rounded-md">bloom.</span>
              <br />
              Boring squares? No room.
            </h2>
            <p class="text-sm sm:text-base font-bold text-pink-500">
              The prettiest QR codes on the internet — with superpowers.
            </p>
          </div>

          <ul class="space-y-3 text-left">
            <li class="flex items-start gap-3">
              <span class="w-10 h-10 shrink-0 rounded-xl border-2 border-black bg-rose-100 flex items-center justify-center text-lg">
                🎨
              </span>
              <span class="min-w-0 text-sm text-gray-800 leading-snug">
                <span class="font-black block">Gorgeous by default</span>
                7 gradients, a style dice, printable "SCAN ME" frames.
              </span>
            </li>
            <li class="flex items-start gap-3">
              <span class="w-10 h-10 shrink-0 rounded-xl border-2 border-black bg-amber-100 flex items-center justify-center text-lg">
                💣
              </span>
              <span class="min-w-0 text-sm text-gray-800 leading-snug">
                <span class="font-black block">Codes with superpowers</span>
                Self-destructing files, editable links, PIN'd file lockers.
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

          <div class="space-y-2 pt-1">
            <button
              type="button"
              onClick={closeAboutModal}
              class="w-full min-h-[52px] rounded-full border-3 border-black bg-gradient-to-r from-qr-sunset1 via-pink-400 to-purple-400 px-6 py-3 text-lg font-black text-black shadow-chunky hover:scale-[1.02] hover:shadow-chunky-hover active:scale-[0.97] transition-all"
            >
              Make something 🌸
            </button>
            <button
              type="button"
              onClick={() => (aboutModalMode.value = "about")}
              class="text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors min-h-[44px] px-2"
            >
              see everything it does →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeAboutModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-md sm:max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-4 sm:p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between mb-2">
              <h2
                id="about-modal-title"
                class="text-2xl sm:text-3xl font-black text-black"
              >
                About QRBuddy
              </h2>
              <button
                type="button"
                onClick={closeAboutModal}
                class="text-3xl leading-none font-bold text-black transition-transform hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close about dialog"
              >
                ×
              </button>
            </div>
            <p class="text-base sm:text-lg font-bold text-purple-900">
              QR codes that spark joy. Drop a link, watch it bloom. 🌈
            </p>
          </div>

          {/* Content */}
          <div class="p-4 sm:p-8 bg-qr-cream border-4 border-black rounded-b-3xl shadow-chunky space-y-6">
            {/* Intro */}
            <div class="space-y-3">
              <p class="text-base leading-relaxed text-gray-800">
                Hi, I'm Pablo 👋. QR codes are boring. They don't have to be.
              </p>
              <p class="text-base leading-relaxed text-gray-800">
                A QR code is just a doorway — and a doorway can lead to a
                gallery, a mixtape, a secret that burns after reading, or a
                locker your friends drop files into. QRBuddy makes all of those,
                and makes them gorgeous.
              </p>
            </div>

            {/* What it does */}
            <div class="py-4 px-4 bg-gradient-to-r from-pink-100 to-purple-100 border-3 border-black rounded-xl">
              <p class="text-base font-black text-gray-800 mb-2">
                ✨ What a QR can be:
              </p>

              <ul class="text-sm space-y-2 text-gray-800">
                <li>
                  <span class="font-bold">🎨 Art:</span>{" "}
                  7 gradient styles, a custom builder, a dice that rolls fresh
                  combos (and never rolls an unscannable one), your logo in the
                  middle, and "SCAN ME" frames ready to print.
                </li>
                <li>
                  <span class="font-bold">💣 A secret:</span>{" "}
                  Files that self-destruct after 1 download. Notes that live
                  inside the code itself — no internet needed to read them.
                </li>
                <li>
                  <span class="font-bold">🪣 A mailbox:</span>{" "}
                  Lockers people scan to drop files into — PIN-protected,
                  reusable, or ping-pong (like AirDrop, but it's a poster).
                </li>
                <li>
                  <span class="font-bold">🔗 Mistake-proof:</span>{" "}
                  Editable codes — change where they point anytime, no
                  reprinting. Add scan limits, expiry dates, link rotation, or
                  an intro page.
                </li>
                <li>
                  <span class="font-bold">📶 Useful:</span>{" "}
                  WiFi passwords, contact cards, pre-filled texts and emails —
                  plus bulk-create a whole ZIP of codes from a list.
                </li>
                <li>
                  <span class="font-bold">🔍 A reader too:</span>{" "}
                  Drop in any QR image or screenshot (or use your camera) to see
                  what it says — then remake the ugly ones beautiful.
                </li>
                <li>
                  <span class="font-bold">🌱 Yours forever:</span>{" "}
                  Free. No accounts. Your codes never die because you stopped
                  paying — looking at you, subscription QR industry. Only
                  coarse, IP-free stats, and only for your own dashboard.
                </li>
              </ul>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={closeAboutModal}
              class="w-full min-h-[52px] bg-black text-white text-lg font-black rounded-xl border-3 border-black shadow-chunky hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Make something 🌸
            </button>

            {/* Footer / Made by */}
            <div class="pt-6 border-t-3 border-black space-y-4">
              <p class="text-base font-medium text-gray-800 text-center">
                Made with ❤️ in Melbourne. No VC funding. No corporate BS.<br />
                Just nice tools for nice people.
              </p>

              <div class="flex justify-center">
                <a
                  href="https://github.com/pibulus/qrbuddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] bg-white text-black border-3 border-black rounded-xl font-bold transition-all hover:scale-105 shadow-chunky"
                >
                  💻 GitHub
                </a>
              </div>
            </div>
          </div>

          {/* ESC hint */}
          <div class="text-center mt-4">
            <p class="text-xs text-gray-400">
              Press ESC or click outside to close
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes modal-in {
            0% {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .animate-modal-in {
            animation: modal-in 0.3s ease-out forwards;
          }
        `}
      </style>
    </>
  );
}

// About Link Button
interface AboutLinkProps {
  label?: string;
  className?: string;
}

export function AboutLink({
  label = "About 🌈",
  className = "",
}: AboutLinkProps) {
  return (
    <button
      type="button"
      onClick={openAboutModal}
      class={`px-4 min-h-[44px] inline-flex items-center justify-center text-sm bg-white text-black border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

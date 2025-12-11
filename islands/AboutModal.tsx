import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";

// Global signal for modal state
export const aboutModalOpen = signal(false);

export function openAboutModal() {
  aboutModalOpen.value = true;
}

export function closeAboutModal() {
  aboutModalOpen.value = false;
}

export function AboutModal() {
  const isOpen = aboutModalOpen.value;

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

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={closeAboutModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        {/* Modal */}
        <div
          class="relative w-[95%] max-w-md sm:max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
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
                Hi, I'm Pablo 👋. Most QR generators are ugly, static, and feel
                like enterprise software from 1999. I hated that.
              </p>
              <p class="text-base leading-relaxed text-gray-800">
                So I built QRBuddy. It’s a tool for humans, not data points. It
                turns QR codes from boring squares into living, breathing
                interactions.
              </p>
            </div>

            {/* What it does */}
            <div class="py-4 px-4 bg-gradient-to-r from-pink-100 to-purple-100 border-3 border-black rounded-xl">
              <p class="text-base font-black text-gray-800 mb-2">
                ✨ What it does:
              </p>

              <ul class="text-sm space-y-2 text-gray-800">
                <li>
                  <span class="font-bold">Dynamic Codes:</span>{" "}
                  Want a code that shows a video on the first scan, a meme on
                  the second? Done.
                </li>
                <li>
                  <span class="font-bold">Ping Pong Drops:</span>{" "}
                  Like AirDrop for the web. Scan to upload, scan to download.
                  Back and forth.
                </li>
                <li>
                  <span class="font-bold">Self-Destruct Mode:</span>{" "}
                  Create password-protected "Dead Drops" or files that
                  self-destruct.
                </li>
                <li>
                  <span class="font-bold">Mistake-Proof Links:</span>{" "}
                  Change the destination anytime without reprinting.
                </li>
                <li>
                  <span class="font-bold">Zero-Creep Analytics:</span>{" "}
                  Ethical data only. I don't want your personal info.
                </li>
                <li>
                  <span class="font-bold">No Boring Squares:</span>{" "}
                  6 sunset-drenched presets. Make them match your vibe.
                </li>
                <li>
                  <span class="font-bold">Always Ready:</span>{" "}
                  Installs as a PWA. Works offline.
                </li>
              </ul>
            </div>

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
                  class="inline-flex items-center gap-2 px-4 py-2 bg-white text-black border-3 border-black rounded-xl font-bold transition-all hover:scale-105 shadow-chunky"
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
      class={`px-4 py-2 text-sm bg-white text-black border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

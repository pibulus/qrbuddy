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
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);"
        onClick={closeAboutModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-2xl animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between mb-2">
              <h2
                id="about-modal-title"
                class="text-3xl font-black text-black"
              >
                About QRBuddy
              </h2>
              <button
                type="button"
                onClick={closeAboutModal}
                class="text-3xl leading-none font-bold text-black transition-transform hover:scale-110"
                aria-label="Close about dialog"
              >
                ×
              </button>
            </div>
            <p class="text-lg font-bold text-purple-900">
              Drop a link. Watch it bloom. 🌈
            </p>
          </div>

          {/* Content */}
          <div class="p-8 bg-qr-cream border-4 border-black rounded-b-3xl shadow-chunky space-y-6">
            {/* Story */}
            <p class="text-lg leading-relaxed text-gray-800">
              QRBuddy is The Porkbun of QR generators. I got tired of boring
              black-and-white squares, so I built this. Beautiful gradient QR
              codes with personality, privacy-first dynamic redirects, and
              destructible one-time links. No tracking. No analytics. Just QR
              codes that make you smile.
            </p>

            {/* Features */}
            <div class="py-4 px-4 bg-gradient-to-r from-pink-100 to-purple-100 border-3 border-black rounded-xl">
              <p class="text-base font-semibold text-gray-800 mb-2">
                ✨ What it does:
              </p>
              <ul class="text-sm space-y-1 text-gray-700">
                <li>• 6 gorgeous gradient presets + custom creator</li>
                <li>• Dynamic QR codes you can edit anytime</li>
                <li>• Destructible links that self-destruct after 1 scan</li>
                <li>• Privacy-first (zero tracking or analytics)</li>
                <li>• Works offline as a PWA</li>
              </ul>
            </div>

            {/* Links */}
            <div class="pt-2">
              <div class="flex flex-wrap gap-3 justify-center">
                {/* <a
                  href="https://pibul.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-3 border-black rounded-xl font-bold transition-all hover:scale-105 shadow-chunky"
                >
                  🌐 Portfolio
                </a> */}
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

            {/* Footer */}
            <div class="pt-4 text-center border-t-3 border-black">
              <p class="text-xs text-gray-600">
                Made in Melbourne with 🧁 by Pablo
              </p>
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

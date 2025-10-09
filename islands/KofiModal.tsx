import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";

// Global signal for modal state
export const kofiModalOpen = signal(false);

export function openKofiModal() {
  kofiModalOpen.value = true;
}

export function closeKofiModal() {
  kofiModalOpen.value = false;
}

interface KofiModalProps {
  kofiUsername: string;
  title?: string;
  description?: string;
}

export function KofiModal({
  kofiUsername,
  title = "Support QRBuddy ☕",
  description = "Keep this free and blooming for everyone! 🌈",
}: KofiModalProps) {
  const isOpen = kofiModalOpen.value;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeKofiModal();
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
        onClick={closeKofiModal}
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-2xl animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between mb-2">
              <h2 class="text-2xl font-black text-black">
                {title}
              </h2>
              <button
                type="button"
                onClick={closeKofiModal}
                class="text-3xl leading-none font-bold text-black transition-transform hover:scale-110"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p class="text-sm font-semibold text-purple-900">
              {description}
            </p>
          </div>

          {/* Ko-fi Embed */}
          <div class="border-4 border-black rounded-b-3xl overflow-hidden shadow-chunky bg-qr-cream">
            <iframe
              src={`https://ko-fi.com/${kofiUsername}/?hidefeed=true&widget=true&embed=true`}
              style="border: none; width: 100%; height: 600px; background: transparent;"
              title="Ko-fi donation"
            />
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

// Ko-fi Button
interface KofiButtonProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function KofiButton({
  label = "☕ Support",
  size = "md",
}: KofiButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      type="button"
      onClick={openKofiModal}
      class={`inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 ${sizeClasses[size]}`}
    >
      <span>{label}</span>
    </button>
  );
}

import { signal } from "@preact/signals";
import { CardModal } from "./modal/CardModal.tsx";

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
  title = "Tip the Tip Jar ☕",
  description = "Keeps QRBuddy free and blooming for everyone.",
}: KofiModalProps) {
  const isOpen = kofiModalOpen.value;

  return (
    <CardModal
      open={isOpen}
      onClose={closeKofiModal}
      labelledby="kofi-modal-title"
      badge="☕"
      badgeClass="from-amber-200 via-orange-300 to-qr-pop"
      maxWidthClass="max-w-[480px]"
      padClass="p-6 sm:p-8 pb-0 sm:pb-0"
    >
      <div class="text-center space-y-1.5 mb-4">
        <h2
          id="kofi-modal-title"
          class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
        >
          {title}
        </h2>
        <p class="text-base font-bold text-qr-pop">{description}</p>
      </div>

      {/* Ko-fi embed bleeds to the card edge — the card is the frame */}
      <div class="-mx-6 sm:-mx-8 border-t-4 border-black rounded-b-[20px] overflow-hidden bg-white">
        <iframe
          src={`https://ko-fi.com/${kofiUsername}/?hidefeed=true&widget=true&embed=true`}
          style="border: none; width: 100%; height: 560px; background: transparent;"
          title="Ko-fi donation"
        />
      </div>
    </CardModal>
  );
}

// Ko-fi Button
interface KofiButtonProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function KofiButton({
  label = "Tip Jar ☕",
  size = "md",
}: KofiButtonProps) {
  const sizeClasses = {
    sm: "px-4 min-h-[44px] text-sm",
    md: "px-5 min-h-[48px] text-base",
    lg: "px-6 min-h-[52px] text-lg",
  };

  return (
    <button
      type="button"
      onClick={openKofiModal}
      class={`inline-flex items-center justify-center rounded-full border-2 border-black bg-white text-black font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 ${
        sizeClasses[size]
      }`}
    >
      {label}
    </button>
  );
}

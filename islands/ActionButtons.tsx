import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";

interface ActionButtonsProps {
  triggerDownload: Signal<boolean>;
  url?: Signal<string>;
  style?: Signal<string>;
}

export default function ActionButtons(
  { triggerDownload, url, style }: ActionButtonsProps,
) {
  const handleDownload = () => {
    haptics.medium();
    sounds.click();
    triggerDownload.value = true;
  };

  const handleShare = async () => {
    if (!url || !style) return;

    // Immediate feedback
    haptics.copy();
    sounds.copy();

    const shareUrl = `${globalThis.location.origin}/q?d=${
      encodeURIComponent(url.value)
    }&s=${style.value}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast("Share link copied! 🔗");
      haptics.success();
      sounds.success();
    } catch (err) {
      console.error("Failed to copy share URL:", err);
      addToast("Failed to copy link 😅", 3000);
      haptics.error();
      sounds.error();
    }
  };

  const [showOptions, setShowOptions] = useState(false);

  return (
    <div class="flex gap-3">
      {/* Primary Action - Download */}
      <button
        type="button"
        onClick={handleDownload}
        class="
          flex-1 px-6 py-3 text-lg font-bold
          bg-black text-white
          rounded-xl border-3 border-black
          hover:bg-gray-800 hover:scale-105
          active:scale-95 active:animate-squish
          transition-all duration-200
        "
      >
        Download
      </button>

      {/* Share Button */}
      {url && style && (
        <button
          type="button"
          onClick={handleShare}
          class="
            flex-1 px-6 py-3 text-lg font-bold
            bg-white text-black border-3 border-black
            hover:bg-gray-50 hover:scale-105
            active:scale-95 active:animate-squish
            transition-all duration-200
          "
        >
          Share
        </button>
      )}
    </div>
  );
}

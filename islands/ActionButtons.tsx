import { Signal } from "@preact/signals";
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

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        class="
          flex-1 px-6 py-4 text-lg font-chunky
          bg-white text-black
          rounded-chunky border-4 border-black shadow-chunky
          hover:shadow-chunky-hover hover:scale-105 hover:bg-gray-50
          active:scale-95 active:animate-squish
          transition-all duration-200
          group
        "
      >
        <span class="inline-flex items-center gap-2">
          Save it
          <span class="group-hover:animate-bounce">💾</span>
        </span>
      </button>

      {url && style && (
        <button
          type="button"
          onClick={handleShare}
          class="
            flex-1 px-6 py-4 text-lg font-chunky
            bg-gradient-to-r from-qr-pool1 to-qr-pool2 text-white
            rounded-chunky border-4 border-black shadow-chunky
            hover:shadow-chunky-hover hover:scale-105 hover:brightness-110
            active:scale-95 active:animate-squish
            transition-all duration-200
            relative group
          "
        >
          <span class="inline-flex items-center gap-2">
            Share
            <span class="group-hover:animate-bounce">🚀</span>
          </span>
        </button>
      )}
    </>
  );
}

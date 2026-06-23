import { Signal } from "@preact/signals";
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";

interface ActionButtonsProps {
  triggerDownload: Signal<boolean>;
  url?: Signal<string>;
}

export default function ActionButtons(
  { triggerDownload, url }: ActionButtonsProps,
) {
  const handleDownload = () => {
    haptics.medium();
    sounds.click();
    triggerDownload.value = true;
  };

  const handleCopyUrl = async () => {
    if (!url?.value) return;

    // Immediate feedback
    haptics.copy();
    sounds.copy();

    try {
      await navigator.clipboard.writeText(url.value);
      addToast("URL copied! 📋");
      haptics.success();
      sounds.success();
    } catch (err) {
      console.error("Failed to copy URL:", err);
      addToast("Failed to copy URL 😅", 3000);
      haptics.error();
      sounds.error();
    }
  };

  return (
    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {/* Primary Action - Download */}
      <button
        type="button"
        onClick={handleDownload}
        class="
          group flex-1 px-6 py-4 text-lg font-black
          bg-gradient-to-br from-gray-900 to-black text-white
          rounded-2xl border-3 border-black
          shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
          hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]
          hover:translate-x-[-2px] hover:translate-y-[-2px]
          hover:from-pink-600 hover:to-purple-600
          active:translate-x-[2px] active:translate-y-[2px]
          active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
          transition-all duration-150
          flex items-center justify-center gap-2
        "
      >
        <span class="group-hover:scale-110 transition-transform">⬇</span>
        Download
      </button>

      {/* Copy URL Button */}
      {url && (
        <button
          type="button"
          onClick={handleCopyUrl}
          class="
            group flex-1 px-6 py-4 text-lg font-black
            bg-gradient-to-br from-blue-600 to-purple-600 text-white
            rounded-2xl border-3 border-black
            shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
            hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[-2px] hover:translate-y-[-2px]
            hover:from-blue-700 hover:to-purple-700
            active:translate-x-[2px] active:translate-y-[2px]
            active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-150
            flex items-center justify-center gap-2
          "
        >
          <span class="group-hover:scale-110 transition-transform">📋</span>
          Copy URL
        </button>
      )}
    </div>
  );
}

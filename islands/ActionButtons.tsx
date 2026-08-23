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
  const handleDownloadPng = () => {
    haptics.medium();
    sounds.click();
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", { detail: { format: "png" } }),
    );
  };

  const handleDownloadSvg = () => {
    haptics.medium();
    sounds.click();
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", { detail: { format: "svg" } }),
    );
    addToast("SVG vector exported! 📐");
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
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
      {/* Primary Action - Download PNG */}
      <button
        type="button"
        onClick={handleDownloadPng}
        class="
          group px-4 py-3.5 text-base sm:text-lg font-black
          bg-gradient-to-br from-gray-900 to-black text-white
          rounded-2xl border-3 border-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
          hover:translate-x-[-2px] hover:translate-y-[-2px]
          hover:from-pink-600 hover:to-purple-600
          active:translate-x-[2px] active:translate-y-[2px]
          active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition-all duration-150
          flex items-center justify-center gap-1.5
        "
        title="Download high-res PNG image"
      >
        <span class="group-hover:scale-110 transition-transform">⬇</span>
        <span>PNG</span>
      </button>

      {/* Vector Action - Download SVG */}
      <button
        type="button"
        onClick={handleDownloadSvg}
        class="
          group px-4 py-3.5 text-base sm:text-lg font-black
          bg-white text-gray-900
          rounded-2xl border-3 border-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
          hover:translate-x-[-2px] hover:translate-y-[-2px]
          hover:bg-yellow-100
          active:translate-x-[2px] active:translate-y-[2px]
          active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition-all duration-150
          flex items-center justify-center gap-1.5
        "
        title="Download scalable vector SVG for print shops"
      >
        <span class="group-hover:scale-110 transition-transform">📐</span>
        <span>SVG</span>
      </button>

      {/* Copy URL Button */}
      {url && (
        <button
          type="button"
          onClick={handleCopyUrl}
          class="
            group col-span-2 sm:col-span-1 px-4 py-3.5 text-base sm:text-lg font-black
            bg-gradient-to-br from-blue-600 to-purple-600 text-white
            rounded-2xl border-3 border-black
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[-2px] hover:translate-y-[-2px]
            hover:from-blue-700 hover:to-purple-700
            active:translate-x-[2px] active:translate-y-[2px]
            active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-150
            flex items-center justify-center gap-1.5
          "
        >
          <span class="group-hover:scale-110 transition-transform">📋</span>
          <span>Copy</span>
        </button>
      )}
    </div>
  );
}

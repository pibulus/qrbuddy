import { Signal, useSignal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "./GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";

interface StyleSelectorProps {
  style: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
}

const STYLE_DISPLAY = {
  sunset: { name: "Sunset", colors: ["#FFE5B4", "#FF69B4", "#9370DB"] },
  pool: { name: "Pool", colors: ["#87CEEB", "#4ECDC4"] },
  terminal: { name: "Matrix", colors: ["#00FF41", "#0A0A0A"] },
  candy: { name: "Candy", colors: ["#FF69B4", "#FFD700", "#4ECDC4"] },
  vapor: { name: "Vapor", colors: ["#FF00FF", "#00FFFF"] },
  noir: { name: "Classic", colors: ["#1A1A1A", "#FAFAFA"] },
  brutalist: { name: "Brutal", colors: ["#000000", "#FFFF00"] },
};

export default function StyleSelector(
  { style, customStyle }: StyleSelectorProps,
) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isCreatorOpen = useSignal(false);

  const handleStyleSelect = (s: string) => {
    style.value = s;
    haptics.light();
    sounds.click();
    setIsGalleryOpen(false);
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

  const currentStyleInfo = style.value === "custom"
    ? { name: "Custom", colors: ["#9370DB", "#FF69B4"] }
    : STYLE_DISPLAY[style.value as keyof typeof STYLE_DISPLAY];

  const getGradientPreview = (colors: string[]) => {
    return `linear-gradient(45deg, ${colors.join(", ")})`;
  };

  return (
    <>
      <div class="relative">
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsGalleryOpen(true);
            haptics.light();
            sounds.click();
          }}
          class="
            flex items-center gap-2 px-4 py-2.5
            bg-white border-3 border-black rounded-xl
            hover:bg-gray-50
            transition-all duration-200
            hover:scale-105 active:scale-95
            shadow-md hover:shadow-lg
          "
        >
          <div
            class="w-5 h-5 rounded border-2 border-black"
            style={{ background: getGradientPreview(currentStyleInfo.colors) }}
          />
          <span class="font-bold text-black hidden sm:inline">
            {currentStyleInfo.name}
          </span>
          <span class="text-sm font-bold hidden sm:inline">
            ▼
          </span>
        </button>
      </div>

      {/* Style Gallery Modal */}
      {isGalleryOpen && (
        <div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsGalleryOpen(false)}
          />
          <div class="relative z-10 w-full max-w-lg bg-white border-4 border-black rounded-3xl shadow-2xl p-6 space-y-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-pink-500 font-bold">
                  Style Gallery
                </p>
                <p class="text-2xl font-black text-gray-900 leading-tight">
                  Pick your Vibe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Grid */}
            <div class="grid grid-cols-2 gap-3">
              {Object.entries(STYLE_DISPLAY).map(([key, info]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleStyleSelect(key)}
                  class={`
                    relative group overflow-hidden rounded-2xl border-3 transition-all duration-200
                    ${
                    style.value === key
                      ? "border-black scale-[1.02] shadow-chunky"
                      : "border-gray-200 hover:border-black hover:scale-[1.02] hover:shadow-lg"
                  }
                  `}
                >
                  {/* Preview Background */}
                  <div
                    class="absolute inset-0 z-0"
                    style={{ background: getGradientPreview(info.colors) }}
                  />

                  {/* Content Overlay */}
                  <div class="relative z-10 p-4 h-24 flex flex-col justify-end">
                    <span class="font-black text-white text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                      {info.name}
                    </span>
                    {style.value === key && (
                      <span class="absolute top-3 right-3 bg-white text-black text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {/* Custom Style Card */}
              <button
                type="button"
                onClick={() => {
                  isCreatorOpen.value = true;
                  haptics.medium();
                  sounds.click();
                  setIsGalleryOpen(false);
                }}
                class={`
                  relative group overflow-hidden rounded-2xl border-3 border-dashed border-gray-300 
                  hover:border-black hover:border-solid hover:scale-[1.02] hover:shadow-lg transition-all duration-200
                  bg-gray-50 flex flex-col items-center justify-center h-24 gap-1
                  ${
                  style.value === "custom"
                    ? "border-black border-solid shadow-chunky bg-white"
                    : ""
                }
                `}
              >
                <span class="text-2xl">🎨</span>
                <span class="font-bold text-gray-900">Custom</span>
              </button>
            </div>

            <div class="flex justify-center">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                class="px-8 py-3 rounded-xl bg-black text-white font-bold hover:scale-105 transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Gradient Creator Modal */}
      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}

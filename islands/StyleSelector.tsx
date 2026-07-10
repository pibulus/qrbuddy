import { Signal, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "./GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { addToast } from "./ToastManager.tsx";

interface StyleSelectorProps {
  style: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  isHidden?: Signal<boolean>;
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
  { style, customStyle, isHidden }: StyleSelectorProps,
) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isCreatorOpen = useSignal(false);

  // Close the style gallery on Escape (matches the other dialogs).
  useEffect(() => {
    if (!isGalleryOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsGalleryOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isGalleryOpen]);

  if (isHidden?.value) return null;

  const handleStyleSelect = (s: string) => {
    style.value = s;
    haptics.light();
    sounds.click();
    setIsGalleryOpen(false);
    addToast(`🎨 ${STYLE_DISPLAY[s as keyof typeof STYLE_DISPLAY].name}`);
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

  // 🎲 Roll a random vivid gradient. Hues are picked a third of the wheel
  // apart so the combo always has contrast-with-harmony; light backgrounds
  // keep the QR scannable.
  const DICE_QUIPS = [
    "Ooh, spicy 🌶️",
    "The dice have spoken 🎲",
    "Certified fresh combo ✨",
    "This one's got soul 🎷",
    "Chaos, but make it pretty 💅",
    "Nat 20 energy 🐉",
  ];

  const handleDiceRoll = () => {
    if (!customStyle) return;
    const baseHue = Math.floor(Math.random() * 360);
    const spread = 80 + Math.floor(Math.random() * 100); // 80–180° apart
    const hues = [baseHue, (baseHue + spread) % 360];
    // Two stops only, with luma-aware lightness: yellows/greens/cyans read
    // far lighter than blues/purples at the same HSL lightness, and a washed
    // finder pattern in any corner kills scannability (verified with the
    // built-in reader — the dice must never roll an unscannable QR).
    const lightnessFor = (h: number) =>
      h >= 40 && h <= 200
        ? 26 + Math.floor(Math.random() * 8)
        : 34 + Math.floor(Math.random() * 12);
    const stops = hues.map((h, i) => ({
      offset: i / (hues.length - 1),
      color: `hsl(${h}, ${65 + Math.floor(Math.random() * 20)}%, ${
        lightnessFor(h)
      }%)`,
    }));
    const gradient = {
      type: "linear" as const,
      rotation: Math.random() * Math.PI,
      colorStops: stops,
    };
    customStyle.value = {
      dots: { type: "gradient", gradient },
      background: { color: `hsl(${baseHue}, 60%, 96%)` },
      cornersSquare: { gradient },
      cornersDot: { gradient },
    };
    style.value = "custom";
    haptics.medium();
    sounds.click();
    addToast(DICE_QUIPS[Math.floor(Math.random() * DICE_QUIPS.length)]);
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
          aria-label={`Select QR style, current: ${currentStyleInfo.name}`}
          aria-haspopup="dialog"
          aria-expanded={isGalleryOpen}
          class="
            flex items-center gap-2 px-4 py-3
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

      {/* Style Gallery — bottom sheet on mobile, centered card on desktop */}
      {isGalleryOpen && (
        <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsGalleryOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-gallery-title"
            class="relative z-10 w-full max-w-lg bg-white sm:border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-6 animate-slide-up sm:animate-pop-in max-h-[92dvh] overflow-y-auto"
          >
            {/* Header */}
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-pink-600 font-bold">
                  Style Gallery
                </p>
                <p
                  id="style-gallery-title"
                  class="text-2xl font-black text-gray-900 leading-tight"
                >
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
                    <span
                      class="font-black text-white text-xl"
                      style="text-shadow: 0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6)"
                    >
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

              {/* Dice — random gradient, stays open for re-rolls */}
              <button
                type="button"
                onClick={handleDiceRoll}
                class="relative group overflow-hidden rounded-2xl border-3 border-gray-200 hover:border-black hover:scale-[1.02] hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200 flex flex-col items-center justify-center h-24 gap-1"
              >
                <span class="text-2xl group-hover:rotate-[360deg] transition-transform duration-500">
                  🎲
                </span>
                <span class="font-bold text-gray-900">Surprise me</span>
              </button>

              {/* Custom — full-width "build your own" bar closes the grid */}
              <button
                type="button"
                onClick={() => {
                  isCreatorOpen.value = true;
                  haptics.medium();
                  sounds.click();
                  setIsGalleryOpen(false);
                }}
                class={`
                  col-span-2 relative group overflow-hidden rounded-2xl border-3 border-dashed border-gray-300
                  hover:border-black hover:border-solid hover:scale-[1.01] hover:shadow-lg transition-all duration-200
                  bg-gray-50 flex items-center justify-center h-16 gap-2
                  ${
                  style.value === "custom"
                    ? "border-black border-solid shadow-chunky bg-white"
                    : ""
                }
                `}
              >
                <span class="text-2xl">🎨</span>
                <span class="font-bold text-gray-900">
                  Build your own gradient
                </span>
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

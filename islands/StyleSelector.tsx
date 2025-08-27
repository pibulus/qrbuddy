import { Signal, useSignal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "./GradientCreator.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";

interface StyleSelectorProps {
  style: Signal<string>;
  customStyle?: Signal<any>;
}

const STYLE_DISPLAY = {
  sunset: { name: "Sunset", colors: ["#FFE5B4", "#FF69B4", "#9370DB"] },
  pool: { name: "Pool", colors: ["#87CEEB", "#4ECDC4"] },
  terminal: { name: "Matrix", colors: ["#00FF41", "#0A0A0A"] },
  candy: { name: "Candy", colors: ["#FF69B4", "#FFD700", "#4ECDC4"] },
  vapor: { name: "Vapor", colors: ["#FF00FF", "#00FFFF"] },
  brutalist: { name: "Brutal", colors: ["#000000", "#FFFF00"] },
};

export default function StyleSelector({ style, customStyle }: StyleSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const isCreatorOpen = useSignal(false);

  const handleStyleSelect = (s: string) => {
    style.value = s;
    haptics.light();
    sounds.click();
    setShowAll(false);
  };

  const handleCustomGradient = (gradient: any) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = 'custom';
    }
  };

  const currentStyleInfo = style.value === 'custom' 
    ? { name: "Custom", colors: ["#9370DB", "#FF69B4"] }
    : STYLE_DISPLAY[style.value as keyof typeof STYLE_DISPLAY];

  const getGradientPreview = (colors: string[]) => {
    return `linear-gradient(45deg, ${colors.join(', ')})`;
  };

  return (
    <>
      <div class="relative">
        {/* Current Style Display - Compact */}
        <button
          onClick={() => {
            setShowAll(!showAll);
            haptics.light();
            sounds.click();
          }}
          class="
            flex items-center gap-2 px-4 py-2
            bg-white border-2 border-gray-300 rounded-lg
            hover:border-black
            transition-all duration-200
            hover:scale-105 active:scale-95
          "
        >
          <div 
            class="w-6 h-6 rounded border border-black"
            style={{ background: getGradientPreview(currentStyleInfo.colors) }}
          />
          <span class="font-medium">
            {currentStyleInfo.name}
          </span>
          <span class={`text-xs transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Expanded Style Grid */}
        {showAll && (
          <div class="absolute top-full mt-2 left-0 right-0 z-20 animate-slide-down">
            <div class="grid grid-cols-3 gap-2 p-3 bg-white rounded-lg border-2 border-black shadow-lg">
              {Object.entries(STYLE_DISPLAY).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleStyleSelect(key)}
                  class={`
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    transition-all duration-200
                    hover:scale-105 hover:shadow-md
                    ${style.value === key 
                      ? 'bg-black text-white shadow-md' 
                      : 'bg-white border border-gray-300 hover:border-black'
                    }
                  `}
                >
                  <div 
                    class="w-4 h-4 rounded-full border border-gray-400"
                    style={{ background: getGradientPreview(info.colors) }}
                  />
                  <span class="text-sm font-medium">
                    {info.name}
                  </span>
                </button>
              ))}
              
              {/* Custom Style Button */}
              <button
                onClick={() => {
                  isCreatorOpen.value = true;
                  haptics.medium();
                  sounds.click();
                  setShowAll(false);
                }}
                class={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  transition-all duration-200
                  hover:scale-105 hover:shadow-md
                  ${style.value === 'custom'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 hover:border-black hover:from-purple-100 hover:to-pink-100'
                  }
                `}
              >
                <div class="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                <span class="text-sm font-medium">
                  Custom
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Gradient Creator Modal */}
      <GradientCreator 
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}
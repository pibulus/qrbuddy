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
          <span class="font-bold text-black">
            {currentStyleInfo.name}
          </span>
          <span class={`text-sm font-bold transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Expanded Style Grid */}
        {showAll && (
          <div class="absolute top-full mt-2 right-0 z-20 animate-slide-down">
            <div class="bg-white rounded-xl border-3 border-black shadow-xl p-2 min-w-[200px]">
              <div class="space-y-1">
                {Object.entries(STYLE_DISPLAY).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => handleStyleSelect(key)}
                    class={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      transition-all duration-200
                      hover:bg-gray-100
                      ${style.value === key 
                        ? 'bg-black text-white' 
                        : 'text-black hover:translate-x-1'
                      }
                    `}
                  >
                    <div 
                      class="w-5 h-5 rounded border-2 border-black flex-shrink-0"
                      style={{ background: getGradientPreview(info.colors) }}
                    />
                    <span class="font-medium text-left">
                      {info.name}
                    </span>
                  </button>
                ))}
                
                {/* Divider */}
                <div class="border-t-2 border-gray-200 my-1"></div>
                
                {/* Custom Style Button */}
                <button
                  onClick={() => {
                    isCreatorOpen.value = true;
                    haptics.medium();
                    sounds.click();
                    setShowAll(false);
                  }}
                  class={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-all duration-200
                    ${style.value === 'custom'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-black hover:bg-gray-100 hover:translate-x-1'
                    }
                  `}
                >
                  <div class="w-5 h-5 rounded border-2 border-black bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0" />
                  <span class="font-medium text-left">
                    Custom
                  </span>
                </button>
              </div>
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
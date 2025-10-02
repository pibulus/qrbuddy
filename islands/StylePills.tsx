import { Signal, useSignal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import GradientCreator from "./GradientCreator.tsx";
import type { QRStyle } from "../types/qr-types.ts";

interface StylePillsProps {
  style: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
}

export default function StylePills({ style, customStyle }: StylePillsProps) {
  const isCreatorOpen = useSignal(false);

  const handleStyleSelect = (s: string) => {
    style.value = s;
    haptics.light();
    sounds.click();
  };

  const handleCustomGradient = (gradient: QRStyle) => {
    if (customStyle) {
      customStyle.value = gradient;
      style.value = "custom";
    }
  };

  return (
    <>
      <div class="flex flex-wrap gap-3 justify-center">
        {["sunset", "pool", "terminal", "candy", "vapor", "brutalist"].map((
          s,
        ) => (
          <button
            type="button"
            key={s}
            onClick={() => handleStyleSelect(s)}
            class={`
              px-4 py-2 min-h-[44px] text-sm font-bold capitalize
              rounded-full border-3 transition-all duration-200
              ${
              style.value === s
                ? "bg-black text-white border-black scale-110 shadow-glow animate-pulse"
                : "bg-white text-black border-gray-400 hover:border-black hover:scale-105 hover:shadow-md"
            }
            `}
          >
            {s}
          </button>
        ))}

        {/* Custom Gradient Button */}
        <button
          type="button"
          onClick={() => {
            isCreatorOpen.value = true;
            haptics.medium();
            sounds.click();
          }}
          class={`
            px-4 py-2 min-h-[44px] text-sm font-bold
            rounded-full border-3 transition-all duration-200
            ${
            style.value === "custom"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black scale-110 shadow-glow animate-pulse"
              : "bg-gradient-to-r from-gray-100 to-gray-200 text-black border-gray-400 hover:border-black hover:scale-105 hover:shadow-md hover:from-purple-100 hover:to-pink-100"
          }
          `}
        >
          ✨ Custom
        </button>
      </div>

      {/* Custom Gradient Creator Modal */}
      <GradientCreator
        isOpen={isCreatorOpen}
        onCustomGradient={handleCustomGradient}
      />
    </>
  );
}

import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import type { ColorStop, QRStyle } from "../types/qr-types.ts";

interface GradientCreatorProps {
  onCustomGradient: (gradient: QRStyle) => void;
  isOpen: Signal<boolean>;
}

export default function GradientCreator(
  { onCustomGradient, isOpen }: GradientCreatorProps,
) {
  const [gradientType, setGradientType] = useState<"linear" | "radial">(
    "linear",
  );
  const [rotation, setRotation] = useState(45);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { offset: 0, color: "#FFE5B4" },
    { offset: 1, color: "#FF69B4" },
  ]);

  const addColorStop = () => {
    const newOffset = colorStops.length > 0
      ? Math.min(1, Math.max(0, 0.5))
      : 0.5;

    setColorStops([
      ...colorStops,
      { offset: newOffset, color: "#9370DB" },
    ].sort((a, b) => a.offset - b.offset));

    haptics.light();
    sounds.click();
  };

  const removeColorStop = (index: number) => {
    if (colorStops.length <= 2) return; // Keep at least 2 stops

    setColorStops(colorStops.filter((_, i) => i !== index));
    haptics.medium();
  };

  const updateColorStop = (
    index: number,
    field: keyof ColorStop,
    value: string | number,
  ) => {
    const newStops = [...colorStops];
    newStops[index] = { ...newStops[index], [field]: value };

    if (field === "offset") {
      newStops.sort((a, b) => a.offset - b.offset);
    }

    setColorStops(newStops);
  };

  const applyCustomGradient = () => {
    const customGradient = {
      dots: {
        type: "gradient",
        gradient: {
          type: gradientType,
          rotation: gradientType === "linear" ? rotation : undefined,
          colorStops: colorStops.map((stop) => ({
            offset: stop.offset,
            color: stop.color,
          })),
        },
      },
      background: {
        type: "gradient",
        gradient: {
          type: "linear" as const,
          rotation: 135,
          colorStops: [
            { offset: 0, color: colorStops[0]?.color + "20" || "#FFF8F020" },
            {
              offset: 1,
              color: colorStops[colorStops.length - 1]?.color + "10" ||
                "#FFE5B410",
            },
          ],
        },
      },
      cornersSquare: {
        color: colorStops[0]?.color || "#FF69B4",
      },
      cornersDot: {
        color: colorStops[colorStops.length - 1]?.color || "#9370DB",
      },
    };

    onCustomGradient(customGradient);
    isOpen.value = false;

    haptics.success();
    sounds.success();
  };

  const getGradientPreview = () => {
    const stopString = colorStops
      .map((stop) => `${stop.color} ${stop.offset * 100}%`)
      .join(", ");

    if (gradientType === "linear") {
      return `linear-gradient(${rotation}deg, ${stopString})`;
    } else {
      return `radial-gradient(circle, ${stopString})`;
    }
  };

  if (!isOpen.value) return null;

  return (
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4">
      <div class="bg-white rounded-chunky border-4 border-black shadow-chunky-hover p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div class="flex justify-between items-center mb-4 sm:mb-6">
          <h2 class="text-xl sm:text-2xl font-chunky">Custom Gradient</h2>
          <button
            type="button"
            onClick={() => {
              isOpen.value = false;
              haptics.light();
            }}
            class="text-2xl hover:scale-110 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div class="mb-6">
          <h3 class="font-bold mb-2">Preview</h3>
          <div
            class="w-full h-24 rounded-lg border-2 border-gray-300"
            style={{ background: getGradientPreview() }}
          />
        </div>

        {/* Gradient Type */}
        <div class="mb-4">
          <h3 class="font-bold mb-2">Type</h3>
          <div class="flex gap-2">
            {(["linear", "radial"] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => {
                  setGradientType(type);
                  haptics.light();
                }}
                class={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                  gradientType === type
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-300 hover:border-black"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Rotation (Linear only) */}
        {gradientType === "linear" && (
          <div class="mb-4">
            <h3 class="font-bold mb-2">Rotation: {rotation}°</h3>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onInput={(e) =>
                setRotation(parseInt((e.target as HTMLInputElement).value))}
              class="w-full"
            />
          </div>
        )}

        {/* Color Stops */}
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold">Colors</h3>
            <button
              type="button"
              onClick={addColorStop}
              class="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              + Add
            </button>
          </div>

          <div class="space-y-3">
            {colorStops.map((stop, index) => (
              <div key={index} class="flex items-center gap-3">
                <input
                  type="color"
                  value={stop.color}
                  onInput={(e) =>
                    updateColorStop(
                      index,
                      "color",
                      (e.target as HTMLInputElement).value,
                    )}
                  class="w-12 h-8 rounded border-2 border-gray-300"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stop.offset}
                  onInput={(e) =>
                    updateColorStop(
                      index,
                      "offset",
                      parseFloat((e.target as HTMLInputElement).value),
                    )}
                  class="flex-1"
                />
                <span class="text-sm font-mono w-12">
                  {(stop.offset * 100).toFixed(0)}%
                </span>
                {colorStops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeColorStop(index)}
                    class="text-red-500 hover:text-red-700 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div class="flex gap-3">
          <button
            type="button"
            onClick={() => {
              isOpen.value = false;
              haptics.light();
            }}
            class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyCustomGradient}
            class="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply Gradient
          </button>
        </div>
      </div>
    </div>
  );
}

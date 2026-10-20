import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import type { ColorStop, QRStyle } from "../types/qr-types.ts";
import { useModalShell } from "./modal/useModalShell.ts";

// Six curated pastel-punk jewel chips — every chip stays ≤ 0.40 relative
// luminance so users never accidentally pick a pale/muddy stop.
export const QUICK_PICK_COLORS = [
  { name: "Hot Pink", color: "#FF2E93" },
  { name: "Crimson Rose", color: "#E11D48" },
  { name: "Sunset Tangerine", color: "#EA580C" },
  { name: "Botanical Emerald", color: "#059669" },
  { name: "Deep Cyan", color: "#0891B2" },
  { name: "Electric Violet", color: "#7C3AED" },
] as const;

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
  const [rotation, setRotation] = useState(135);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    // Default starts users on a vibrant, scannable pastel-punk combo.
    { offset: 0, color: "#FF2E93" },
    { offset: 1, color: "#7C3AED" },
  ]);

  // Escape/scroll-lock/focus/backdrop machinery — the shared modal shell.
  const shell = useModalShell({
    open: isOpen.value,
    onClose: () => {
      isOpen.value = false;
    },
  });

  const addColorStop = () => {
    const newOffset = colorStops.length > 0
      ? Math.min(1, Math.max(0, 0.5))
      : 0.5;

    const next = [
      ...colorStops,
      { offset: newOffset, color: "#0891B2" },
    ].sort((a, b) => a.offset - b.offset);
    setColorStops(next);
    setActiveStopIndex(next.length - 1);

    haptics.light();
    sounds.click();
  };

  const removeColorStop = (index: number) => {
    if (colorStops.length <= 2) return; // Keep at least 2 stops

    const next = colorStops.filter((_, i) => i !== index);
    setColorStops(next);
    setActiveStopIndex((prev) => Math.min(prev, next.length - 1));
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
    const customGradient: QRStyle = {
      dots: {
        type: "gradient",
        gradient: {
          type: gradientType,
          rotation: gradientType === "linear"
            ? (rotation * Math.PI) / 180
            : undefined,
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
          rotation: Math.PI * 0.75,
          colorStops: [
            { offset: 0, color: "#FFF8F0" },
            { offset: 1, color: "#FFF0F7" },
          ],
        },
      },
      cornersSquare: {
        color: colorStops[0]?.color || "#FF2E93",
      },
      cornersDot: {
        color: colorStops[colorStops.length - 1]?.color || "#7C3AED",
      },
    };

    onCustomGradient(customGradient);
    shell.requestClose();

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

  if (!shell.mounted) return null;

  const safeActiveIndex = Math.min(activeStopIndex, colorStops.length - 1);

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        ref={shell.backdropRef}
        class="absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm animate-fade-in"
        onClick={shell.onBackdropClick}
      />
      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gradient-creator-title"
        tabindex={-1}
        class="relative z-10 w-full max-w-lg bg-qr-cream border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-chunky-hover p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-5 animate-slide-up sm:animate-pop-in max-h-[92dvh] overflow-y-auto scrollbar-none"
      >
        {/* Header */}
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2
              id="gradient-creator-title"
              class="text-2xl font-black text-black tracking-tight leading-tight"
            >
              Build your own.
            </h2>
            <p class="text-sm font-bold text-qr-pop">
              Mix vivid stops that still scan first try.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              shell.requestClose();
              haptics.light();
            }}
            aria-label="Close gradient creator"
            class="group shrink-0 w-11 h-11 -mr-1 -mt-1 rounded-full flex items-center justify-center"
          >
            <span
              aria-hidden="true"
              class="w-9 h-9 rounded-full bg-white border-2 border-black text-black font-black text-base leading-none flex items-center justify-center shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
            >
              ✕
            </span>
          </button>
        </div>

        {/* Enamel Preview */}
        <div
          class="w-full h-20 rounded-2xl border-3 border-black ring-2 ring-inset ring-white/70 shadow-chunky"
          style={{ background: getGradientPreview() }}
        />

        {/* Gradient Type & Rotation */}
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3">
          <div class="grid grid-cols-2 gap-2">
            {(["linear", "radial"] as const).map((type) => {
              const active = gradientType === type;
              return (
                <button
                  type="button"
                  key={type}
                  aria-pressed={active}
                  onClick={() => {
                    setGradientType(type);
                    haptics.light();
                  }}
                  class={`min-h-[44px] px-4 py-2 rounded-xl border-2 font-black text-sm capitalize transition-all ${
                    active
                      ? "bg-amber-200 text-black border-black shadow-chunky"
                      : "bg-white text-black border-black/15 hover:border-black/60"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {gradientType === "linear" && (
            <div class="pt-1">
              <div class="flex items-center justify-between text-xs font-black text-black mb-1">
                <span>Angle</span>
                <span class="font-mono">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={rotation}
                aria-label="Gradient angle"
                onInput={(e) =>
                  setRotation(parseInt((e.target as HTMLInputElement).value))}
                class="w-full accent-qr-pop"
              />
            </div>
          )}
        </div>

        {/* Color Stops + Curated Quick-Pick Chips */}
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm font-black text-black">
              Color Stops
            </span>
            <button
              type="button"
              onClick={addColorStop}
              class="px-3 min-h-[44px] bg-amber-200 text-black border-2 border-black rounded-full shadow-chunky hover:scale-105 active:scale-95 transition-all text-xs font-black"
            >
              + Add stop
            </button>
          </div>

          {/* 6 Curated Quick-Pick Chips */}
          <div class="space-y-1.5">
            <span class="block text-xs font-bold text-neutral-600">
              Quick-pick scannable jewel colors (applies to Stop{" "}
              {safeActiveIndex + 1}):
            </span>
            <div class="flex flex-wrap items-center gap-2">
              {QUICK_PICK_COLORS.map((chip) => {
                const isSelected =
                  colorStops[safeActiveIndex]?.color.toLowerCase() ===
                    chip.color.toLowerCase();
                return (
                  <button
                    type="button"
                    key={chip.color}
                    title={chip.name}
                    aria-label={`Pick ${chip.name} (${chip.color}) for stop ${
                      safeActiveIndex + 1
                    }`}
                    onClick={() => {
                      updateColorStop(safeActiveIndex, "color", chip.color);
                      haptics.light();
                      sounds.click();
                    }}
                    class={`w-11 h-11 rounded-full border-2 border-black flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-black shadow-chunky scale-105"
                        : ""
                    }`}
                    style={{ backgroundColor: chip.color }}
                  >
                    {isSelected && (
                      <span class="text-white text-xs font-black drop-shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div class="space-y-2.5 pt-1">
            {colorStops.map((stop, index) => {
              const isFocused = safeActiveIndex === index;
              return (
                <div
                  key={index}
                  onClick={() => setActiveStopIndex(index)}
                  class={`flex items-center gap-2.5 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                    isFocused
                      ? "border-black bg-amber-50"
                      : "border-black/15 bg-white"
                  }`}
                >
                  <input
                    type="color"
                    value={stop.color}
                    aria-label={`Stop ${index + 1} color`}
                    onFocus={() => setActiveStopIndex(index)}
                    onInput={(e) => {
                      setActiveStopIndex(index);
                      updateColorStop(
                        index,
                        "color",
                        (e.target as HTMLInputElement).value,
                      );
                    }}
                    class="w-11 h-11 rounded-lg border-2 border-black cursor-pointer bg-white p-0.5 shrink-0"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stop.offset}
                    aria-label={`Stop ${index + 1} position`}
                    onFocus={() => setActiveStopIndex(index)}
                    onInput={(e) =>
                      updateColorStop(
                        index,
                        "offset",
                        parseFloat((e.target as HTMLInputElement).value),
                      )}
                    class="flex-1 accent-qr-pop"
                  />
                  <span class="text-xs font-mono font-bold text-black w-10 text-right">
                    {(stop.offset * 100).toFixed(0)}%
                  </span>
                  {colorStops.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Remove stop ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColorStop(index);
                      }}
                      class="w-11 h-11 rounded-full border-2 border-black/20 hover:border-black bg-white text-black font-black text-sm flex items-center justify-center shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div class="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              shell.requestClose();
              haptics.light();
            }}
            class="flex-1 min-h-[52px] px-4 py-3 bg-white text-black border-2 border-black rounded-full font-black text-base shadow-chunky hover:bg-amber-100 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyCustomGradient}
            class="flex-1 min-h-[52px] px-4 py-3 bg-qr-pop text-white border-3 border-black rounded-full font-black text-base shadow-chunky hover:scale-[1.02] hover:bg-qr-popDeep hover:shadow-chunky-hover active:scale-[0.97] transition-all"
          >
            Apply Gradient ✨
          </button>
        </div>
      </div>
    </div>
  );
}

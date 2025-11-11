import { Signal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { getRandomStyle } from "../utils/qr-styles.ts";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";

interface ShuffleActionProps {
  style: Signal<string>;
  isAnimating: Signal<boolean>;
}

export default function ShuffleAction(
  { style, isAnimating }: ShuffleActionProps,
) {
  const timeoutRef = useRef<number | null>(null);

  const handleShuffle = () => {
    if (isAnimating.value) return;

    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    // Immediate feedback
    haptics.shuffle();
    sounds.shuffle();

    isAnimating.value = true;
    style.value = getRandomStyle();

    timeoutRef.current = setTimeout(() => {
      isAnimating.value = false;
      // Success feedback after animation completes
      haptics.light();
      timeoutRef.current = null;
    }, 400);
  };

  return (
    <button
      type="button"
      onClick={handleShuffle}
      disabled={isAnimating.value}
      class="
        text-sm text-gray-600 hover:text-black
        transition-all duration-200
        flex items-center gap-1
        disabled:opacity-50
      "
      title="Random style"
    >
      <span
        class={`transition-transform duration-400 ${
          isAnimating.value ? "animate-spin" : ""
        }`}
      >
        🎲
      </span>
      Surprise me
    </button>
  );
}

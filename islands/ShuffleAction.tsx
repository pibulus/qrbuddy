import { Signal } from "@preact/signals";
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
  const handleShuffle = () => {
    if (isAnimating.value) return;

    // Immediate feedback
    haptics.shuffle();
    sounds.shuffle();

    isAnimating.value = true;
    style.value = getRandomStyle();

    setTimeout(() => {
      isAnimating.value = false;
      // Success feedback after animation completes
      haptics.light();
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

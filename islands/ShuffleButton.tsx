import { Signal } from "@preact/signals";
import { getRandomStyle } from "../utils/qr-styles.ts";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";

interface ShuffleButtonProps {
  style: Signal<string>;
  isAnimating: Signal<boolean>;
}

export default function ShuffleButton(
  { style, isAnimating }: ShuffleButtonProps,
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
      class={`
        flex-1 px-8 py-4 text-lg font-chunky text-white
        bg-gradient-to-r from-qr-sunset1 via-qr-sunset2 to-qr-sunset3
        rounded-chunky border-4 border-black shadow-chunky
        hover:shadow-chunky-hover hover:shadow-glow hover:scale-105 hover:brightness-110
        active:scale-95 active:animate-squish
        transition-all duration-200
        ${isAnimating.value ? "animate-rotate-shuffle" : ""}
      `}
    >
      Shuffle
    </button>
  );
}

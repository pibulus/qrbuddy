import { Signal } from "@preact/signals";
import { getRandomStyle } from "../utils/qr-styles.ts";

interface ShuffleButtonProps {
  style: Signal<string>;
  isAnimating: Signal<boolean>;
}

export default function ShuffleButton(
  { style, isAnimating }: ShuffleButtonProps,
) {
  const handleShuffle = () => {
    if (isAnimating.value) return;

    isAnimating.value = true;
    style.value = getRandomStyle();

    setTimeout(() => {
      isAnimating.value = false;
    }, 400);
  };

  return (
    <button
      type="button"
      onClick={handleShuffle}
      class={`
        px-8 py-4 text-lg font-chunky text-white
        bg-gradient-to-r from-qr-sunset1 via-qr-sunset2 to-qr-sunset3
        rounded-chunky border-3 border-black shadow-chunky
        hover:shadow-chunky-hover hover:scale-105
        active:scale-95 active:animate-squish
        transition-all duration-200
        ${isAnimating.value ? "animate-rotate-shuffle" : ""}
      `}
    >
      Shuffle
    </button>
  );
}

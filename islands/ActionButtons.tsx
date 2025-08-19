import { Signal } from "@preact/signals";

interface ActionButtonsProps {
  triggerDownload: Signal<boolean>;
}

export default function ActionButtons(
  { triggerDownload }: ActionButtonsProps,
) {
  return (
    <button
      type="button"
      onClick={() => triggerDownload.value = true}
      class="
        flex-1 px-6 py-4 text-lg font-medium
        bg-white text-black
        rounded-chunky border-3 border-black shadow-chunky
        hover:shadow-chunky-hover hover:scale-105
        active:scale-95 active:animate-squish
        transition-all duration-200
      "
    >
      Save it
    </button>
  );
}

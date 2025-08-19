import { Signal } from "@preact/signals";

interface URLInputProps {
  url: Signal<string>;
}

export default function URLInput({ url }: URLInputProps) {
  return (
    <input
      type="url"
      value={url.value}
      onInput={(e) => url.value = (e.target as HTMLInputElement).value}
      placeholder="Your link here"
      class="
        w-full px-6 py-4 text-lg
        bg-white/90 backdrop-blur
        rounded-chunky border-3 border-black
        shadow-chunky
        focus:shadow-chunky-hover focus:scale-105
        focus:outline-none focus:border-qr-sunset2
        transition-all duration-200
        placeholder:text-gray-400
      "
    />
  );
}

import { Signal } from "@preact/signals";

interface URLInputProps {
  url: Signal<string>;
}

export default function URLInput({ url }: URLInputProps) {
  return (
    <div class="flex justify-center">
      <input
        type="url"
        value={url.value}
        onInput={(e) => url.value = (e.target as HTMLInputElement).value}
        placeholder="Your link here"
        class="
          w-10/12 px-6 py-4 text-xl
          bg-white/90 backdrop-blur
          rounded-chunky border-4 border-black
          shadow-chunky
          focus:shadow-glow focus:scale-[1.02]
          focus:outline-none focus:border-qr-sunset2
          transition-all duration-200
          placeholder:text-gray-400
          font-medium
        "
      />
    </div>
  );
}

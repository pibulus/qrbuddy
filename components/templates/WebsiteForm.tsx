import { useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function WebsiteForm({ url }: Props) {
  const [inputValue, setInputValue] = useState(url.value);

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setInputValue(value);
    url.value = value;
    haptics.light();
  };

  return (
    <div class="space-y-4 animate-slide-down">
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          URL
        </label>
        <input
          type="url"
          value={inputValue}
          onInput={handleInput}
          placeholder="https://example.com"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none transition-colors font-medium"
        />
      </div>
    </div>
  );
}

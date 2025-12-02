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
      <div class="bg-gray-50 border-3 border-gray-200 rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">🔗</span>
          <h3 class="font-black text-gray-900">Website URL</h3>
        </div>
        <p class="text-sm text-gray-600">
          Link to any website, article, or online resource.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          URL
        </label>
        <input
          type="url"
          value={inputValue}
          onInput={handleInput}
          placeholder="https://example.com"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-black focus:outline-none transition-colors font-medium"
          autoFocus
        />
        <p class="text-xs text-gray-400">
          Must start with http:// or https://
        </p>
      </div>
    </div>
  );
}

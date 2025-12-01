import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function WebsiteForm({ url }: Props) {
  const [value, setValue] = useState(url.value);

  useEffect(() => {
    url.value = value;
  }, [value]);

  return (
    <div class="space-y-4">
      <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">🔗</span>
          <h3 class="font-black text-gray-900">Website URL</h3>
        </div>
        <p class="text-sm text-gray-700">
          Link to any website, article, or page.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Website URL
        </label>
        <input
          type="url"
          value={value}
          onInput={(e) => {
            setValue((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="https://example.com"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-black focus:outline-none"
          autoFocus
        />
      </div>
    </div>
  );
}

import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";

interface SplashConfig {
  enabled: boolean;
  title: string;
  buttonText: string;
  imageUrl?: string;
  description?: string;
}

interface SplashSettingsProps {
  splashConfig: Signal<SplashConfig | null>;
}

export default function SplashSettings({ splashConfig }: SplashSettingsProps) {
  // Local state for immediate feedback
  const [localConfig, setLocalConfig] = useState<SplashConfig>(
    splashConfig.value || {
      enabled: true,
      title: "Welcome!",
      buttonText: "Continue",
    },
  );

  const updateConfig = (updates: Partial<SplashConfig>) => {
    const newConfig = { ...localConfig, ...updates, enabled: true };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
  };

  return (
    <div class="space-y-3 bg-white border-2 border-black rounded-2xl p-4 animate-slide-down">
      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">
          Page title
        </label>
        <input
          type="text"
          value={localConfig.title}
          onInput={(e) =>
            updateConfig({ title: (e.target as HTMLInputElement).value })}
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none text-sm"
          placeholder="e.g. Welcome to My Portfolio"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">
          Button text
        </label>
        <input
          type="text"
          value={localConfig.buttonText}
          onInput={(e) =>
            updateConfig({
              buttonText: (e.target as HTMLInputElement).value,
            })}
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none text-sm"
          placeholder="e.g. Continue to Website"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={localConfig.description || ""}
          onInput={(e) =>
            updateConfig({
              description: (e.target as HTMLTextAreaElement).value,
            })}
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none text-sm resize-none"
          rows={2}
          placeholder="Add a friendly welcome note..."
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 mb-1">
          Header Image URL (Optional)
        </label>
        <input
          type="url"
          value={localConfig.imageUrl || ""}
          onInput={(e) =>
            updateConfig({
              imageUrl: (e.target as HTMLInputElement).value,
            })}
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none text-sm"
          placeholder="https://example.com/cover.jpg"
        />
        <p class="text-[11px] text-gray-400 mt-1">
          Direct link to a JPEG, PNG, or WebP image
        </p>
      </div>
    </div>
  );
}

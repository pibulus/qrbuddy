import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";

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
      enabled: false,
      title: "Welcome!",
      buttonText: "Continue",
    },
  );

  const updateConfig = (updates: Partial<SplashConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
  };

  return (
    <div class="space-y-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
      <div class="flex items-center justify-between">
        <label class="font-bold text-gray-700">Enable Splash Screen</label>
        <button
          type="button"
          onClick={() => {
            updateConfig({ enabled: !localConfig.enabled });
            haptics.light();
          }}
          class={`w-12 h-6 rounded-full transition-colors relative ${
            localConfig.enabled ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <div
            class={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              localConfig.enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {localConfig.enabled && (
        <div class="space-y-3 animate-slide-down">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">
              Page Title
            </label>
            <input
              type="text"
              value={localConfig.title}
              onInput={(e) =>
                updateConfig({ title: (e.target as HTMLInputElement).value })}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
              placeholder="e.g. Welcome to My WiFi"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">
              Button Text
            </label>
            <input
              type="text"
              value={localConfig.buttonText}
              onInput={(e) =>
                updateConfig({
                  buttonText: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
              placeholder="e.g. Connect Now"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={localConfig.description || ""}
              onInput={(e) =>
                updateConfig({
                  description: (e.target as HTMLTextAreaElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
              rows={2}
              placeholder="Add a short message..."
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">
              Image URL (Optional)
            </label>
            <input
              type="text"
              value={localConfig.imageUrl || ""}
              onInput={(e) =>
                updateConfig({
                  imageUrl: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
              placeholder="https://..."
            />
            <p class="text-[10px] text-gray-400 mt-1">
              Paste an image link. Upload coming soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

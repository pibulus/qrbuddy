import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";

export interface SplashConfig {
  enabled: boolean;
  title: string;
  buttonText: string;
  imageUrl?: string;
  description?: string;
}

interface SplashSettingsProps {
  splashConfig: Signal<SplashConfig | null>;
  destinationUrl?: string;
}

interface Preset {
  label: string;
  icon: string;
  title: string;
  buttonText: string;
  description: string;
  imageUrl?: string;
}

const PRESETS: Preset[] = [
  {
    label: "Menu & Food",
    icon: "🌮",
    title: "Tonight's Specials",
    buttonText: "View Full Menu & Drinks 🌯",
    description:
      "Welcome to our kitchen! Check out our seasonal tacos, warm sides, and cold craft drinks.",
    imageUrl:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Wedding & Party",
    icon: "🥂",
    title: "Welcome to Our Big Day! 🥂",
    buttonText: "See Timeline & Photos ✨",
    description:
      "We're so thrilled you're here to celebrate with us. Tap below to view our day schedule and share your snaps to our album!",
    imageUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Music & Beats",
    icon: "🎧",
    title: "New Track Incoming! 🎧",
    buttonText: "Listen to the Master 🔊",
    description:
      "Exclusive unreleased master before it hits streaming. Plug in your headphones and turn this all the way up.",
    imageUrl:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Art & Studio",
    icon: "🎨",
    title: "Welcome to the Studio ✨",
    buttonText: "Explore the Gallery 🖼️",
    description:
      "Independent craft, designs, and software experiments made with love and caffeine.",
    imageUrl:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80",
  },
];

const CURATED_IMAGES = [
  {
    label: "🌮 Food",
    url:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "💐 Floral",
    url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "🎶 Vinyl",
    url:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "🌅 Sunset",
    url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "👾 Cyber",
    url:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80",
  },
];

export default function SplashSettings(
  { splashConfig, destinationUrl }: SplashSettingsProps,
) {
  const [localConfig, setLocalConfig] = useState<SplashConfig>(
    splashConfig.value || {
      enabled: true,
      title: "Welcome!",
      buttonText: "Continue",
      description: "",
      imageUrl: "",
    },
  );

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [imageError, setImageError] = useState(false);

  const updateConfig = (updates: Partial<SplashConfig>) => {
    if (updates.imageUrl !== undefined) {
      setImageError(false);
    }
    const newConfig = { ...localConfig, ...updates, enabled: true };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
  };

  const applyPreset = (preset: Preset) => {
    setImageError(false);
    const newConfig: SplashConfig = {
      enabled: true,
      title: preset.title,
      buttonText: preset.buttonText,
      description: preset.description,
      imageUrl: preset.imageUrl,
    };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
    haptics.success();
  };

  const cleanDestDomain = destinationUrl
    ? (() => {
      try {
        return new URL(destinationUrl).hostname;
      } catch {
        return destinationUrl;
      }
    })()
    : null;

  return (
    <div class="space-y-4 bg-white border-3 border-black rounded-2xl p-4 sm:p-5 shadow-chunky animate-slide-down">
      {/* Header & Tab switch */}
      <div class="flex items-center justify-between border-b-2 border-gray-100 pb-3">
        <div>
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
            <span>✨</span>
            <span>Cover Page Designer</span>
          </h3>
          <p class="text-xs text-gray-500 font-medium mt-0.5">
            Gives scanners a custom intro card before opening your link.
          </p>
        </div>

        {/* Edit / Preview pill toggle */}
        <div class="flex bg-gray-100 p-1 rounded-xl border-2 border-black shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("edit");
              haptics.light();
            }}
            class={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-black transition-all ${
              activeTab === "edit"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("preview");
              haptics.light();
            }}
            class={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-black transition-all ${
              activeTab === "preview"
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Preset Starters */}
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-pink-600">
            Quick Starters
          </span>
          <span class="text-[11px] text-gray-400 font-medium">1-tap fill</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              class="flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-xl border-2 border-black bg-pink-50/70 hover:bg-pink-100 hover:-translate-y-0.5 active:translate-y-0 font-black text-xs text-gray-800 transition-all text-left shadow-sm truncate"
              title={preset.title}
            >
              <span class="text-base shrink-0">{preset.icon}</span>
              <span class="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Form or Preview */}
      {activeTab === "edit" && (
        <div class="space-y-3.5 pt-1">
          {/* Title */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-gray-700">
                Headline / Title *
              </label>
              <span class="text-[10px] font-bold text-gray-400">
                {localConfig.title.length}/100
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={localConfig.title}
              onInput={(e) =>
                updateConfig({ title: (e.target as HTMLInputElement).value })}
              class="w-full px-3 py-2 border-2 border-black rounded-xl focus:border-pink-500 focus:outline-none text-sm font-bold bg-white"
              placeholder="e.g. Welcome to Our Wedding!"
            />
          </div>

          {/* Button Text */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-gray-700">
                Button Text *
              </label>
              <span class="text-[10px] font-bold text-gray-400">
                {localConfig.buttonText.length}/50
              </span>
            </div>
            <input
              type="text"
              maxLength={50}
              value={localConfig.buttonText}
              onInput={(e) =>
                updateConfig({
                  buttonText: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-black rounded-xl focus:border-pink-500 focus:outline-none text-sm font-bold bg-white"
              placeholder="e.g. Continue to Website"
            />
          </div>

          {/* Description */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-gray-700">
                Welcome Message / Note
              </label>
              <span class="text-[10px] font-bold text-gray-400">
                {(localConfig.description || "").length}/500
              </span>
            </div>
            <textarea
              maxLength={500}
              value={localConfig.description || ""}
              onInput={(e) =>
                updateConfig({
                  description: (e.target as HTMLTextAreaElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-black rounded-xl focus:border-pink-500 focus:outline-none text-sm font-medium resize-none bg-white"
              rows={3}
              placeholder="Add instructions, warm greeting, playlist description, or menu teasers..."
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-gray-700">
                Header Cover Image URL (Optional)
              </label>
              {localConfig.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateConfig({ imageUrl: "" });
                    haptics.light();
                  }}
                  class="text-[10px] font-bold text-red-500 hover:underline"
                >
                  ✕ Clear image
                </button>
              )}
            </div>
            <input
              type="url"
              value={localConfig.imageUrl || ""}
              onInput={(e) =>
                updateConfig({
                  imageUrl: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-black rounded-xl focus:border-pink-500 focus:outline-none text-xs font-mono bg-white"
              placeholder="https://example.com/banner.jpg"
            />

            {/* Quick image inspiration chips */}
            <div class="flex items-center gap-1.5 flex-wrap mt-2">
              <span class="text-[10px] font-bold text-gray-400">Presets:</span>
              {CURATED_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => {
                    updateConfig({ imageUrl: img.url });
                    haptics.light();
                  }}
                  class="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-gray-300 bg-gray-50 hover:border-black hover:bg-white transition-colors"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Card */}
      {activeTab === "preview" && (
        <div class="py-2 animate-pop-in">
          <div class="rounded-2xl border-3 border-black bg-[#FAF8F5] p-5 shadow-[4px_4px_0px_0px_#000] text-center max-w-sm mx-auto space-y-3 relative overflow-hidden">
            {/* Cover image */}
            {localConfig.imageUrl && !imageError && (
              <div class="rounded-xl border-2 border-black overflow-hidden bg-pink-50 max-h-44 shadow-sm">
                <img
                  src={localConfig.imageUrl}
                  alt="Cover image"
                  class="w-full h-36 object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}

            {/* Title */}
            <h4 class="text-xl font-black text-gray-950 tracking-tight leading-tight pt-1 break-words">
              {localConfig.title || "Welcome!"}
            </h4>

            {/* Description */}
            {localConfig.description && (
              <p class="text-xs text-gray-600 font-medium leading-relaxed whitespace-pre-wrap max-h-28 overflow-y-auto px-1 break-words">
                {localConfig.description}
              </p>
            )}

            {/* Button */}
            <div class="pt-2">
              <div class="w-full min-h-[46px] rounded-xl border-3 border-black bg-black text-white font-extrabold text-sm py-2.5 px-4 shadow-[3px_3px_0px_0px_#FF69B4] flex items-center justify-center gap-1.5 cursor-default">
                <span>{localConfig.buttonText || "Continue"}</span>
                <span>→</span>
              </div>
              {cleanDestDomain && (
                <p class="text-[10px] text-gray-400 font-semibold mt-1.5 truncate">
                  Opens: {cleanDestDomain}
                </p>
              )}
            </div>

            {/* Footer enamel badge */}
            <div class="pt-3 border-t border-gray-200/80 flex items-center justify-center">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-pink-100 text-[10px] font-black text-gray-900 shadow-[1.5px_1.5px_0px_0px_#000]">
                <span>⚡</span>
                <span>
                  Built with <strong>QRBuddy</strong> · Free forever
                </span>
              </div>
            </div>
          </div>

          <p class="text-center text-[11px] text-gray-500 font-medium mt-3">
            ✨ When scanned, your visitors see this card before reaching your
            destination.
          </p>
        </div>
      )}
    </div>
  );
}

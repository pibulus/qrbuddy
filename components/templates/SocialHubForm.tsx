import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatSocialUrl,
  parseSocialUrl,
  type SocialPlatform,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

const PLATFORMS: { id: SocialPlatform; label: string; color: string }[] = [
  {
    id: "instagram",
    label: "Instagram",
    color: "bg-pink-50 border-pink-400 text-pink-600",
  },
  {
    id: "twitter",
    label: "X / Twitter",
    color: "bg-gray-50 border-gray-400 text-gray-800",
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "bg-purple-50 border-purple-400 text-purple-700",
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "bg-blue-50 border-blue-400 text-blue-600",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "bg-green-50 border-green-400 text-green-600",
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "bg-amber-50 border-amber-400 text-amber-800",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "bg-blue-50 border-blue-600 text-blue-700",
  },
  {
    id: "github",
    label: "GitHub",
    color: "bg-gray-100 border-gray-500 text-gray-900",
  },
];

function isSupportedSocialPlatform(value?: string): value is SocialPlatform {
  return PLATFORMS.some((p) => p.id === value);
}

export default function SocialHubForm({ url }: Props) {
  const [initial] = useState(() => parseSocialUrl(url.value));
  const [platform, setPlatform] = useState<SocialPlatform>(() =>
    isSupportedSocialPlatform(initial?.platform)
      ? initial.platform
      : "instagram"
  );
  const [handle, setHandle] = useState(() => initial?.username ?? "");

  const formattedPreview = formatSocialUrl(platform, handle);

  useEffect(() => {
    if (!formattedPreview) return;
    if (url.value !== formattedPreview) {
      url.value = formattedPreview;
    }
  }, [formattedPreview]);

  const currentPlatform = PLATFORMS.find((p) => p.id === platform) ||
    PLATFORMS[0];
  const usesAtPrefix = platform !== "whatsapp" && platform !== "facebook" &&
    platform !== "linkedin" && platform !== "github";

  return (
    <div class="space-y-4 animate-slide-down">
      {/* Platform Selector */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPlatform(p.id);
              haptics.light();
            }}
            class={`flex items-center justify-center min-h-[44px] p-2.5 rounded-xl border-2 transition-all font-bold text-sm ${
              platform === p.id
                ? `${p.color} shadow-chunky scale-105`
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
            title={p.label}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        class={`p-4 rounded-xl border-3 shadow-chunky transition-colors ${currentPlatform.color}`}
      >
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-black">{currentPlatform.label}</h3>
        </div>

        <div class="relative">
          {usesAtPrefix && (
            <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-50 text-lg">
              @
            </span>
          )}
          <input
            type="text"
            value={handle}
            onInput={(e) => {
              const raw = (e.target as HTMLInputElement).value;
              if (raw.includes("/")) {
                const parsed = parseSocialUrl(raw);
                if (parsed) {
                  if (isSupportedSocialPlatform(parsed.platform)) {
                    setPlatform(parsed.platform);
                  }
                  setHandle(parsed.username);
                  haptics.light();
                  return;
                }
              }
              setHandle(raw);
              haptics.light();
            }}
            placeholder={platform === "whatsapp"
              ? "Phone number (e.g. 1555...)"
              : platform === "linkedin"
              ? "Profile ID"
              : "Username"}
            class={`w-full ${
              usesAtPrefix ? "pl-9" : "px-4"
            } py-3 border-3 border-black/10 bg-white/50 rounded-xl text-lg focus:bg-white focus:border-qr-pop focus:outline-none transition-colors font-bold placeholder-black/30`}
          />
        </div>
        <p class="text-xs mt-2 opacity-70 font-mono truncate">
          {formattedPreview || "Profile handle builds direct link"}
        </p>
      </div>
    </div>
  );
}

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

const PLATFORMS: { id: SocialPlatform; label: string; dot: string }[] = [
  { id: "instagram", label: "Instagram", dot: "#DB2777" },
  { id: "twitter", label: "X / Twitter", dot: "#1E1714" },
  { id: "tiktok", label: "TikTok", dot: "#7C3AED" },
  { id: "facebook", label: "Facebook", dot: "#1D4ED8" },
  { id: "whatsapp", label: "WhatsApp", dot: "#15803D" },
  { id: "youtube", label: "YouTube", dot: "#C2410C" },
  { id: "linkedin", label: "LinkedIn", dot: "#205EA6" },
  { id: "github", label: "GitHub", dot: "#3D2E28" },
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
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      <div class="space-y-2">
        <span class="qr-field-label">
          <span
            class="qr-section-pip"
            style={{ backgroundColor: currentPlatform.dot }}
            aria-hidden="true"
          />
          <span>Platform</span>
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setPlatform(p.id);
                  haptics.light();
                }}
                class={`min-h-[38px] px-2.5 py-1.5 rounded-xl border-2 text-xs font-black inline-flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[0_2px_0_#1e1714]"
                    : "border-[#1e1714]/20 bg-[#fbf1e4] text-[#4a3f39] hover:border-[#1e1714] hover:text-[#1e1714]"
                }`}
                title={p.label}
              >
                <span
                  aria-hidden="true"
                  class="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.dot }}
                />
                <span class="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div class="space-y-1.5 pt-1 border-t border-[#1e1714]/10">
        <label class="qr-field-label" for="social-handle-input">
          <span>{currentPlatform.label} Handle</span>
        </label>
        <div class="relative">
          {usesAtPrefix && (
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[#6e6058] text-base pointer-events-none">
              @
            </span>
          )}
          <input
            id="social-handle-input"
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
              ? "Phone number (e.g. 61412345678)"
              : platform === "linkedin"
              ? "Profile ID"
              : "username"}
            class={`qr-input text-base ${usesAtPrefix ? "pl-8" : ""}`}
          />
        </div>
        <p class="text-[11px] font-mono font-bold text-[#5c4f47] truncate pt-0.5">
          {formattedPreview || "Paste full profile URL or type handle"}
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { QRTemplateType } from "../../types/qr-templates.ts";

interface Props {
  url: Signal<string>;
  type: QRTemplateType;
}

export default function SocialForm({ url, type }: Props) {
  const [handle, setHandle] = useState("");

  useEffect(() => {
    if (!handle) {
      return;
    }

    let formattedUrl = "";
    const cleanHandle = handle.trim();

    switch (type) {
      case "instagram":
        formattedUrl = `https://instagram.com/${cleanHandle.replace("@", "")}`;
        break;
      case "facebook":
        formattedUrl = `https://facebook.com/${cleanHandle}`;
        break;
      case "twitter":
        formattedUrl = `https://x.com/${cleanHandle.replace("@", "")}`;
        break;
      case "whatsapp":
        formattedUrl = `https://wa.me/${cleanHandle.replace(/[^0-9]/g, "")}`;
        break;
      default:
        formattedUrl = cleanHandle;
    }
    url.value = formattedUrl;
  }, [handle, type]);

  const getPlaceholder = () => {
    switch (type) {
      case "instagram": return "@username";
      case "facebook": return "username";
      case "twitter": return "@username";
      case "whatsapp": return "Phone number (e.g. 15551234567)";
      default: return "";
    }
  };

  const getLabel = () => {
    switch (type) {
      case "instagram": return "Instagram Username";
      case "facebook": return "Facebook Username";
      case "twitter": return "X / Twitter Handle";
      case "whatsapp": return "WhatsApp Number";
      default: return "";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "instagram": return "📸";
      case "facebook": return "👍";
      case "twitter": return "🐦";
      case "whatsapp": return "💬";
      default: return "🔗";
    }
  };

  // Using specific colors to match the "Brutalist" vibe
  const getColors = () => {
    switch (type) {
      case "instagram": return { bg: "bg-pink-50", border: "border-pink-400", text: "text-pink-600", focus: "focus:border-pink-500" };
      case "facebook": return { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-600", focus: "focus:border-blue-500" };
      case "twitter": return { bg: "bg-gray-50", border: "border-gray-400", text: "text-gray-800", focus: "focus:border-black" };
      case "whatsapp": return { bg: "bg-green-50", border: "border-green-400", text: "text-green-600", focus: "focus:border-green-500" };
      default: return { bg: "bg-gray-50", border: "border-gray-400", text: "text-gray-800", focus: "focus:border-black" };
    }
  };

  const colors = getColors();

  return (
    <div class="space-y-4 animate-slide-down">
      <div class={`${colors.bg} border-3 ${colors.border} rounded-xl p-4 shadow-chunky transition-colors`}>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">{getIcon()}</span>
          <h3 class={`font-black ${colors.text}`}>{type.charAt(0).toUpperCase() + type.slice(1)} QR</h3>
        </div>
        <p class={`text-sm ${colors.text} opacity-80 font-medium`}>
          Enter your {type === "whatsapp" ? "number" : "username"} to create a direct link.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          {getLabel()}
        </label>
        <div class="relative">
           {type !== "whatsapp" && type !== "facebook" && (
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
              @
            </span>
           )}
          <input
            type="text"
            value={handle}
            onInput={(e) => {
              setHandle((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder={getPlaceholder()}
            class={`w-full ${type !== "whatsapp" && type !== "facebook" ? "pl-9" : "px-4"} py-3 border-3 border-gray-300 rounded-xl text-lg ${colors.focus} focus:outline-none transition-colors font-medium`}
          />
        </div>
        <p class="text-xs text-gray-500 font-mono truncate">
          Preview: {url.value || "..."}
        </p>
      </div>
    </div>
  );
}

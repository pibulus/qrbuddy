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
      // Don't clear url value immediately to avoid flickering if user is typing
      // But if handle is empty, url should probably be empty or invalid
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

  const getBgColor = () => {
    switch (type) {
      case "instagram": return "bg-pink-50";
      case "facebook": return "bg-blue-50";
      case "twitter": return "bg-gray-50";
      case "whatsapp": return "bg-green-50";
      default: return "bg-gray-50";
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "instagram": return "border-pink-200";
      case "facebook": return "border-blue-200";
      case "twitter": return "border-gray-200";
      case "whatsapp": return "border-green-200";
      default: return "border-gray-200";
    }
  };

  return (
    <div class="space-y-4">
      <div class={`${getBgColor()} border-2 ${getBorderColor()} rounded-xl p-4`}>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">{getIcon()}</span>
          <h3 class="font-black text-gray-900">{type.charAt(0).toUpperCase() + type.slice(1)} QR</h3>
        </div>
        <p class="text-sm text-gray-700">
          Enter your {type === "whatsapp" ? "number" : "username"} to create a direct link.
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          {getLabel()}
        </label>
        <div class="relative">
           {type !== "whatsapp" && type !== "facebook" && (
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
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
            class={`w-full ${type !== "whatsapp" && type !== "facebook" ? "pl-9" : "px-4"} py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-black focus:outline-none`}
          />
        </div>
        <p class="text-xs text-gray-500">
          Preview: {url.value || "..."}
        </p>
      </div>
    </div>
  );
}

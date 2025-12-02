import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

type SocialPlatform = "instagram" | "facebook" | "twitter" | "whatsapp" | "tiktok" | "linkedin" | "youtube";

export default function SocialHubForm({ url }: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [handle, setHandle] = useState("");

  useEffect(() => {
    if (!handle) return;

    const cleanHandle = handle.trim();
    let formattedUrl = "";

    switch (platform) {
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
      case "tiktok":
        formattedUrl = `https://tiktok.com/@${cleanHandle.replace("@", "")}`;
        break;
      case "linkedin":
        formattedUrl = `https://linkedin.com/in/${cleanHandle}`;
        break;
      case "youtube":
        formattedUrl = `https://youtube.com/@${cleanHandle.replace("@", "")}`;
        break;
    }
    url.value = formattedUrl;
  }, [platform, handle]);

  const platforms: { id: SocialPlatform; label: string; color: string }[] = [
    { id: "instagram", label: "Instagram", color: "bg-pink-50 border-pink-400 text-pink-600" },
    { id: "twitter", label: "X / Twitter", color: "bg-gray-50 border-gray-400 text-gray-800" },
    { id: "facebook", label: "Facebook", color: "bg-blue-50 border-blue-400 text-blue-600" },
    { id: "whatsapp", label: "WhatsApp", color: "bg-green-50 border-green-400 text-green-600" },
    { id: "youtube", label: "YouTube", color: "bg-red-50 border-red-400 text-red-600" },
    { id: "linkedin", label: "LinkedIn", color: "bg-blue-50 border-blue-600 text-blue-700" },
  ];

  const currentPlatform = platforms.find(p => p.id === platform) || platforms[0];

  return (
    <div class="space-y-4 animate-slide-down">
      {/* Platform Selector */}
      <div class="grid grid-cols-3 gap-2">
        {platforms.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPlatform(p.id);
              haptics.light();
            }}
            class={`flex items-center justify-center p-3 rounded-xl border-2 transition-all font-bold ${
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
      <div class={`p-4 rounded-xl border-3 shadow-chunky transition-colors ${currentPlatform.color}`}>
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-black">{currentPlatform.label}</h3>
        </div>
        
        <div class="relative">
          {platform !== "whatsapp" && platform !== "facebook" && platform !== "linkedin" && (
            <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-50 text-lg">
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
            placeholder={
              platform === "whatsapp" ? "Phone number (e.g. 1555...)" :
              platform === "linkedin" ? "Profile ID" :
              "Username"
            }
            class={`w-full ${
              platform !== "whatsapp" && platform !== "facebook" && platform !== "linkedin" ? "pl-9" : "px-4"
            } py-3 border-3 border-black/10 bg-white/50 rounded-xl text-lg focus:bg-white focus:border-black focus:outline-none transition-colors font-bold placeholder-black/30`}
          />
        </div>
        <p class="text-xs mt-2 opacity-70 font-mono truncate">
          {url.value || "Enter username..."}
        </p>
      </div>
    </div>
  );
}

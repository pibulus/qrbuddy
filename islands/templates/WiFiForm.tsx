import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatWiFi,
  validateWiFi,
  type WiFiData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function WiFiForm({ url }: Props) {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: WiFiData = { ssid, password, encryption, hidden };
    const validationError = validateWiFi(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatWiFi(data);
    url.value = formatted;
  }, [ssid, password, encryption, hidden]);

  return (
    <div class="space-y-4">
      <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">📶</span>
          <h3 class="font-black text-blue-900">WiFi Network QR</h3>
        </div>
        <p class="text-sm text-blue-700">
          Scan to connect to your WiFi network instantly - no typing required!
        </p>
      </div>

      {/* Network Name */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Network Name (SSID) *
        </label>
        <input
          type="text"
          value={ssid}
          onInput={(e) => {
            setSsid((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="My WiFi Network"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Encryption Type */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Security Type
        </label>
        <div class="flex gap-2 flex-wrap">
          {(["WPA", "WEP", "nopass"] as const).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => {
                setEncryption(type);
                haptics.light();
              }}
              class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                ${
                encryption === type
                  ? "bg-blue-500 text-white border-blue-600 scale-105"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {type === "nopass"
                ? "None (Open)"
                : type === "WPA"
                ? "WPA/WPA2"
                : "WEP"}
            </button>
          ))}
        </div>
      </div>

      {/* Password */}
      {encryption !== "nopass" && (
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Password *
          </label>
          <input
            type="text"
            value={password}
            onInput={(e) => {
              setPassword((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="Network password"
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Hidden Network */}
      <div class="space-y-2">
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => {
              setHidden((e.target as HTMLInputElement).checked);
              haptics.light();
            }}
            class="w-5 h-5 rounded border-2 border-black cursor-pointer"
          />
          <span class="text-sm font-semibold text-gray-700 group-hover:text-blue-600">
            Hidden network
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success indicator */}
      {!error && ssid && (
        <div class="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-sm text-green-800">
          ✅ WiFi QR ready! Scan to connect to <strong>{ssid}</strong>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatWiFi,
  parseWiFi,
  validateWiFi,
  type WiFiData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function WiFiForm({ url }: Props) {
  const [initial] = useState(() => parseWiFi(url.value));
  const [ssid, setSsid] = useState(() => initial?.ssid ?? "");
  const [password, setPassword] = useState(() => initial?.password ?? "");
  const [encryption, setEncryption] = useState<"WPA" | "WEP" | "nopass">(
    () => initial?.encryption ?? "WPA",
  );
  const [hidden, setHidden] = useState(() => initial?.hidden ?? false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: WiFiData = {
      ssid,
      password: encryption === "nopass" ? "" : password,
      encryption,
      hidden,
    };
    const validationError = validateWiFi(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatWiFi(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [ssid, password, encryption, hidden]);

  const showHint = (touched || Boolean(ssid.trim() || password.trim())) &&
    Boolean(error);

  return (
    <div class="space-y-4">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900"
        >
          {error}
        </div>
      )}

      {/* Network Name */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Network Name (SSID) *
        </label>
        <input
          type="text"
          value={ssid}
          onInput={(e) => {
            setTouched(true);
            setSsid((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="My WiFi Network"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
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
                  ? "bg-[#4ECDC4] text-white border-[#3AA8A4] scale-105"
                  : "bg-white text-gray-700 border-gray-300 hover:border-[#4ECDC4]"
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
      {encryption !== "nopass"
        ? (
          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Password *
            </label>
            <div class="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onInput={(e) => {
                  setTouched(true);
                  setPassword((e.target as HTMLInputElement).value);
                  haptics.light();
                }}
                placeholder="Network password"
                class="w-full px-4 py-3 pr-20 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword((current) => !current);
                  haptics.light();
                }}
                class="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] px-3 rounded-lg text-sm font-black text-[#3AA8A4] hover:bg-[#E0FFFF]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        )
        : (
          <p class="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-2.5 text-xs font-semibold text-amber-900">
            Open network: no password encoded
          </p>
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
          <span class="text-sm font-semibold text-gray-700 group-hover:text-[#4ECDC4]">
            Hidden network
          </span>
        </label>
      </div>
    </div>
  );
}

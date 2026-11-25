import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatWiFi,
  parseWiFi,
  validateWiFi,
  type WiFiData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const ES_ERRORS: Record<string, string> = {
  "Network name (SSID) is required":
    "El nombre de la red (SSID) es obligatorio",
  "Password is required for secured networks":
    "La contraseña es obligatoria en redes protegidas",
  "Name is required": "El nombre es obligatorio",
  "Add phone, email, or website to complete card":
    "Agrega teléfono, correo o sitio web para completar la tarjeta",
  "Phone number is required": "El número de teléfono es obligatorio",
  "Valid phone number required": "Se requiere un número de teléfono válido",
  "Email address is required": "El correo es obligatorio",
  "Valid email required": "Se requiere un correo válido",
};

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

export default function WiFiForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
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
    <div class="qr-menu-pod p-3.5 space-y-3.5 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      {/* Network Name */}
      <div class="space-y-1.5">
        <label class="qr-field-label" for="wifi-ssid-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>
            {isSpanish ? "Nombre de red (SSID) *" : "Network Name (SSID) *"}
          </span>
        </label>
        <input
          id="wifi-ssid-input"
          type="text"
          value={ssid}
          onInput={(e) => {
            setTouched(true);
            setSsid((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder={isSpanish ? "Wi-Fi Invitados" : "Brunswick Guest Wi-Fi"}
          class="qr-input text-base"
        />
      </div>

      {/* Security Type */}
      <div class="space-y-1.5">
        <span class="qr-field-label">
          {isSpanish ? "Seguridad" : "Security"}
        </span>
        <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]">
          {(["WPA", "WEP", "nopass"] as const).map((type) => {
            const active = encryption === type;
            return (
              <button
                type="button"
                key={type}
                aria-pressed={active}
                onClick={() => {
                  setEncryption(type);
                  haptics.light();
                }}
                class={`min-h-[36px] px-2 rounded-lg text-xs font-black transition-all border-2 ${
                  active
                    ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                    : "border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/60"
                }`}
              >
                {type === "nopass"
                  ? (isSpanish ? "Abierta" : "Open")
                  : type === "WPA"
                  ? "WPA / WPA2"
                  : "WEP"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Password */}
      {encryption !== "nopass"
        ? (
          <div class="space-y-1.5">
            <label class="qr-field-label" for="wifi-password-input">
              <span>{isSpanish ? "Contraseña *" : "Password *"}</span>
            </label>
            <div class="relative">
              <input
                id="wifi-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onInput={(e) => {
                  setTouched(true);
                  setPassword((e.target as HTMLInputElement).value);
                  haptics.light();
                }}
                placeholder={isSpanish
                  ? "Contraseña de la red"
                  : "Network password"}
                class="qr-input text-base pr-20"
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword((current) => !current);
                  haptics.light();
                }}
                class="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] px-2.5 rounded-lg border border-[#1e1714]/25 bg-[#fbf1e4] hover:border-[#1e1714] text-xs font-black text-[#1e1714]"
              >
                {showPassword
                  ? (isSpanish ? "Ocultar" : "Hide")
                  : (isSpanish ? "Mostrar" : "Show")}
              </button>
            </div>
          </div>
        )
        : (
          <p class="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2 text-xs font-bold text-amber-950">
            {isSpanish
              ? "Red abierta: al escanear se conecta de inmediato, sin contraseña."
              : "Open network: scans join immediately with no password."}
          </p>
        )}

      {/* Hidden Network */}
      <label class="inline-flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => {
            setHidden((e.target as HTMLInputElement).checked);
            haptics.light();
          }}
          class="w-4 h-4 rounded border-2 border-[#1e1714] accent-[#1e1714] cursor-pointer"
        />
        <span class="text-xs font-black text-[#1e1714]">
          {isSpanish ? "Red con SSID oculto" : "Hidden SSID network"}
        </span>
      </label>
    </div>
  );
}

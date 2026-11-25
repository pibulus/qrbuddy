import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatLocation,
  type LocationData,
  parseLocation,
  validateLocation,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const ES_ERRORS: Record<string, string> = {
  "Address or place name is required":
    "La dirección o nombre del lugar es obligatorio",
  "Latitude and longitude are required": "Latitud y longitud son obligatorias",
  "Latitude must be between -90 and 90": "La latitud debe estar entre -90 y 90",
  "Longitude must be between -180 and 180":
    "La longitud debe estar entre -180 y 180",
};

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

export default function LocationForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
  const [initial] = useState(() => parseLocation(url.value));
  const [mode, setMode] = useState<"place" | "coords">(
    () => initial?.mode ?? "place",
  );
  const [query, setQuery] = useState(() => initial?.query ?? "");
  const [latitude, setLatitude] = useState(() => initial?.latitude ?? "");
  const [longitude, setLongitude] = useState(() => initial?.longitude ?? "");
  const [useGeoUri, setUseGeoUri] = useState(() => initial?.useGeoUri ?? false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data: LocationData = {
      mode,
      query,
      latitude,
      longitude,
      useGeoUri,
    };
    const validationError = validateLocation(data);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const formatted = formatLocation(data);
    if (formatted && url.value !== formatted) {
      url.value = formatted;
    }
  }, [mode, query, latitude, longitude, useGeoUri]);

  const showHint = (touched ||
    Boolean(query.trim() || latitude.trim() || longitude.trim())) &&
    Boolean(error);

  return (
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]">
        <button
          type="button"
          aria-pressed={mode === "place"}
          onClick={() => {
            setMode("place");
            haptics.light();
          }}
          class={`min-h-[34px] rounded-lg text-xs font-black border-2 transition-all ${
            mode === "place"
              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              : "border-transparent text-[#4a3f39] hover:text-[#1e1714]"
          }`}
        >
          {isSpanish ? "Dirección o lugar" : "Place / Address"}
        </button>
        <button
          type="button"
          aria-pressed={mode === "coords"}
          onClick={() => {
            setMode("coords");
            haptics.light();
          }}
          class={`min-h-[34px] rounded-lg text-xs font-black border-2 transition-all ${
            mode === "coords"
              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              : "border-transparent text-[#4a3f39] hover:text-[#1e1714]"
          }`}
        >
          {isSpanish ? "Coordenadas GPS" : "GPS Coordinates"}
        </button>
      </div>

      {mode === "place"
        ? (
          <div class="space-y-1.5">
            <label class="qr-field-label" for="loc-query-input">
              <span class="qr-section-pip" aria-hidden="true" />
              <span>
                {isSpanish ? "Lugar o dirección *" : "Place or Address *"}
              </span>
            </label>
            <input
              id="loc-query-input"
              type="text"
              value={query}
              onInput={(e) => {
                setTouched(true);
                setQuery((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder={isSpanish
                ? "Av. Álvaro Obregón 120, Roma Norte"
                : "Sydney Rd, Brunswick VIC 3056"}
              class="qr-input text-base"
            />
          </div>
        )
        : (
          <div class="space-y-2.5">
            <div class="grid grid-cols-2 gap-2.5">
              <div class="space-y-1">
                <label class="qr-field-label" for="loc-lat-input">
                  {isSpanish ? "Latitud *" : "Latitude *"}
                </label>
                <input
                  id="loc-lat-input"
                  type="text"
                  inputMode="decimal"
                  value={latitude}
                  onInput={(e) => {
                    setTouched(true);
                    setLatitude((e.target as HTMLInputElement).value);
                    haptics.light();
                  }}
                  placeholder="-37.7675"
                  class="qr-input text-sm font-mono"
                />
              </div>
              <div class="space-y-1">
                <label class="qr-field-label" for="loc-lng-input">
                  {isSpanish ? "Longitud *" : "Longitude *"}
                </label>
                <input
                  id="loc-lng-input"
                  type="text"
                  inputMode="decimal"
                  value={longitude}
                  onInput={(e) => {
                    setTouched(true);
                    setLongitude((e.target as HTMLInputElement).value);
                    haptics.light();
                  }}
                  placeholder="144.9621"
                  class="qr-input text-sm font-mono"
                />
              </div>
            </div>

            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useGeoUri}
                onChange={(e) => {
                  setUseGeoUri((e.target as HTMLInputElement).checked);
                  haptics.light();
                }}
                class="w-4 h-4 rounded border-2 border-[#1e1714] accent-[#1e1714]"
              />
              <span class="text-xs font-bold text-[#1e1714]">
                {isSpanish
                  ? "Usar esquema offline geo: (por defecto abre Maps universal)"
                  : "Use offline geo: scheme (default opens Google/Apple Maps)"}
              </span>
            </label>
          </div>
        )}
    </div>
  );
}

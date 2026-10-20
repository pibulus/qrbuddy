import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface TimeBombSettingsProps {
  scanLimit: number | null;
  setScanLimit: (limit: number | null) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
  lang?: Locale;
}

export default function TimeBombSettings({
  scanLimit,
  setScanLimit,
  expiryDate,
  setExpiryDate,
  lang,
}: TimeBombSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  return (
    <div class="bg-white border-2 border-black rounded-2xl p-4 mb-4 animate-slide-down">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
            {isSpanish ? "Límite de escaneos" : "Scan limit"}
          </label>
          <select
            value={scanLimit === null ? "unlimited" : String(scanLimit)}
            onChange={(e) => {
              const value = (e.target as HTMLSelectElement).value;
              setScanLimit(value === "unlimited" ? null : Number(value));
              haptics.light();
            }}
            class="w-full min-h-[44px] px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold bg-white focus:border-[#FF69B4] focus:outline-none"
          >
            <option value="unlimited">
              {isSpanish ? "Escaneos ilimitados" : "Unlimited scans"}
            </option>
            <option value="1">
              {isSpanish
                ? "1 escaneo — autodestrucción 💣"
                : "1 scan — self-destruct 💣"}
            </option>
            <option value="5">
              {isSpanish ? "5 escaneos" : "5 scans"}
            </option>
            <option value="10">
              {isSpanish ? "10 escaneos" : "10 scans"}
            </option>
            <option value="100">
              {isSpanish ? "100 escaneos" : "100 scans"}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
            {isSpanish ? "Fecha de vencimiento" : "Expiry date"}
          </label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) => {
              setExpiryDate((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            class="w-full min-h-[44px] px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-[#FF69B4] focus:outline-none"
          />
          <p class="text-xs text-gray-500">
            {isSpanish
              ? "Déjalo en blanco si no vence. Puedes cambiar ambos cuando quieras desde tu link de edición."
              : "Leave blank for no expiry. You can change both anytime from your edit link."}
          </p>
        </div>
      </div>
    </div>
  );
}

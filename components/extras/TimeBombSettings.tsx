import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface TimeBombSettingsProps {
  scanLimit: number | null;
  setScanLimit: (limit: number | null) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
  embedded?: boolean;
  lang?: Locale;
}

export default function TimeBombSettings({
  scanLimit,
  setScanLimit,
  expiryDate,
  setExpiryDate,
  embedded = false,
  lang,
}: TimeBombSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const shellClass = embedded
    ? "space-y-3"
    : "bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 mb-4 space-y-3 animate-slide-down";

  return (
    <div class={shellClass}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="block text-xs font-black text-[#1e1714] uppercase tracking-wide whitespace-nowrap">
            {isSpanish ? "Límite de escaneos" : "Scan limit"}
          </label>
          <select
            value={scanLimit === null ? "unlimited" : String(scanLimit)}
            onChange={(e) => {
              const value = (e.target as HTMLSelectElement).value;
              setScanLimit(value === "unlimited" ? null : Number(value));
              haptics.light();
            }}
            class="w-full min-h-[42px] px-3 py-1.5 border-2 border-[#1e1714]/20 rounded-xl text-sm font-bold bg-[#fffef7] text-[#1e1714] focus:border-[#1e1714] focus:outline-none"
          >
            <option value="unlimited">
              {isSpanish ? "∞ Ilimitados" : "∞ Unlimited scans"}
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

        <div class="space-y-1">
          <label class="block text-xs font-black text-[#1e1714] uppercase tracking-wide whitespace-nowrap">
            {isSpanish ? "Vencimiento" : "Expiry date"}
          </label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) => {
              setExpiryDate((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            class="w-full min-h-[42px] px-3 py-1.5 border-2 border-[#1e1714]/20 rounded-xl text-sm font-bold bg-[#fffef7] text-[#1e1714] focus:border-[#1e1714] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

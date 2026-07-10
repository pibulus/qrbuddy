import { haptics } from "../../utils/haptics.ts";

interface TimeBombSettingsProps {
  scanLimit: number | null;
  setScanLimit: (limit: number | null) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
}

export default function TimeBombSettings({
  scanLimit,
  setScanLimit,
  expiryDate,
  setExpiryDate,
}: TimeBombSettingsProps) {
  return (
    <div class="bg-white/60 rounded-xl p-3 mb-4 border-2 border-red-200 animate-slide-down">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Scan limit
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
            <option value="unlimited">Unlimited scans</option>
            <option value="1">1 scan — self-destruct 💣</option>
            <option value="5">5 scans</option>
            <option value="10">10 scans</option>
            <option value="100">100 scans</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Expiry date
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
            Leave blank for no expiry. You can change both anytime from your
            edit link.
          </p>
        </div>
      </div>
    </div>
  );
}

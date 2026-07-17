import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatPhone,
  type PhoneData,
  validatePhone,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function PhoneForm({ url }: Props) {
  const [phone, setPhone] = useState("");
  const [_error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: PhoneData = { phone };
    const validationError = validatePhone(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    url.value = formatPhone(data);
  }, [phone]);

  return (
    <div class="space-y-4">
      <div class="bg-[#E8F5E9] border-3 border-[#66BB6A] rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">📞</span>
          <h3 class="font-black text-[#2E7D32]">Phone Call QR</h3>
        </div>
        <p class="text-sm text-[#2E7D32]">
          Scan to dial — great for business cards and flyers.
        </p>
      </div>

      {/* Phone Number */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Phone Number *
        </label>
        <input
          type="tel"
          value={phone}
          onInput={(e) => {
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="+1 (555) 123-4567"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#66BB6A] focus:outline-none"
        />
        <p class="text-xs text-gray-500">
          Include country code (e.g., +61 for Australia)
        </p>
      </div>
    </div>
  );
}

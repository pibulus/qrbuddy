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
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
        <p class="text-xs text-gray-500">
          Include country code (e.g., +61 for Australia)
        </p>
      </div>
    </div>
  );
}

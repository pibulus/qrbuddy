import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatPhone,
  parsePhone,
  type PhoneData,
  validatePhone,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function PhoneForm({ url }: Props) {
  const [initial] = useState(() => parsePhone(url.value));
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: PhoneData = { phone };
    const validationError = validatePhone(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatPhone(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [phone]);

  const showHint = (touched || Boolean(phone.trim())) && Boolean(error);

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

      {/* Phone Number */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Phone Number *
        </label>
        <input
          type="tel"
          value={phone}
          onInput={(e) => {
            setTouched(true);
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="+1 (555) 123-4567"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
        <p class="text-xs text-gray-500">
          Country code recommended (e.g., +61 412 345 678)
        </p>
      </div>
    </div>
  );
}

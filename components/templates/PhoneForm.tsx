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
    <div class="qr-menu-pod p-3.5 space-y-2.5 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {error}
        </div>
      )}

      <div class="space-y-1.5">
        <label class="qr-field-label" for="phone-number-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>Phone Number *</span>
        </label>
        <input
          id="phone-number-input"
          type="tel"
          value={phone}
          onInput={(e) => {
            setTouched(true);
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="+61 412 345 678"
          class="qr-input text-base"
        />
        <p class="text-[11px] font-semibold text-[#6e6058]">
          Include country code for international callers (e.g. +61, +52, +1).
        </p>
      </div>
    </div>
  );
}

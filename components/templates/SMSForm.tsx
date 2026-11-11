import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatSMS,
  parseSMS,
  type SMSData,
  validateSMS,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function SMSForm({ url }: Props) {
  const [initial] = useState(() => parseSMS(url.value));
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [message, setMessage] = useState(() => initial?.message ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: SMSData = { phone, message };
    const validationError = validateSMS(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatSMS(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [phone, message]);

  const showHint = (touched || Boolean(phone.trim() || message.trim())) &&
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
          Country code recommended (e.g., +1 555 123 4567)
        </p>
      </div>

      {/* Message */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Message
        </label>
        <textarea
          value={message}
          onInput={(e) => {
            setTouched(true);
            setMessage((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder="Optional text message..."
          rows={4}
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none resize-none"
        />
        <p class="text-xs text-gray-500">
          {message.length} characters
        </p>
      </div>
    </div>
  );
}

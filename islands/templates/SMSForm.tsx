import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatSMS,
  validateSMS,
  type SMSData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function SMSForm({ url }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
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
    url.value = formatted;
  }, [phone, message]);

  return (
    <div class="space-y-4">
      <div class="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">💬</span>
          <h3 class="font-black text-pink-900">SMS Message QR</h3>
        </div>
        <p class="text-sm text-pink-700">
          Scan to open a pre-filled text message - perfect for feedback, contests, or quick replies!
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
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-pink-500 focus:outline-none"
        />
        <p class="text-xs text-gray-500">
          Include country code (e.g., +1 for US)
        </p>
      </div>

      {/* Message */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Message *
        </label>
        <textarea
          value={message}
          onInput={(e) => {
            setMessage((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Enter your pre-filled message here..."
          rows={4}
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-pink-500 focus:outline-none resize-none"
        />
        <p class="text-xs text-gray-500">
          {message.length} characters
        </p>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success indicator */}
      {!error && phone && message && (
        <div class="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-sm text-green-800">
          ✅ SMS QR ready! Will send to <strong>{phone}</strong>
        </div>
      )}
    </div>
  );
}

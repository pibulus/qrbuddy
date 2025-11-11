import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatEmail,
  validateEmail,
  type EmailData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function EmailForm({ url }: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: EmailData = { to, subject, body };
    const validationError = validateEmail(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatEmail(data);
    url.value = formatted;
  }, [to, subject, body]);

  return (
    <div class="space-y-4">
      <div class="bg-yellow-50 border-3 border-yellow-200 rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">📧</span>
          <h3 class="font-black text-yellow-900">Email QR</h3>
        </div>
        <p class="text-sm text-yellow-700">
          Scan to open email app with pre-filled recipient, subject, and message!
        </p>
      </div>

      {/* Email Address */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Email Address *
        </label>
        <input
          type="email"
          value={to}
          onInput={(e) => {
            setTo((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="contact@example.com"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-yellow-500 focus:outline-none"
        />
      </div>

      {/* Subject */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onInput={(e) => {
            setSubject((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Inquiry about..."
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-yellow-500 focus:outline-none"
        />
      </div>

      {/* Body */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Message Body
        </label>
        <textarea
          value={body}
          onInput={(e) => {
            setBody((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Enter your pre-filled message here..."
          rows={4}
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-yellow-500 focus:outline-none resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-50 border-3 border-red-300 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success indicator */}
      {!error && to && (
        <div class="bg-green-50 border-3 border-green-300 rounded-lg p-3 text-sm text-green-800">
          ✅ Email QR ready! Will send to <strong>{to}</strong>
        </div>
      )}
    </div>
  );
}

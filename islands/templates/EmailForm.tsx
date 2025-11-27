import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  type EmailData,
  formatEmail,
  validateEmail,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function EmailForm({ url }: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [_error, setError] = useState<string | null>(null);

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
      <div class="bg-[#FFF8F0] border-3 border-[#FFE5B4] rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">📧</span>
          <h3 class="font-black text-[#CC9966]">Email QR</h3>
        </div>
        <p class="text-sm text-[#CC9966]">
          Scan to open pre-filled email.
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
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#FFE5B4] focus:outline-none"
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
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#FFE5B4] focus:outline-none"
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
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#FFE5B4] focus:outline-none resize-none"
        />
      </div>

    </div>
  );
}

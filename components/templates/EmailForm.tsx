import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  type EmailData,
  formatEmail,
  parseEmail,
  validateEmail,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function EmailForm({ url }: Props) {
  const [initial] = useState(() => parseEmail(url.value));
  const [to, setTo] = useState(() => initial?.email ?? "");
  const [subject, setSubject] = useState(() => initial?.subject ?? "");
  const [body, setBody] = useState(() => initial?.body ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: EmailData = { email: to, subject, body };
    const validationError = validateEmail(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatEmail(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [to, subject, body]);

  const showHint =
    (touched || Boolean(to.trim() || subject.trim() || body.trim())) &&
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

      {/* Email Address */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Email Address *
        </label>
        <input
          type="email"
          value={to}
          onInput={(e) => {
            setTouched(true);
            setTo((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="contact@example.com"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
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
            setTouched(true);
            setSubject((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Inquiry about..."
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
      </div>

      {/* Body */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Message
        </label>
        <textarea
          value={body}
          onInput={(e) => {
            setTouched(true);
            setBody((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder="Optional message body..."
          rows={4}
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

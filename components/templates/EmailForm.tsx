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
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
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
        <label class="qr-field-label" for="email-to-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>Email Address *</span>
        </label>
        <input
          id="email-to-input"
          type="email"
          value={to}
          onInput={(e) => {
            setTouched(true);
            setTo((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="hello@example.com"
          class="qr-input text-base"
        />
      </div>

      <div class="space-y-1.5">
        <label class="qr-field-label" for="email-subject-input">
          <span>Subject</span>
        </label>
        <input
          id="email-subject-input"
          type="text"
          value={subject}
          onInput={(e) => {
            setTouched(true);
            setSubject((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Inquiry about..."
          class="qr-input text-sm"
        />
      </div>

      <div class="space-y-1.5">
        <label class="qr-field-label" for="email-body-input">
          <span>Message</span>
        </label>
        <textarea
          id="email-body-input"
          value={body}
          onInput={(e) => {
            setTouched(true);
            setBody((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder="Optional pre-filled email body..."
          rows={3}
          class="qr-input text-sm resize-none"
        />
      </div>
    </div>
  );
}

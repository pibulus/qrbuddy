import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  type EmailData,
  formatEmail,
  parseEmail,
  validateEmail,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const ES_ERRORS: Record<string, string> = {
  "Network name (SSID) is required":
    "El nombre de la red (SSID) es obligatorio",
  "Password is required for secured networks":
    "La contraseña es obligatoria en redes protegidas",
  "Name is required": "El nombre es obligatorio",
  "Add phone, email, or website to complete card":
    "Agrega teléfono, correo o sitio web para completar la tarjeta",
  "Phone number is required": "El número de teléfono es obligatorio",
  "Valid phone number required": "Se requiere un número de teléfono válido",
  "Email address is required": "El correo es obligatorio",
  "Valid email required": "Se requiere un correo válido",
};

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

export default function EmailForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
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
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      <div class="space-y-1.5">
        <label class="qr-field-label" for="email-to-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{isSpanish ? "Correo electrónico *" : "Email Address *"}</span>
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
          placeholder={isSpanish ? "hola@ejemplo.com" : "hello@example.com"}
          class="qr-input text-base"
        />
      </div>

      <div class="space-y-1.5">
        <label class="qr-field-label" for="email-subject-input">
          <span>{isSpanish ? "Asunto" : "Subject"}</span>
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
          placeholder={isSpanish ? "Consulta sobre..." : "Inquiry about..."}
          class="qr-input text-sm"
        />
      </div>

      <div class="space-y-1.5">
        <label class="qr-field-label" for="email-body-input">
          <span>{isSpanish ? "Mensaje" : "Message"}</span>
        </label>
        <textarea
          id="email-body-input"
          value={body}
          onInput={(e) => {
            setTouched(true);
            setBody((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "Cuerpo del correo prellenado (opcional)..."
            : "Optional pre-filled email body..."}
          rows={3}
          class="qr-input text-sm resize-none"
        />
      </div>
    </div>
  );
}

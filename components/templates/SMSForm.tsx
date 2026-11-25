import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatSMS,
  parseSMS,
  type SMSData,
  validateSMS,
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

export default function SMSForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
  const [initial] = useState(() => parseSMS(url.value));
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [message, setMessage] = useState(() => initial?.message ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <label class="qr-field-label" for="sms-phone-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{isSpanish ? "Número de teléfono *" : "Phone Number *"}</span>
        </label>
        <input
          id="sms-phone-input"
          type="tel"
          value={phone}
          onInput={(e) => {
            setTouched(true);
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder={isSpanish ? "+52 55 1234 5678" : "+61 412 345 678"}
          class="qr-input text-base"
        />
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="qr-field-label" for="sms-message-input">
            <span>{isSpanish ? "Texto prellenado" : "Pre-filled Text"}</span>
          </label>
          <span class="text-[11px] font-bold text-[#6e6058] tabular-nums">
            {message.length} {isSpanish ? "caracteres" : "chars"}
          </span>
        </div>
        <textarea
          id="sms-message-input"
          value={message}
          onInput={(e) => {
            setTouched(true);
            setMessage((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "Texto del SMS (opcional)..."
            : "Optional SMS body..."}
          rows={3}
          class="qr-input text-sm resize-none"
        />
      </div>
    </div>
  );
}

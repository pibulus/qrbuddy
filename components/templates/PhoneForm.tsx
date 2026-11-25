import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatPhone,
  parsePhone,
  type PhoneData,
  validatePhone,
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

export default function PhoneForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
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
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      <div class="space-y-1.5">
        <label class="qr-field-label" for="phone-number-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{isSpanish ? "Número de teléfono *" : "Phone Number *"}</span>
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
          placeholder={isSpanish ? "+52 55 1234 5678" : "+61 412 345 678"}
          class="qr-input text-base"
        />
        <p class="text-[11px] font-semibold text-[#6e6058]">
          {isSpanish
            ? "Incluir código de país para llamadas internacionales (ej. +52, +61, +1)."
            : "Include country code for international callers (e.g. +61, +52, +1)."}
        </p>
      </div>
    </div>
  );
}

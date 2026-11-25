import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatWhatsApp,
  parseWhatsApp,
  validateWhatsApp,
  type WhatsAppData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const QUICK_STARTERS = {
  en: [
    "Hi! Quick question about…",
    "Order for Table #",
    "RSVP Yes! See you there",
  ],
  es: [
    "¡Hola! Quiero info sobre…",
    "Pedido para la Mesa #",
    "¡Confirmo asistencia!",
  ],
} as const;

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

export default function WhatsAppForm({ url, lang }: Props) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const [initial] = useState(() => parseWhatsApp(url.value));
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [message, setMessage] = useState(() => initial?.message ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data: WhatsAppData = { phone, message };
    const validationError = validateWhatsApp(data);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const formatted = formatWhatsApp(data);
    if (formatted && url.value !== formatted) {
      url.value = formatted;
    }
  }, [phone, message]);

  const showHint = (touched || Boolean(phone.trim() || message.trim())) &&
    Boolean(error);
  const errorCopy = error === "Phone number is required"
    ? (isSpanish
      ? "El número con lada es obligatorio"
      : "Phone number with country code is required")
    : (isSpanish
      ? "Incluye lada + número completo (ej. +52 55 1234 5678)"
      : "Include country code + digits (e.g. +61 412 345 678)");

  const starters = isSpanish ? QUICK_STARTERS.es : QUICK_STARTERS.en;

  return (
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {errorCopy}
        </div>
      )}

      <div class="space-y-1.5">
        <label class="qr-field-label" for="wa-phone-input">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>
            {isSpanish
              ? "Número WhatsApp (con lada) *"
              : "WhatsApp Number (country code) *"}
          </span>
        </label>
        <input
          id="wa-phone-input"
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
        <div class="flex items-center justify-between gap-2">
          <label class="qr-field-label" for="wa-message-input">
            <span>
              {isSpanish ? "Mensaje prellenado" : "Pre-filled Message"}
            </span>
          </label>
          <span class="text-[11px] font-bold text-[#6e6058] tabular-nums">
            {message.length}/250
          </span>
        </div>
        <textarea
          id="wa-message-input"
          value={message}
          maxLength={250}
          onInput={(e) => {
            setTouched(true);
            setMessage((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "¡Hola! Me gustaría reservar / pedir…"
            : "Hi! I'd like to book / order…"}
          rows={3}
          class="qr-input text-sm resize-none"
        />
        <div class="flex flex-wrap gap-1.5 pt-0.5">
          {starters.map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => {
                setTouched(true);
                setMessage(snippet);
                haptics.light();
              }}
              class="min-h-[30px] px-2.5 rounded-full border border-[#1e1714]/25 bg-[#fbf1e4] hover:border-[#1e1714] hover:bg-[#fffef7] text-[11px] font-bold text-[#1e1714] transition-colors"
            >
              {snippet}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

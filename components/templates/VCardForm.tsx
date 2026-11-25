import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatVCard,
  parseVCard,
  validateVCard,
  type VCardData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { estimatePrintSpecForPayload } from "../../utils/print-artifacts.ts";

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

export default function VCardForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
  const [initial] = useState(() => parseVCard(url.value));
  const [firstName, setFirstName] = useState(() => initial?.firstName ?? "");
  const [lastName, setLastName] = useState(() => initial?.lastName ?? "");
  const [organization, setOrganization] = useState(
    () => initial?.organization ?? "",
  );
  const [title, setTitle] = useState(() => initial?.jobTitle ?? "");
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [email, setEmail] = useState(() => initial?.email ?? "");
  const [website, setWebsite] = useState(() => initial?.website ?? "");
  const [address, setAddress] = useState(() => initial?.address ?? "");
  const [note, setNote] = useState(() => initial?.note ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data: VCardData = {
      firstName,
      lastName,
      organization,
      jobTitle: title,
      phone,
      email,
      website,
      address,
      note,
    };
    const validationError = validateVCard(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatVCard(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [
    firstName,
    lastName,
    organization,
    title,
    phone,
    email,
    website,
    address,
    note,
  ]);

  const hasAnyInput = Boolean(
    firstName.trim() ||
      lastName.trim() ||
      organization.trim() ||
      title.trim() ||
      phone.trim() ||
      email.trim() ||
      website.trim() ||
      address.trim() ||
      note.trim(),
  );
  const showHint = (touched || hasAnyInput) && Boolean(error);
  const densitySpec = !error && hasAnyInput && url.value.trim()
    ? estimatePrintSpecForPayload(url.value)
    : null;
  const hasOptionalDetails = Boolean(address.trim() || note.trim());

  return (
    <div class="space-y-3 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      {densitySpec && densitySpec.moduleCount >= 53 && (
        <div
          role="status"
          aria-live="polite"
          data-vcard-density-guard
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2.5 space-y-2 text-xs text-amber-950"
        >
          <p class="font-bold leading-snug">
            {isSpanish
              ? `Cuadrícula densa (${densitySpec.moduleCount}×${densitySpec.moduleCount}) · Imprimir ≥ ${densitySpec.minMm} mm (${
                densitySpec.minInches.toFixed(1)
              }″) en tarjetas`
              : `Dense ${densitySpec.moduleCount}×${densitySpec.moduleCount} grid · Print ≥ ${densitySpec.minMm} mm (${
                densitySpec.minInches.toFixed(1)
              }″) on business cards`}
          </p>
          {hasOptionalDetails && (
            <button
              type="button"
              onClick={() => {
                setAddress("");
                setNote("");
                haptics.light();
              }}
              class="min-h-[32px] px-3 py-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#ffbe0b] text-[11px] font-black text-[#1e1714] transition-colors"
            >
              {isSpanish
                ? "Compactar para tarjeta de 20 mm (quitar dirección/nota)"
                : "Trim optional fields for 20 mm cards"}
            </button>
          )}
        </div>
      )}

      {/* Pod 1: Identity & Role */}
      <div class="qr-menu-pod p-3.5 space-y-3">
        <span class="qr-section-eyebrow">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{isSpanish ? "Identidad y Cargo" : "Identity & Role"}</span>
        </span>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-first-name">
              {isSpanish ? "Nombre *" : "First Name *"}
            </label>
            <input
              id="vcard-first-name"
              type="text"
              value={firstName}
              onInput={(e) => {
                setTouched(true);
                setFirstName((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder="Ada"
              class="qr-input text-sm"
            />
          </div>
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-last-name">
              {isSpanish ? "Apellido" : "Last Name"}
            </label>
            <input
              id="vcard-last-name"
              type="text"
              value={lastName}
              onInput={(e) => {
                setTouched(true);
                setLastName((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder="Lovelace"
              class="qr-input text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-org">
              {isSpanish ? "Organización" : "Organization"}
            </label>
            <input
              id="vcard-org"
              type="text"
              value={organization}
              onInput={(e) => {
                setTouched(true);
                setOrganization((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder={isSpanish ? "Nombre del Estudio" : "Studio Name"}
              class="qr-input text-sm"
            />
          </div>
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-title">
              {isSpanish ? "Cargo / Puesto" : "Role / Title"}
            </label>
            <input
              id="vcard-title"
              type="text"
              value={title}
              onInput={(e) => {
                setTouched(true);
                setTitle((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder={isSpanish ? "Fundadora" : "Founder"}
              class="qr-input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Pod 2: Direct Channels */}
      <div class="qr-menu-pod p-3.5 space-y-2.5">
        <span class="qr-section-eyebrow">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{isSpanish ? "Contacto Directo" : "Direct Channels"}</span>
        </span>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-phone">
              {isSpanish ? "Teléfono" : "Phone"}
            </label>
            <input
              id="vcard-phone"
              type="tel"
              value={phone}
              onInput={(e) => {
                setTouched(true);
                setPhone((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder={isSpanish ? "+52 55 1234 5678" : "+61 412 345 678"}
              class="qr-input text-sm"
            />
          </div>
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-email">
              {isSpanish ? "Correo" : "Email"}
            </label>
            <input
              id="vcard-email"
              type="email"
              value={email}
              onInput={(e) => {
                setTouched(true);
                setEmail((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder="ada@example.com"
              class="qr-input text-sm"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="qr-field-label" for="vcard-website">
            {isSpanish ? "Sitio web" : "Website"}
          </label>
          <input
            id="vcard-website"
            type="url"
            value={website}
            onInput={(e) => {
              setTouched(true);
              setWebsite((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="https://example.com"
            class="qr-input text-sm"
          />
        </div>
      </div>

      {/* Pod 3: Optional Location & Note */}
      <details
        open={Boolean(address.trim() || note.trim())}
        class="group qr-menu-pod overflow-hidden"
      >
        <summary class="list-none cursor-pointer min-h-[42px] px-3.5 py-2.5 flex items-center justify-between gap-2 select-none">
          <span class="qr-section-eyebrow">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>
              {isSpanish
                ? "Dirección y Nota (opcional)"
                : "Address & Note (optional)"}
            </span>
          </span>
          <span class="text-xs font-black text-[#4a3f39] transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div class="px-3.5 pb-3.5 pt-2 border-t border-[#1e1714]/10 space-y-2.5">
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-address">
              {isSpanish ? "Dirección" : "Address"}
            </label>
            <input
              id="vcard-address"
              type="text"
              value={address}
              onInput={(e) => {
                setTouched(true);
                setAddress((e.target as HTMLInputElement).value);
                haptics.light();
              }}
              placeholder={isSpanish
                ? "Ciudad de México, México"
                : "Brunswick VIC, Australia"}
              class="qr-input text-sm"
            />
          </div>
          <div class="space-y-1">
            <label class="qr-field-label" for="vcard-note">
              {isSpanish ? "Nota" : "Note"}
            </label>
            <textarea
              id="vcard-note"
              value={note}
              onInput={(e) => {
                setTouched(true);
                setNote((e.target as HTMLTextAreaElement).value);
                haptics.light();
              }}
              placeholder={isSpanish
                ? "Contexto, horario del estudio o usuario..."
                : "Context, studio hours, or handle..."}
              rows={2}
              class="qr-input text-sm resize-none"
            />
          </div>
        </div>
      </details>
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import { getHistory } from "../../utils/history.ts";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import type { ActiveTab } from "../CreateModal.tsx";

const TEMPLATE_LABELS_ES: Record<QRTemplateType, string> = {
  url: "Enlace",
  text: "Texto",
  wifi: "Wi-Fi",
  vcard: "Contacto",
  sms: "SMS",
  email: "Correo",
  phone: "Llamada",
  social: "Redes",
  media: "Archivo",
};

/**
 * The stage recipe: everything under the QR — the input, the Static/Editable
 * bar, the live-link strip and these tiles — is the same paper. Cream
 * surface, 3px sepia border, squircle radius, a 4px bottom shadow that
 * presses flat. Theme tint (`--qr-theme-*`, set from the active palette)
 * marks "the current thing", so the stage recolours with the QR.
 */
export const STAGE_SURFACE =
  "bg-[#fffef7] border-3 border-[#1e1714] rounded-2xl shadow-[0_4px_0_#1e1714]";

export const STAGE_PRESS =
  "transition-all duration-150 hover:-translate-y-px hover:shadow-[0_5px_0_#1e1714] active:translate-y-[2px] active:shadow-[0_2px_0_#1e1714]";

const TILE =
  `${STAGE_SURFACE} ${STAGE_PRESS} min-h-[52px] flex items-center justify-center gap-1.5 font-black text-[#1e1714] text-sm whitespace-nowrap`;

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  onOpenCreate: (tab: ActiveTab) => void;
  createHasUpdates: boolean;
  onShowHistory: () => void;
  onShowReader: () => void;
  isBucket?: boolean;
  isBatchMode?: boolean;
  lang?: Locale;
}

export default function SmartInputToolbar({
  selectedTemplate,
  onOpenCreate,
  createHasUpdates,
  onShowHistory,
  onShowReader,
  isBucket = false,
  isBatchMode = false,
  lang,
}: SmartInputToolbarProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const templateMeta = QR_TEMPLATES[selectedTemplate];
  const activeIcon = isBatchMode
    ? "📦"
    : isBucket
    ? "🪣"
    : selectedTemplate === "vcard"
    ? "🪪"
    : templateMeta.icon;
  const activeLabel = isBatchMode
    ? (isSpanish ? "Lote" : "Bulk")
    : isBucket
    ? (isSpanish ? "Buzón" : "Locker")
    : isSpanish
    ? (TEMPLATE_LABELS_ES[selectedTemplate] ?? templateMeta.label)
    : templateMeta.label;
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(getHistory().length > 0);
    const handleUpdate = () => {
      setHasHistory(getHistory().length > 0);
    };
    globalThis.addEventListener("history-updated", handleUpdate);
    return () =>
      globalThis.removeEventListener("history-updated", handleUpdate);
  }, []);

  const press = (fn: () => void) => () => {
    fn();
    haptics.light();
    sounds.click();
  };

  return (
    <div
      class={`grid gap-3 w-full ${
        hasHistory
          ? "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
      }`}
    >
      {/* What the QR holds — the current type, tinted like the QR itself */}
      <button
        type="button"
        onClick={press(() => onOpenCreate("type"))}
        class={`${TILE} relative min-w-0 px-3 bg-[var(--qr-theme-tint,#fdf2f8)] hover:bg-[var(--qr-theme-tint-strong,#fbcfe8)]`}
        title={isSpanish
          ? "Cambiar el tipo de QR: enlace, Wi-Fi, contacto, archivo…"
          : "Change the QR type: link, Wi-Fi, contact card, file…"}
        aria-label={isSpanish
          ? `Tipo de QR: ${activeLabel}. Cambiar tipo`
          : `QR type: ${activeLabel}. Change type`}
      >
        <span aria-hidden="true" class="text-base leading-none shrink-0">
          {activeIcon}
        </span>
        <span class="truncate">{activeLabel}</span>
        <span aria-hidden="true" class="text-[10px] opacity-60 shrink-0">
          ▾
        </span>
        {createHasUpdates && (
          <span class="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[var(--qr-theme-accent,#ec4899)] border-2 border-[#1e1714] animate-pulse" />
        )}
      </button>

      {/* How it looks — palette, logo, frame, shapes */}
      <button
        type="button"
        onClick={press(() => onOpenCreate("design"))}
        class={`${TILE} px-2 hover:bg-[var(--qr-theme-tint,#fdf2f8)]`}
        title={isSpanish
          ? "Colores, logo, marco y forma de los módulos"
          : "Colours, logo, print frame and dot shapes"}
      >
        {isSpanish ? "Diseño" : "Design"}
      </button>

      {/* Check a code before opening it — image, screenshot or camera */}
      <button
        type="button"
        onClick={press(onShowReader)}
        class={`${TILE} px-2 hover:bg-[var(--qr-theme-tint,#fdf2f8)]`}
        title={isSpanish
          ? "Ver a dónde lleva un QR antes de abrirlo: imagen, captura o cámara"
          : "See where a QR goes before opening it: image, screenshot or camera"}
        aria-label={isSpanish ? "Revisar un QR" : "Inspect a QR code"}
      >
        {isSpanish ? "Revisar" : "Inspect"}
      </button>

      {hasHistory && (
        <button
          type="button"
          onClick={press(onShowHistory)}
          class={`${TILE} w-[52px] hover:bg-[var(--qr-theme-tint,#fdf2f8)] animate-pop-in`}
          title={isSpanish ? "Historial" : "History"}
          aria-label={isSpanish ? "Abrir historial" : "Open QR history"}
        >
          <span aria-hidden="true" class="text-lg leading-none">🕰️</span>
        </button>
      )}
    </div>
  );
}

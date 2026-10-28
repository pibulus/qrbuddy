import { useEffect, useState } from "preact/hooks";
import { getHistory } from "../../utils/history.ts";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

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

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  setIsCreateModalOpen: (isOpen: boolean) => void;
  setCreateHasUpdates: (hasUpdates: boolean) => void;
  createHasUpdates: boolean;
  onShowHistory: () => void;
  onShowReader: () => void;
  isBucket?: boolean;
  isBatchMode?: boolean;
  lang?: Locale;
}
export default function SmartInputToolbar({
  selectedTemplate,
  setIsCreateModalOpen,
  setCreateHasUpdates,
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
  const isSpecialMode = isBatchMode || isBucket || selectedTemplate !== "url";
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    // Initial check
    setHasHistory(getHistory().length > 0);

    // Listen for updates
    const handleUpdate = () => {
      setHasHistory(getHistory().length > 0);
    };

    globalThis.addEventListener("history-updated", handleUpdate);
    return () =>
      globalThis.removeEventListener("history-updated", handleUpdate);
  }, []);

  return (
    <div class="w-full space-y-2.5">
      <button
        type="button"
        onClick={() => {
          setIsCreateModalOpen(true);
          setCreateHasUpdates(false);
          haptics.light();
          sounds.click();
        }}
        class="group w-full min-w-0 min-h-[52px] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-3 border-[#1e1714] bg-[var(--qr-theme-tint,#fdf2f8)] shadow-chunky hover:shadow-chunky-hover hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-[var(--qr-theme-tint-strong,#fbcfe8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-chunky transition-all duration-150 font-black overflow-hidden"
        title={isSpanish
          ? "Elegir tipo de QR, archivos, comportamiento y diseño"
          : "Choose QR type, files, options, and logo"}
        aria-label={createHasUpdates
          ? (isSpanish
            ? "Personalizar tipo de QR, archivos, comportamiento y diseño (hay novedades)"
            : "Choose QR type, files, options, and logo (new links waiting)")
          : (isSpanish
            ? "Personalizar tipo de QR, archivos, comportamiento y diseño"
            : "Choose QR type, files, options, and logo")}
      >
        <span class="font-black text-sm sm:text-base text-[#1e1714] shrink-0 whitespace-nowrap">
          {isSpanish ? "✨ Haz que haga trucos" : "✨ Make it do tricks"}
        </span>
        <span
          class={`text-xs font-black truncate ${
            isSpecialMode
              ? "rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2.5 py-0.5 text-[#1e1714]"
              : "text-[#57524b] hidden min-[380px]:inline"
          }`}
        >
          {isSpecialMode
            ? `${activeIcon} ${activeLabel}`
            : (isSpanish
              ? "(Wi-Fi · Archivos · Ruleta)"
              : "(WiFi · Drops · Roulette)")}
        </span>
        {createHasUpdates && (
          <span class="w-2.5 h-2.5 shrink-0 rounded-full bg-pink-500 animate-pulse" />
        )}
      </button>

      {/* Quiet secondary micro-links below primary stage CTA */}
      <div class="flex items-center justify-center gap-4 pt-0.5">
        <button
          type="button"
          onClick={() => {
            onShowReader();
            haptics.light();
            sounds.click();
          }}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black text-[#57524b] hover:text-[#1e1714] hover:bg-[#1e1714]/5 transition-colors"
          title={isSpanish
            ? "Escudo callejero: descubre a dónde lleva un QR desconocido antes de abrirlo"
            : "Street-safe QR airlock: unmask where a mystery QR goes before opening"}
          aria-label={isSpanish
            ? "Revisar QR de forma segura"
            : "Inspect or scan a mystery QR code safely"}
        >
          <span aria-hidden="true">🔍</span>
          <span>{isSpanish ? "Revisar un QR" : "Inspect a QR"}</span>
        </button>

        {hasHistory && (
          <>
            <span class="text-[#1e1714]/25 font-black" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                onShowHistory();
                haptics.light();
                sounds.click();
              }}
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black text-[#57524b] hover:text-[#1e1714] hover:bg-[#1e1714]/5 transition-colors"
              title={isSpanish
                ? "Máquina del Tiempo (Historial)"
                : "Time Machine (History)"}
              aria-label={isSpanish ? "Abrir Historial" : "Open QR history"}
            >
              <span aria-hidden="true">🕰️</span>
              <span>{isSpanish ? "Historial" : "History"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

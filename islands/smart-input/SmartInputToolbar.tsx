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
    <div
      class={`grid ${
        hasHistory
          ? "grid-cols-[minmax(0,1fr)_auto_auto]"
          : "grid-cols-[minmax(0,1fr)_auto]"
      } gap-2 sm:gap-3 text-sm w-full`}
    >
      <button
        type="button"
        onClick={() => {
          setIsCreateModalOpen(true);
          setCreateHasUpdates(false);
          haptics.light();
          sounds.click();
        }}
        class="group w-full min-w-0 min-h-[52px] flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-3 rounded-xl border-3 border-black bg-blue-50 shadow-chunky hover:shadow-chunky-hover hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-blue-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-chunky transition-all duration-150 font-bold overflow-hidden"
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
        <span class="group-hover:text-blue-700 font-black text-xs min-[360px]:text-sm shrink-0 whitespace-nowrap">
          {isSpanish ? "Personalizar ✨" : "Customize ✨"}
        </span>
        <span
          class={`text-xs font-black truncate ${
            isSpecialMode
              ? "rounded-full border border-black bg-amber-200 px-2 py-0.5 text-black"
              : "text-gray-600"
          } ${
            hasHistory
              ? "hidden min-[400px]:inline"
              : "hidden min-[340px]:inline"
          }`}
        >
          {isSpecialMode
            ? `${activeIcon} ${activeLabel}`
            : `· ${activeIcon} ${activeLabel}`}
        </span>
        {hasHistory && (
          <span
            class="hidden min-[360px]:inline min-[400px]:hidden text-xs text-gray-600 font-black shrink-0"
            aria-hidden="true"
          >
            {activeIcon}
          </span>
        )}
        {createHasUpdates && (
          <span class="w-2 h-2 shrink-0 rounded-full bg-pink-500 animate-pulse" />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          onShowReader();
          haptics.light();
          sounds.click();
        }}
        class="group px-2 sm:px-3.5 min-h-[52px] flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border-3 border-black bg-gradient-to-br from-purple-50 to-pink-50 shadow-chunky hover:shadow-chunky-hover hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-purple-100 hover:to-pink-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-chunky transition-all duration-150 font-bold shrink-0"
        title={isSpanish
          ? "Escudo callejero: descubre a dónde lleva un QR desconocido antes de abrirlo"
          : "Street-safe QR airlock: unmask where a mystery QR goes before opening"}
        aria-label={isSpanish
          ? "Revisar QR de forma segura"
          : "Inspect or scan a mystery QR code safely"}
      >
        <span class="text-base sm:text-lg group-hover:scale-110 transition-transform">
          🔍
        </span>
        <span class="text-xs font-black text-gray-800">
          {isSpanish ? "Revisar" : "Inspect"}
        </span>
      </button>

      {hasHistory && (
        <button
          type="button"
          onClick={() => {
            onShowHistory();
            haptics.light();
            sounds.click();
          }}
          class="group w-11 sm:w-14 min-h-[52px] flex items-center justify-center rounded-xl border-3 border-black bg-gradient-to-br from-yellow-50 to-orange-50 shadow-chunky hover:shadow-chunky-hover hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-yellow-100 hover:to-orange-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-chunky transition-all duration-150 animate-pop-in shrink-0"
          title={isSpanish
            ? "Máquina del Tiempo (Historial)"
            : "Time Machine (History)"}
          aria-label={isSpanish ? "Abrir Historial" : "Open QR history"}
        >
          <span class="text-xl group-hover:rotate-[-45deg] transition-transform duration-300">
            🕰️
          </span>
        </button>
      )}
    </div>
  );
}

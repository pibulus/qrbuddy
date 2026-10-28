import { useEffect, useState } from "preact/hooks";
import { useModalShell } from "./modal/useModalShell.ts";
import {
  clearHistory,
  getHistory,
  HistoryItem,
  removeFromHistory,
} from "../utils/history.ts";
import {
  exportSyncBundle,
  generateSyncPhrase,
  importSyncBundle,
} from "../utils/sync-phrase.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { isPlusLibraryEnabled } from "../utils/auth.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  lang?: Locale;
}

export default function HistoryDrawer(
  { isOpen, onClose, onSelect, lang }: HistoryDrawerProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(() =>
    generateSyncPhrase()
  );
  const [importInput, setImportInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    // Load initial
    setHistory(getHistory());

    // Listen for updates
    const handler = () => setHistory(getHistory());
    globalThis.addEventListener("history-updated", handler);
    return () => globalThis.removeEventListener("history-updated", handler);
  }, []);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat(isSpanish ? "es-MX" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(ts));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "url":
        return "🔗";
      case "text":
        return "📝";
      case "wifi":
        return "📶";
      case "file":
        return "📂";
      case "dynamic":
        return "⚡";
      default:
        return "📄";
    }
  };

  const handleCopySyncBackup = async () => {
    setIsExporting(true);
    try {
      const bundle = await exportSyncBundle(currentPhrase);
      await navigator.clipboard.writeText(bundle);
      haptics.success();
      addToast(
        isSpanish
          ? "¡Respaldo cifrado copiado! 📋"
          : "Encrypted sync backup copied! 📋",
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo generar el respaldo"
          : "Couldn't generate sync backup",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSync = async (e: Event) => {
    e.preventDefault();
    if (!importInput.trim()) return;

    setIsImporting(true);
    try {
      const result = await importSyncBundle(importInput.trim(), currentPhrase);
      setHistory(getHistory());
      haptics.success();
      const manageLinks = result.ownerTokensRestored
        ? (isSpanish
          ? " · se restauraron " + result.ownerTokensRestored + " llaves"
          : " · restored " + result.ownerTokensRestored + " manage links")
        : "";
      addToast(
        result.historySaved
          ? (isSpanish
            ? "¡Se sincronizaron " + result.mergedHistoryCount +
              " elementos" + manageLinks + "! ☁️✨"
            : "Synced " + result.mergedHistoryCount + " items" + manageLinks +
              " from other device! ☁️✨")
          : (isSpanish
            ? "No se pudo guardar el historial en este dispositivo" +
              manageLinks
            : "Couldn't save synced history on this device" + manageLinks),
      );
      setImportInput("");
      setShowSync(false);
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "Respaldo inválido o frase incorrecta"
          : "Invalid sync backup or wrong phrase",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const shell = useModalShell({ open: isOpen, onClose });
  if (!shell.mounted) return null;

  return (
    <div
      ref={shell.backdropRef}
      class={`fixed inset-0 bg-[#2B1A0E]/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 charm-modal-backdrop animate-fade-in${
        shell.closing
          ? " charm-modal-backdrop--closing charm-modal--closing"
          : ""
      }`}
      onClick={shell.onBackdropClick}
    >
      <div
        ref={shell.dialogRef}
        data-history-drawer
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
        tabIndex={-1}
        class={`bg-qr-cream w-full max-w-lg border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-chunky max-h-[92dvh] flex flex-col charm-modal-drawer pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 outline-none${
          shell.closing
            ? " charm-modal--closing charm-modal-drawer--closing"
            : ""
        }`}
      >
        {/* Header */}
        <div class="pb-3 border-b-2 border-black/10 flex justify-between items-center gap-2">
          <div>
            <h2
              id="history-drawer-title"
              class="text-xl sm:text-2xl font-black tracking-tight text-neutral-900"
            >
              {isSpanish ? "Máquina del Tiempo" : "Time Machine"}
            </h2>
            <p class="text-xs font-bold text-neutral-600">
              {isSpanish ? "Tu Historial de QRs" : "Your QR History"}
            </p>
          </div>
          <div class="flex items-center gap-2">
            {isPlusLibraryEnabled() && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  globalThis.dispatchEvent(new CustomEvent("qrb-open-library"));
                  haptics.light();
                }}
                aria-label={isSpanish
                  ? "Abrir Tu Biblioteca"
                  : "Open Recoverable Library"}
                title={isSpanish ? "Tu Biblioteca" : "Recoverable Library"}
                class="w-11 h-11 flex items-center justify-center bg-white border-2 border-black rounded-full hover:bg-amber-100 transition-colors font-bold text-sm"
              >
                📚
              </button>
            )}
            <button
              type="button"
              aria-expanded={showSync}
              onClick={() => {
                setShowSync(!showSync);
                haptics.light();
              }}
              aria-label={isSpanish
                ? "Sincronizar dispositivos"
                : "Toggle device sync"}
              title={isSpanish
                ? "Sincronización entre dispositivos"
                : "Four-part device sync"}
              class={`w-11 h-11 flex items-center justify-center border-2 border-black rounded-full font-black text-sm transition-all ${
                showSync ? "bg-black text-white" : "bg-white hover:bg-amber-100"
              }`}
            >
              ☁️
            </button>
            <button
              type="button"
              data-history-close
              onClick={shell.requestClose}
              aria-label={isSpanish ? "Cerrar historial" : "Close history"}
              class="group shrink-0 w-11 h-11 -mr-1 rounded-full flex items-center justify-center"
            >
              <span
                aria-hidden="true"
                class="w-9 h-9 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-base leading-none shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
              >
                ✕
              </span>
            </button>
          </div>
        </div>

        {/* Sync View Card */}
        {showSync && (
          <div class="mt-3 p-4 rounded-2xl bg-purple-50 border-2 border-black space-y-3 animate-slide-down">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wide text-purple-900">
                {isSpanish
                  ? "🔑 Sincronización Cifrada"
                  : "🔑 Four-Part Sovereign Sync"}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPhrase(generateSyncPhrase())}
                class="min-h-[44px] px-2 inline-flex items-center text-[11px] font-bold text-purple-700 hover:underline"
              >
                {isSpanish ? "🎲 Nueva frase" : "🎲 New phrase"}
              </button>
            </div>
            <div class="p-2.5 bg-white border-2 border-black rounded-xl text-center">
              <p class="text-xs font-mono font-black text-gray-900 break-all select-all">
                {currentPhrase}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySyncBackup}
              disabled={isExporting}
              class="w-full min-h-[44px] py-2 px-3 bg-purple-600 text-white rounded-xl border-2 border-black font-black text-xs shadow-sm hover:bg-purple-700 active:translate-y-0.5 transition-all"
            >
              {isExporting
                ? (isSpanish ? "Cifrando..." : "Encrypting...")
                : (isSpanish
                  ? "📋 Copiar respaldo cifrado"
                  : "📋 Copy Encrypted Backup")}
            </button>
            <form
              onSubmit={handleImportSync}
              class="space-y-2 pt-1 border-t border-purple-200"
            >
              <label class="sr-only" for="history-sync-import-input">
                {isSpanish
                  ? "Pega el respaldo de otro dispositivo"
                  : "Paste backup JSON from other phone"}
              </label>
              <input
                id="history-sync-import-input"
                type="text"
                value={importInput}
                onInput={(e) =>
                  setImportInput((e.target as HTMLInputElement).value)}
                placeholder={isSpanish
                  ? "Pega el respaldo de otro dispositivo..."
                  : "Paste backup JSON from other phone..."}
                class="w-full min-h-[44px] px-2.5 py-1.5 text-xs font-mono rounded-lg border-2 border-gray-300 focus:border-black focus:outline-none"
              />
              <button
                type="submit"
                disabled={!importInput.trim() || isImporting}
                class="w-full min-h-[44px] py-1.5 bg-white text-gray-900 border-2 border-black rounded-lg font-black text-xs hover:bg-black hover:text-white transition-all disabled:opacity-40"
              >
                {isImporting
                  ? (isSpanish ? "Uniendo..." : "Merging...")
                  : (isSpanish
                    ? "📥 Unir en este dispositivo"
                    : "📥 Merge into this device")}
              </button>
            </form>
          </div>
        )}

        {/* List */}
        <div class="flex-1 overflow-y-auto scrollbar-none py-4 space-y-3">
          {history.length === 0
            ? (
              <div class="text-center py-10 opacity-50">
                <div class="text-6xl mb-4">👻</div>
                <p class="font-bold">
                  {isSpanish
                    ? "Aún no hay fantasmas aquí."
                    : "No ghosts here yet."}
                </p>
                <p class="text-xs">
                  {isSpanish
                    ? "¡Crea algunos QRs para llenar tu historial!"
                    : "Create some QRs to populate history!"}
                </p>
              </div>
            )
            : (
              history.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${isSpanish ? "Abrir" : "Open"} ${
                    item.metadata?.title || item.content
                  }`}
                  class="group relative bg-white border-2 border-black rounded-xl p-3 shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  onClick={() => {
                    onSelect(item);
                    haptics.light();
                    shell.requestClose();
                  }}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item);
                      haptics.light();
                      shell.requestClose();
                    }
                  }}
                >
                  <div class="flex items-start gap-3">
                    <div class="text-2xl bg-gray-100 w-10 h-10 flex items-center justify-center rounded-lg border border-black shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start gap-1">
                        <p class="font-bold text-sm truncate pr-1">
                          {item.metadata?.title || item.content}
                        </p>
                        {item.metadata?.shortCode && (
                          <span class="shrink-0 text-[10px] font-black uppercase tracking-wide bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded-md">
                            {item.metadata.ownerScope === "qr"
                              ? (isSpanish ? "📊 Editar" : "📊 Manage")
                              : (isSpanish ? "⚡ Dinámico" : "⚡ Dynamic")}
                          </span>
                        )}
                        {item.type === "file" && (
                          <span class="shrink-0 text-[10px] font-black uppercase tracking-wide bg-teal-100 text-teal-900 border border-teal-300 px-1.5 py-0.5 rounded-md">
                            {isSpanish ? "🪣 Buzón" : "🪣 Locker"}
                          </span>
                        )}
                        {item.metadata?.ownerScope === "file" && (
                          <a
                            href={item.content}
                            onClick={(e) => e.stopPropagation()}
                            class="shrink-0 min-h-[44px] px-2 inline-flex items-center justify-center text-[10px] font-black uppercase tracking-wide bg-amber-200 text-black border border-black rounded-md hover:scale-105 transition-transform"
                            title={isSpanish
                              ? "Ábrelo — es tuyo: estadísticas, renombrar, agregar, cambiar estilo"
                              : "Open it — it's yours: stats, rename, add, re-vibe"}
                          >
                            {isSpanish ? "👑 Editar →" : "👑 Manage →"}
                          </a>
                        )}
                      </div>
                      <p class="text-[10px] text-gray-500 font-mono mt-1 truncate">
                        {item.type === "file"
                          ? (isSpanish ? "Buzón de archivos" : "File Locker")
                          : item.content}
                      </p>
                      <p class="text-[10px] text-gray-600 mt-0.5">
                        {formatDate(item.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button (visible on hover/group-hover & keyboard focus) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item.id);
                    }}
                    class="absolute -top-2 -right-2 w-11 h-11 bg-red-500 text-white rounded-full border-2 border-black flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 transition-opacity hover:scale-110"
                    aria-label={isSpanish
                      ? "Quitar del historial"
                      : "Remove from history"}
                    title={isSpanish
                      ? "Olvidar este elemento"
                      : "Forget this memory"}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div class="pt-3 border-t-2 border-black/10 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={showSync}
              onClick={() => {
                setShowSync(!showSync);
                haptics.light();
              }}
              class="min-h-[44px] px-2 text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
            >
              <span>☁️</span>
              <span>
                {isSpanish ? "Sincronizar dispositivos" : "Sync Devices"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    isSpanish
                      ? "¿Seguro que quieres borrar todo tu historial? Esto no se puede deshacer."
                      : "Are you sure you want to wipe your history? This cannot be undone.",
                  )
                ) {
                  clearHistory();
                }
              }}
              class="min-h-[44px] px-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              {isSpanish ? "🗑️ Borrar todo" : "🗑️ Wipe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

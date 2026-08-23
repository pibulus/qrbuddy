import { useEffect, useState } from "preact/hooks";
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
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export default function HistoryDrawer(
  { isOpen, onClose, onSelect }: HistoryDrawerProps,
) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(() => generateSyncPhrase());
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

  // Dialog behaviour: close on Escape and move focus into the drawer on open.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const closeBtn = document.querySelector(
      "[data-history-drawer] [data-history-close]",
    ) as HTMLElement | null;
    closeBtn?.focus();
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat("en-US", {
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
      addToast("Encrypted sync backup copied! 📋");
    } catch {
      haptics.error();
      addToast("Couldn't generate sync backup");
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
      addToast(`Synced ${result.mergedHistoryCount} items from other device! ☁️✨`);
      setImportInput("");
      setShowSync(false);
    } catch {
      haptics.error();
      addToast("Invalid sync backup or wrong phrase");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        class={`fixed inset-0 bg-qr-scrim/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer (Left Side) */}
      <div
        data-history-drawer
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
        class={`fixed top-0 left-0 h-full w-84 max-w-[85vw] bg-qr-cream shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col border-r-4 border-black ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div class="p-5 sm:p-6 border-b-4 border-black bg-yellow-300 flex justify-between items-center">
          <div>
            <h2 id="history-drawer-title" class="text-2xl font-black italic">
              Time Machine
            </h2>
            <p class="text-xs font-bold opacity-70">Your QR History</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSync(!showSync);
                haptics.light();
              }}
              aria-label="Toggle device sync"
              title="4-word device sync"
              class={`w-10 h-10 flex items-center justify-center border-2 border-black rounded-full font-black text-sm transition-all ${
                showSync ? "bg-black text-white" : "bg-white hover:bg-yellow-100"
              }`}
            >
              ☁️
            </button>
            <button
              type="button"
              data-history-close
              onClick={onClose}
              aria-label="Close history"
              class="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-full hover:bg-red-100 transition-colors font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sync View Card */}
        {showSync && (
          <div class="p-4 bg-purple-50 border-b-3 border-black space-y-3 animate-slide-down">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wide text-purple-900">
                🔑 4-Word Sovereign Sync
              </span>
              <button
                type="button"
                onClick={() => setCurrentPhrase(generateSyncPhrase())}
                class="text-[11px] font-bold text-purple-700 hover:underline"
              >
                🎲 New phrase
              </button>
            </div>
            <div class="p-2.5 bg-white border-2 border-black rounded-xl text-center">
              <p class="text-xs font-mono font-black text-gray-900 break-words select-all">
                {currentPhrase}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySyncBackup}
              disabled={isExporting}
              class="w-full py-2 px-3 bg-purple-600 text-white rounded-xl border-2 border-black font-black text-xs shadow-sm hover:bg-purple-700 active:translate-y-0.5 transition-all"
            >
              {isExporting ? "Encrypting..." : "📋 Copy Encrypted Backup"}
            </button>
            <form onSubmit={handleImportSync} class="space-y-2 pt-1 border-t border-purple-200">
              <input
                type="text"
                value={importInput}
                onInput={(e) => setImportInput((e.target as HTMLInputElement).value)}
                placeholder="Paste backup JSON from other phone..."
                class="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border-2 border-gray-300 focus:border-black focus:outline-none"
              />
              <button
                type="submit"
                disabled={!importInput.trim() || isImporting}
                class="w-full py-1.5 bg-white text-gray-900 border-2 border-black rounded-lg font-black text-xs hover:bg-black hover:text-white transition-all disabled:opacity-40"
              >
                {isImporting ? "Merging..." : "📥 Merge into this device"}
              </button>
            </form>
          </div>
        )}

        {/* List */}
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0
            ? (
              <div class="text-center py-10 opacity-50">
                <div class="text-6xl mb-4">👻</div>
                <p class="font-bold">No ghosts here yet.</p>
                <p class="text-xs">Create some QRs to populate history!</p>
              </div>
            )
            : (
              history.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${item.metadata?.title || item.content}`}
                  class="group relative bg-white border-2 border-black rounded-xl p-3 shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item);
                      onClose();
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
                            📊 Analytics
                          </span>
                        )}
                        {item.type === "file" && (
                          <span class="shrink-0 text-[10px] font-black uppercase tracking-wide bg-teal-100 text-teal-900 border border-teal-300 px-1.5 py-0.5 rounded-md">
                            🪣 Locker
                          </span>
                        )}
                      </div>
                      <p class="text-[10px] text-gray-500 font-mono mt-1 truncate">
                        {item.type === "file" ? "File Locker" : item.content}
                      </p>
                      <p class="text-[10px] text-gray-400 mt-0.5">
                        {formatDate(item.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button (visible on hover/group-hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item.id);
                    }}
                    class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full border-2 border-black flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:scale-110"
                    aria-label="Remove from history"
                    title="Forget this memory"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div class="p-4 border-t-4 border-black bg-gray-50 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSync(!showSync);
                haptics.light();
              }}
              class="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
            >
              <span>☁️</span>
              <span>Sync Devices</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to wipe your history? This cannot be undone.",
                  )
                ) {
                  clearHistory();
                }
              }}
              class="py-1.5 px-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              🗑️ Wipe
            </button>
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "preact/hooks";
import { getHistory, HistoryItem, removeFromHistory, clearHistory } from "../utils/history.ts";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export default function HistoryDrawer({ isOpen, onClose, onSelect }: HistoryDrawerProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Load initial
    setHistory(getHistory());

    // Listen for updates
    const handler = () => setHistory(getHistory());
    globalThis.addEventListener("history-updated", handler);
    return () => globalThis.removeEventListener("history-updated", handler);
  }, []);

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
      case "url": return "🔗";
      case "text": return "📝";
      case "wifi": return "📶";
      case "file": return "📂";
      case "dynamic": return "⚡";
      default: return "📄";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        class={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer (Left Side) */}
      <div
        class={`fixed top-0 left-0 h-full w-80 bg-[#FFFBF5] shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col border-r-4 border-black ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div class="p-6 border-b-4 border-black bg-yellow-300 flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-black italic">Time Machine</h2>
            <p class="text-xs font-bold opacity-70">Your QR History</p>
          </div>
          <button
            onClick={onClose}
            class="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-full hover:bg-red-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div class="text-center py-10 opacity-50">
              <div class="text-6xl mb-4">👻</div>
              <p class="font-bold">No ghosts here yet.</p>
              <p class="text-xs">Create some QRs to populate history!</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                class="group relative bg-white border-2 border-black rounded-xl p-3 shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <div class="flex items-start gap-3">
                  <div class="text-2xl bg-gray-100 w-10 h-10 flex items-center justify-center rounded-lg border border-black">
                    {getIcon(item.type)}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                      <p class="font-bold text-sm truncate pr-2">
                        {item.metadata?.title || item.content}
                      </p>
                    </div>
                    <p class="text-[10px] text-gray-500 font-mono mt-1 truncate">
                      {item.type === "file" ? "File Locker" : item.content}
                    </p>
                    <p class="text-[10px] text-gray-400 mt-1">
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Delete Button (visible on hover/group-hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.id);
                  }}
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full border-2 border-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
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
          <div class="p-4 border-t-4 border-black bg-gray-50">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to wipe your history? This cannot be undone.")) {
                  clearHistory();
                }
              }}
              class="w-full py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border-2 border-transparent hover:border-red-200 transition-all"
            >
              🗑️ Wipe Memory
            </button>
          </div>
        )}
      </div>
    </>
  );
}

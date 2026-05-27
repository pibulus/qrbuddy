import { useEffect, useState } from "preact/hooks";
import { getHistory } from "../../utils/history.ts";
import { haptics } from "../../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  setIsCreateModalOpen: (isOpen: boolean) => void;
  setCreateHasUpdates: (hasUpdates: boolean) => void;
  createHasUpdates: boolean;
  onShowHistory: () => void;
}
export default function SmartInputToolbar({
  selectedTemplate,
  setIsCreateModalOpen,
  setCreateHasUpdates,
  createHasUpdates,
  onShowHistory,
}: SmartInputToolbarProps) {
  const templateMeta = QR_TEMPLATES[selectedTemplate];
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
        hasHistory ? "grid-cols-[1fr_auto]" : "grid-cols-1"
      } gap-3 text-sm w-full`}
    >
      <button
        type="button"
        onClick={() => {
          setIsCreateModalOpen(true);
          setCreateHasUpdates(false);
          haptics.light();
        }}
        class={`group w-full min-h-[52px] flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-blue-50 via-cyan-50 to-pink-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-blue-100 hover:to-pink-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold ${
          createHasUpdates ? "animate-bounce" : ""
        }`}
        title="Choose QR type, files, options, and logo"
        aria-label="Choose QR type, files, options, and logo"
      >
        <span class="text-lg group-hover:scale-110 transition-transform">
          🎯
        </span>
        <span class="group-hover:text-blue-700">Create</span>
        <span class="hidden sm:inline text-xs text-gray-500 font-black">
          {templateMeta.icon} {templateMeta.label}
        </span>
        {createHasUpdates && (
          <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
        )}
      </button>

      {hasHistory && (
        <button
          type="button"
          onClick={() => {
            onShowHistory();
            haptics.light();
          }}
          class="group w-14 flex items-center justify-center rounded-xl border-3 border-black bg-gradient-to-br from-yellow-50 to-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-yellow-100 hover:to-orange-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 animate-pop-in"
          title="Time Machine (History)"
          aria-label="Open QR history"
        >
          <span class="text-xl group-hover:rotate-[-45deg] transition-transform duration-300">
            🕰️
          </span>
        </button>
      )}
    </div>
  );
}

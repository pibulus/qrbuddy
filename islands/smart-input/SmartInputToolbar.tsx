import { haptics } from "../../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  setIsTemplateModalOpen: (isOpen: boolean) => void;
  setIsExtrasModalOpen: (isOpen: boolean) => void;
  setExtrasHasUpdates: (hasUpdates: boolean) => void;
  extrasHasUpdates: boolean;
  onShowHistory: () => void;
}

export default function SmartInputToolbar({
  selectedTemplate,
  setIsTemplateModalOpen,
  setIsExtrasModalOpen,
  setExtrasHasUpdates,
  extrasHasUpdates,
  onShowHistory,
}: SmartInputToolbarProps) {
  const templateMeta = QR_TEMPLATES[selectedTemplate];

  return (
    <div class="grid grid-cols-[1fr_1fr_auto] gap-3 text-sm w-full">
      <button
        type="button"
        onClick={() => {
          setIsTemplateModalOpen(true);
          haptics.light();
        }}
        class="group w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-blue-50 to-cyan-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-blue-100 hover:to-cyan-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold"
        title="URLs, WiFi, contacts, SMS, email templates"
      >
        <span class="text-lg group-hover:scale-110 transition-transform">
          {templateMeta.icon}
        </span>
        <span class="hidden sm:inline group-hover:text-blue-700 truncate">Templates</span>
        <span class="sm:hidden group-hover:text-blue-700">Templates</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setIsExtrasModalOpen(true);
          setExtrasHasUpdates(false);
          haptics.light();
        }}
        class={`group w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-pink-50 to-purple-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-pink-100 hover:to-purple-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold ${
          extrasHasUpdates ? "animate-bounce" : ""
        }`}
        title="Dynamic links, File Buckets, logos, scan limits"
      >
        <span class="text-lg group-hover:scale-110 transition-transform">
          ✨
        </span>
        <span class="hidden sm:inline group-hover:text-pink-700">Power Ups</span>
        <span class="sm:hidden group-hover:text-pink-700">Extras</span>
        {extrasHasUpdates && (
          <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
        )}
      </button>
      
      <button
        type="button"
        onClick={() => {
          onShowHistory();
          haptics.light();
        }}
        class="group w-14 flex items-center justify-center rounded-xl border-3 border-black bg-gradient-to-br from-yellow-50 to-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-yellow-100 hover:to-orange-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
        title="Time Machine (History)"
      >
        <span class="text-xl group-hover:rotate-[-45deg] transition-transform duration-300">
          🕰️
        </span>
      </button>
    </div>
  );
}

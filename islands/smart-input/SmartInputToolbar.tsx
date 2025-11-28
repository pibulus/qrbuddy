import { haptics } from "../../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  setIsTemplateModalOpen: (isOpen: boolean) => void;
  setIsExtrasModalOpen: (isOpen: boolean) => void;
  setExtrasHasUpdates: (hasUpdates: boolean) => void;
  extrasHasUpdates: boolean;
}

export default function SmartInputToolbar({
  selectedTemplate,
  setIsTemplateModalOpen,
  setIsExtrasModalOpen,
  setExtrasHasUpdates,
  extrasHasUpdates,
}: SmartInputToolbarProps) {
  const templateMeta = QR_TEMPLATES[selectedTemplate];

  return (
    <div class="grid grid-cols-2 gap-3 text-sm w-full">
      <button
        type="button"
        onClick={() => {
          setIsTemplateModalOpen(true);
          haptics.light();
        }}
        class="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-blue-50 to-cyan-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-blue-100 hover:to-cyan-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold"
        title="URLs, WiFi, contacts, SMS, email templates"
      >
        <span class="text-lg group-hover:scale-110 transition-transform">
          {templateMeta.icon}
        </span>
        <span class="group-hover:text-blue-700">{templateMeta.label}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setIsExtrasModalOpen(true);
          setExtrasHasUpdates(false);
          haptics.light();
        }}
        class={`group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-pink-50 to-purple-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-pink-100 hover:to-purple-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold ${
          extrasHasUpdates ? "animate-bounce" : ""
        }`}
        title="Dynamic links, File Buckets, logos, scan limits"
      >
        <span class="text-lg group-hover:scale-110 transition-transform">
          ✨
        </span>
        <span class="group-hover:text-pink-700">Power Ups</span>
        {extrasHasUpdates && (
          <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
        )}
      </button>
    </div>
  );
}

import { Signal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../types/qr-templates.ts";
import WiFiForm from "./templates/WiFiForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import EmailForm from "./templates/EmailForm.tsx";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: QRTemplateType;
  onTemplateSelect: (template: QRTemplateType) => void;
  url: Signal<string>;
  isDestructible: Signal<boolean>;
  onInputChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export default function TemplateModal({
  isOpen,
  onClose,
  selectedTemplate,
  onTemplateSelect,
  url,
  isDestructible,
  onInputChange,
  onFocus,
  onBlur,
}: TemplateModalProps) {
  if (!isOpen) return null;

  const templateMeta = QR_TEMPLATES[selectedTemplate];

  const handleTemplateClick = (templateType: QRTemplateType) => {
    onTemplateSelect(templateType);
    haptics.light();
    url.value = "";
    isDestructible.value = false;
  };

  const renderTemplateForm = () => {
    if (selectedTemplate === "wifi") return <WiFiForm url={url} />;
    if (selectedTemplate === "vcard") return <VCardForm url={url} />;
    if (selectedTemplate === "sms") return <SMSForm url={url} />;
    if (selectedTemplate === "email") return <EmailForm url={url} />;
    if (selectedTemplate === "text") {
      return (
        <div class="space-y-4">
          <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">📝</span>
              <h3 class="font-black text-gray-900">Plain Text QR</h3>
            </div>
            <p class="text-sm text-gray-700">
              Any text content - perfect for notes, codes, or short messages.
            </p>
          </div>
          <textarea
            value={url.value}
            onInput={(e) =>
              onInputChange((e.target as HTMLTextAreaElement).value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Enter any text..."
            rows={4}
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-gray-500 focus:outline-none resize-none"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center px-4 py-4">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div class="relative z-10 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-up">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-blue-500 font-bold">
              Quick Templates
            </p>
            <p class="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Pick a format
            </p>
            <p class="text-xs sm:text-sm text-gray-600">
              WiFi, contacts, messages—click and fill.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close template modal"
          >
            ×
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          {(Object.keys(QR_TEMPLATES) as QRTemplateType[]).map(
            (templateType) => {
              const template = QR_TEMPLATES[templateType];
              return (
                <button
                  key={templateType}
                  type="button"
                  onClick={() => handleTemplateClick(templateType)}
                  class={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all flex items-center gap-2
                    ${
                    selectedTemplate === templateType
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-600 scale-105 shadow-lg"
                      : "bg-white text-gray-700 border-gray-300 hover:border-pink-400 hover:scale-105"
                  }`}
                  title={template.description}
                >
                  <span>{template.icon}</span>
                  {template.label}
                </button>
              );
            },
          )}
        </div>

        {/* Template form reveals IN the modal after selection */}
        <div class={selectedTemplate !== "url" ? "animate-slide-down" : ""}>
          {renderTemplateForm() ?? (
            <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🔗</span>
                <h3 class="font-black text-gray-900">
                  Plain link or text?
                </h3>
              </div>
              <p class="text-sm text-gray-700">
                Use the main input up top. Templates handle the fancy stuff.
              </p>
            </div>
          )}
        </div>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            class="px-4 py-2 rounded-xl border-2 border-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

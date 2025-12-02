import type { Signal } from "@preact/signals";
import { QR_TEMPLATES, QRTemplateType } from "../types/qr-templates.ts";
import { haptics } from "../utils/haptics.ts";
import WiFiForm from "./templates/WiFiForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import EmailForm from "./templates/EmailForm.tsx";
import WebsiteForm from "./templates/WebsiteForm.tsx";
import SocialHubForm from "./templates/SocialHubForm.tsx";
import MediaHubForm from "./templates/MediaHubForm.tsx";
import { addToast } from "./ToastManager.tsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: QRTemplateType;
  onSelectTemplate: (template: QRTemplateType) => void;
  url: Signal<string>;
}

export default function TemplateModal({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
  url,
}: Props) {
  if (!isOpen) return null;

  const renderTemplateForm = () => {
    switch (selectedTemplate) {
      case "url":
        return <WebsiteForm url={url} />;
      case "social":
        return <SocialHubForm url={url} />;
      case "media":
        return <MediaHubForm url={url} />;
      case "wifi":
        return <WiFiForm url={url} />;
      case "vcard":
        return <VCardForm url={url} />;
      case "sms":
        return <SMSForm url={url} />;
      case "email":
        return <EmailForm url={url} />;
      case "text":
        return (
          <div class="space-y-4 animate-slide-down">
            <div class="bg-gray-50 border-3 border-gray-200 rounded-xl p-4 shadow-chunky">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">📝</span>
                <h3 class="font-black text-gray-900">Plain Text</h3>
              </div>
              <p class="text-sm text-gray-600">
                Display any text message, code, or note.
              </p>
            </div>
            <textarea
              value={url.value}
              onInput={(e) => {
                url.value = (e.target as HTMLTextAreaElement).value;
                haptics.light();
              }}
              placeholder="Enter your text here..."
              rows={4}
              class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-black focus:outline-none transition-colors resize-none font-medium"
              autoFocus
            />
          </div>
        );
      default:
        return (
          <div class="text-center py-8 text-gray-500">
            <p>Select a template to get started</p>
          </div>
        );
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div class="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up sm:animate-pop-in">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b-2 border-gray-100">
          <div>
            <h2 class="text-2xl font-black text-gray-900">Choose Format</h2>
            <p class="text-sm text-gray-500 font-medium">
              What kind of QR code do you want?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span class="text-xl">✕</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div class="flex-1 overflow-y-auto p-6">
          {/* Template Grid/List */}
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
            {(Object.keys(QR_TEMPLATES) as QRTemplateType[]).map((key) => {
              const template = QR_TEMPLATES[key];
              const isSelected = selectedTemplate === key;

              return (
                <div key={key} class="contents sm:block">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTemplate !== key) {
                        url.value = "";
                      }
                      onSelectTemplate(key);
                      haptics.light();
                    }}
                    class={`
                      flex sm:flex-col items-center sm:justify-center p-3 rounded-2xl border-3 transition-all duration-200 w-full text-left sm:text-center gap-4 sm:gap-0
                      ${
                      isSelected
                        ? "bg-purple-100 border-purple-500 text-purple-700 shadow-chunky scale-[1.02] sm:scale-105 z-10"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }
                    `}
                  >
                    <span class="text-2xl sm:mb-1">{template.icon}</span>
                    <span
                      class={`text-lg sm:text-xs font-bold ${
                        isSelected ? "text-purple-700" : "text-gray-500"
                      }`}
                    >
                      {template.label}
                    </span>
                    {/* Mobile Chevron */}
                    <span class="sm:hidden ml-auto text-gray-400">
                      {isSelected ? "▼" : "›"}
                    </span>
                  </button>

                  {/* Mobile: Inline Form Accordion */}
                  {isSelected && (
                    <div class="sm:hidden mt-2 mb-4 animate-slide-down pl-4 border-l-4 border-purple-200">
                      {renderTemplateForm()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Active Form at Bottom */}
          <div class="hidden sm:block bg-white rounded-xl">
            {renderTemplateForm()}
          </div>
        </div>

        {/* Footer */}
        <div class="p-6 border-t-2 border-gray-100 bg-gray-50 rounded-b-3xl">
          <button
            type="button"
            onClick={() => {
              onClose();
              addToast("Template ready! ✨");
            }}
            class="w-full py-4 bg-black text-white text-xl font-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

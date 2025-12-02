import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { QRTemplateType } from "../../types/qr-templates.ts";

interface Props {
  url: Signal<string>;
  type: QRTemplateType;
}

export default function MediaForm({ url, type }: Props) {
  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Dispatch event for SmartInput to handle upload
      const event = new CustomEvent("smart-input-upload", {
        detail: { file },
      });
      globalThis.dispatchEvent(event);
      haptics.medium();
    }
  };

  const getAccept = () => {
    switch (type) {
      case "images": return "image/*";
      case "video": return "video/*";
      case "mp3": return "audio/*";
      case "pdf": return "application/pdf";
      default: return "*/*";
    }
  };

  const getLabel = () => {
    switch (type) {
      case "images": return "Upload Image";
      case "video": return "Upload Video";
      case "mp3": return "Upload Audio";
      case "pdf": return "Upload PDF";
      default: return "Upload File";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "images": return "🖼️";
      case "video": return "🎥";
      case "mp3": return "🎵";
      case "pdf": return "📄";
      default: return "📂";
    }
  };

  return (
    <div class="space-y-4 animate-slide-down">
      <div class="bg-purple-50 border-3 border-purple-300 rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">{getIcon()}</span>
          <h3 class="font-black text-purple-900">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
        </div>
        <p class="text-sm text-purple-800 font-medium opacity-80">
          Upload a file to create a hosted page.
        </p>
      </div>

      <div class="space-y-2">
        <label class="block w-full cursor-pointer group">
          <div class="w-full px-4 py-8 border-3 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-purple-500 group-hover:bg-purple-50 transition-all">
            <span class="text-4xl group-hover:scale-110 transition-transform">
              {getIcon()}
            </span>
            <span class="font-bold text-gray-600 group-hover:text-purple-600">
              {getLabel()}
            </span>
            <span class="text-xs text-gray-400 font-medium">
              Tap to select or drop file here
            </span>
          </div>
          <input
            type="file"
            accept={getAccept()}
            onChange={handleFileSelect}
            class="hidden"
          />
        </label>
        {url.value && url.value.includes("http") && (
             <div class="bg-green-50 border-3 border-green-200 rounded-xl p-3 text-center animate-fade-in shadow-sm">
                <p class="text-sm text-green-800 font-black">
                   ✅ File uploaded successfully!
                </p>
                <p class="text-xs text-green-700 break-all mt-1 font-mono">
                  {url.value}
                </p>
             </div>
        )}
      </div>
    </div>
  );
}

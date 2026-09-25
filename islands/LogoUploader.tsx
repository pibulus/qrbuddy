import { Signal } from "@preact/signals";
import { useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";

interface LogoUploaderProps {
  logoUrl: Signal<string>;
}

export default function LogoUploader({ logoUrl }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      haptics.medium();

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file (PNG, JPG, SVG, etc.)");
      }

      // Validate file size (2MB limit for logos)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Logo must be under 2MB");
      }

      // Convert to data URL and normalize to a centered square
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const size = 400;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            logoUrl.value = rawDataUrl;
            setIsUploading(false);
            return;
          }

          // Calculate aspect ratio containment
          const maxDim = Math.max(img.width, img.height);
          const scale = size / maxDim;
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const offsetX = (size - drawW) / 2;
          const offsetY = (size - drawH) / 2;

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          logoUrl.value = canvas.toDataURL("image/png");
          haptics.success();
          addToast("Logo fitted & added 🖼️", 2000);
          setIsUploading(false);
        };
        img.onerror = () => {
          logoUrl.value = rawDataUrl;
          setIsUploading(false);
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        throw new Error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Logo upload error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsUploading(false);
      haptics.error();
      addToast(`❌ ${errorMessage}`, 3000);
    }
  };

  const handleFileInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    logoUrl.value = "";
    haptics.light();
    addToast("Logo removed", 2000);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div class="space-y-2">
      {/* One row: the card says what it is, the trailing control does it */}
      <div
        class={`w-full min-h-[60px] rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 transition-all ${
          logoUrl.value
            ? "border-black bg-amber-200 shadow-chunky"
            : "border-black/15 bg-white"
        }`}
      >
        {logoUrl.value
          ? (
            <img
              src={logoUrl.value}
              alt="Logo preview"
              class="w-10 h-10 object-contain rounded-xl border-2 border-black bg-white shrink-0"
            />
          )
          : (
            <span class="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center text-lg shrink-0">
              {isUploading ? "⏳" : "🖼️"}
            </span>
          )}
        <span class="min-w-0 flex-1">
          <span class="block font-black text-black leading-tight">
            Center logo
          </span>
          <span class="block text-xs text-neutral-700 leading-snug mt-0.5">
            {logoUrl.value
              ? "Sits in the middle of the QR."
              : "PNG, JPG or SVG · square works best · max 2MB"}
          </span>
        </span>
        {logoUrl.value
          ? (
            <button
              type="button"
              onClick={handleRemoveLogo}
              class="shrink-0 min-h-[40px] px-3 rounded-full border-2 border-black bg-white text-xs font-black text-black hover:scale-105 active:scale-95 transition-transform"
            >
              Remove
            </button>
          )
          : (
            <button
              type="button"
              onClick={handleFileInputClick}
              disabled={isUploading}
              class="shrink-0 min-h-[40px] px-4 rounded-full border-2 border-black bg-black text-xs font-black text-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isUploading ? "…" : "Upload"}
            </button>
          )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        class="hidden"
        accept="image/*"
        onChange={handleFileInputChange}
      />

      {error && (
        <p class="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

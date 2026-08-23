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
          addToast("✅ Logo fitted & added to QR!", 2000);
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
    <div class="space-y-3">
      {logoUrl.value && (
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Current Logo
          </span>
          <button
            type="button"
            onClick={handleRemoveLogo}
            class="text-xs text-red-600 hover:text-red-700 font-semibold"
          >
            Remove
          </button>
        </div>
      )}

      {/* Logo preview or upload button */}
      {logoUrl.value
        ? (
          <div class="flex items-center gap-3 p-3 bg-white border-3 border-green-400 rounded-xl shadow-chunky">
            <img
              src={logoUrl.value}
              alt="Logo preview"
              class="w-16 h-16 object-contain rounded-lg border-3 border-gray-200"
            />
            <div class="flex-1">
              <p class="text-sm font-semibold text-green-800">
                ✅ Logo added to QR
              </p>
              <p class="text-xs text-green-600">
                Your logo will appear in the center of the QR code
              </p>
            </div>
          </div>
        )
        : (
          <button
            type="button"
            onClick={handleFileInputClick}
            disabled={isUploading}
            class="w-full px-4 py-3 border-4 border-dashed border-gray-400 rounded-xl
                 text-gray-600 hover:border-pink-500 hover:text-pink-600
                  transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                  bg-white hover:bg-pink-50 shadow-chunky hover:shadow-chunky-hover"
          >
            <div class="flex flex-col items-center gap-2">
              <span class="text-3xl">{isUploading ? "⏳" : "🖼️"}</span>
              <span class="text-sm font-semibold">
                {isUploading ? "Uploading..." : "Click to upload logo"}
              </span>
              <span class="text-xs text-gray-500">
                PNG, JPG, SVG • Max 2MB
              </span>
            </div>
          </button>
        )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        class="hidden"
        accept="image/*"
        onChange={handleFileInputChange}
      />

      {/* Error message */}
      {error && (
        <p class="text-sm text-red-600 text-center">
          {error}
        </p>
      )}

      {/* Info text */}
      <p class="text-xs text-gray-500">
        Square images work best. We'll center it for you.
      </p>
    </div>
  );
}

import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface LogoUploaderProps {
  logoUrl: Signal<string>;
  lang?: Locale;
  /** Fires after a mark is set, so callers can clear their own monogram text. */
  onPicked?: () => void;
  /** Compact row label override (e.g. Replace logo when a raster is loaded). */
  compactLabel?: string;
}

export default function LogoUploader(
  { logoUrl, lang, onPicked, compactLabel }: LogoUploaderProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadGenRef = useRef(0);

  useEffect(() => {
    const handleReset = () => {
      uploadGenRef.current++;
      setIsUploading(false);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    globalThis.addEventListener("qr-design-reset", handleReset);
    return () => {
      uploadGenRef.current++;
      globalThis.removeEventListener("qr-design-reset", handleReset);
    };
  }, []);

  const handleFileSelect = (file: File) => {
    try {
      const currentGen = ++uploadGenRef.current;
      setIsUploading(true);
      setError(null);
      haptics.medium();

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error(
          isSpanish
            ? "Por favor sube una imagen (PNG, JPG, SVG, etc.)"
            : "Please upload an image file (PNG, JPG, SVG, etc.)",
        );
      }

      // Validate file size (2MB limit for logos)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error(
          isSpanish
            ? "El logo debe pesar menos de 2 MB"
            : "Logo must be under 2MB",
        );
      }

      // Convert to data URL and normalize to a centered square
      const reader = new FileReader();
      reader.onload = (e) => {
        if (currentGen !== uploadGenRef.current) return;
        const rawDataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          if (currentGen !== uploadGenRef.current) return;
          const size = 400;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setError(isSpanish ? "Imagen no disponible" : "Image unavailable");
            setIsUploading(false);
            return;
          }

          // Preserve the image itself. The renderer owns the cutout, moat and
          // mask, avoiding a second tiny bordered box baked into the logo.
          const innerPad = 0;
          const innerSize = size - innerPad * 2;
          const innerRadius = 0;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(innerPad, innerPad, innerSize, innerSize, innerRadius);
          ctx.clip();

          const maxDim = Math.max(img.width, img.height);
          const scale = innerSize / maxDim;
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const offsetX = (size - drawW) / 2;
          const offsetY = (size - drawH) / 2;

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          ctx.restore();
          logoUrl.value = canvas.toDataURL("image/png");
          haptics.success();
          setIsUploading(false);
          onPicked?.();
        };
        img.onerror = () => {
          if (currentGen !== uploadGenRef.current) return;
          setError(
            isSpanish
              ? "No se pudo abrir la imagen"
              : "Image could not be opened",
          );
          setIsUploading(false);
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        if (currentGen !== uploadGenRef.current) return;
        setError(
          isSpanish ? "No se pudo leer la imagen" : "Image could not be read",
        );
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Logo upload error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsUploading(false);
      haptics.error();
      addToast(errorMessage, 3000);
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

  const hasImage = /^data:image\/(png|jpeg|webp)/.test(logoUrl.value);
  return (
    <div class="min-w-0">
      <input
        ref={fileInputRef}
        type="file"
        class="hidden"
        accept="image/*"
        onChange={handleFileInputChange}
      />
      <button
        type="button"
        onClick={handleFileInputClick}
        disabled={isUploading}
        class={`w-full min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-[#1e1714] text-xs font-black transition-all ${
          hasImage
            ? "border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] shadow-[0_2px_0_#1e1714]"
            : "border-2 border-[#1e1714]/20 bg-[#fffef7] hover:border-[#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)]/45"
        }`}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M16 7h.01" />
        </svg>
        {isUploading
          ? "…"
          : compactLabel ?? (isSpanish ? "Subir logo" : "Upload logo")}
      </button>
      {error && <p class="text-xs text-amber-800" role="alert">{error}</p>}
    </div>
  );
}

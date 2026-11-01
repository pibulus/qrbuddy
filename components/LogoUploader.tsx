import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface LogoUploaderProps {
  logoUrl: Signal<string>;
  lang?: Locale;
  compact?: boolean;
  /** Fires after a mark is set, so callers can clear their own monogram text. */
  onPicked?: () => void;
}

export default function LogoUploader(
  { logoUrl, lang, compact = false, onPicked }: LogoUploaderProps,
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

  const handleRemoveLogo = () => {
    uploadGenRef.current++;
    logoUrl.value = "";
    haptics.light();
    addToast(isSpanish ? "Logo quitado" : "Logo removed", 2000);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (compact) {
    return (
      <div class="flex-1 min-w-0">
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
          class="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] text-[#1e1714] text-xs font-black shadow-[0_2px_0_#1e1714]"
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
          {isUploading ? "…" : isSpanish ? "Subir imagen" : "Upload image"}
        </button>
        {error && <p class="text-xs text-amber-800" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div class="space-y-2">
      {/* One row: the card says what it is, the trailing control does it */}
      <div
        class={`w-full min-h-[60px] rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 transition-all ${
          logoUrl.value
            ? "border-[#1e1714] bg-[#fffef7] shadow-chunky"
            : "border-[#1e1714]/15 bg-[#fffef7]"
        }`}
      >
        {logoUrl.value
          ? (
            <img
              src={logoUrl.value}
              alt={isSpanish ? "Vista previa del logo" : "Logo preview"}
              class="w-10 h-10 object-contain rounded-xl border-2 border-black bg-white shrink-0"
            />
          )
          : (
            <span class="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center text-lg shrink-0">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M16 7h.01" />
              </svg>
            </span>
          )}
        <span class="min-w-0 flex-1">
          <span class="block font-black text-black leading-tight">
            {isSpanish ? "Logo central" : "Center logo"}
          </span>
          <span class="block text-xs text-neutral-700 leading-snug mt-0.5">
            {logoUrl.value
              ? (isSpanish
                ? "Va justo al centro del QR."
                : "Sits in the middle of the QR.")
              : (isSpanish
                ? "PNG, JPG o SVG · cuadrado queda mejor · máx. 2 MB"
                : "PNG, JPG or SVG · square works best · max 2MB")}
          </span>
        </span>
        {logoUrl.value
          ? (
            <button
              type="button"
              onClick={handleRemoveLogo}
              class="shrink-0 min-h-[40px] px-3 rounded-full border-2 border-black bg-white text-xs font-black text-black hover:scale-105 active:scale-95 transition-transform"
            >
              {isSpanish ? "Quitar" : "Remove"}
            </button>
          )
          : (
            <button
              type="button"
              onClick={handleFileInputClick}
              disabled={isUploading}
              class="shrink-0 min-h-[40px] px-4 rounded-full border-2 border-black bg-black text-xs font-black text-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isUploading ? "…" : (isSpanish ? "Subir" : "Upload")}
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
        <p class="text-sm text-amber-800 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

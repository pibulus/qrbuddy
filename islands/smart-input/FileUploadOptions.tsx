import { Signal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";
import { prettyName } from "../../utils/image-prep.ts";
import { reorderItems } from "../../utils/share-stats.ts";
import { getSupporterPass } from "../../utils/supporter-pass.ts";
import { openPricingModal } from "../PricingModal.tsx";
import type { ShareKind } from "./ShareReady.tsx";

interface FileUploadOptionsProps {
  files: File[];
  maxDownloads: Signal<number>;
  isUploading: boolean;
  /** Images are being downscaled before the card is ready. */
  isPrepping?: boolean;
  title: string;
  setTitle: (title: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReorderFiles?: (files: File[]) => void;
  lang?: Locale;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function shareKindOf(files: File[]): ShareKind {
  if (files.length === 1) return "file";
  if (files.every((f) => f.type.startsWith("audio/"))) return "playlist";
  if (files.every((f) => f.type.startsWith("image/"))) return "slideshow";
  return "pack";
}

const KIND: Record<
  ShareKind,
  {
    glyph: string;
    noun: string;
    nounEs: string;
    cta: string;
    ctaEs: string;
    placeholder: string;
    placeholderEs: string;
  }
> = {
  slideshow: {
    glyph: "🖼️",
    noun: "Slideshow",
    nounEs: "Galería de Fotos",
    cta: "Make the slideshow ✨",
    ctaEs: "Crear galería ✨",
    placeholder: "Name it — Summer '26, Nan's 80th…",
    placeholderEs: "Ponle nombre — Verano '26, Boda de Ana…",
  },
  playlist: {
    glyph: "🎵",
    noun: "Mixtape",
    nounEs: "Mixtape de Audio",
    cta: "Make the mixtape 🎵",
    ctaEs: "Crear mixtape 🎵",
    placeholder: "Name it — Mixtape vol. 3, road trip…",
    placeholderEs: "Ponle nombre — Mixtape vol. 3, carretera…",
  },
  pack: {
    glyph: "📦",
    noun: "Pack",
    nounEs: "Paquete",
    cta: "Create QR",
    ctaEs: "Crear QR",
    placeholder: "Name it (optional)",
    placeholderEs: "Nombre (opcional)",
  },
  file: {
    glyph: "📄",
    noun: "File",
    nounEs: "Archivo",
    cta: "Create QR",
    ctaEs: "Crear QR",
    placeholder: "Name it (optional)",
    placeholderEs: "Nombre (opcional)",
  },
};

/** The staging card: what's about to become a QR, shown as the thing it is
 * (a strip of photos, a tracklist), one CTA, self-destruct tucked away. */
export default function FileUploadOptions(
  {
    files,
    maxDownloads,
    isUploading,
    isPrepping = false,
    title,
    setTitle,
    onConfirm,
    onCancel,
    onReorderFiles,
    lang,
  }: FileUploadOptionsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const kind = shareKindOf(files);
  const meta = KIND[kind];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const isLimited = maxDownloads.value !== UNLIMITED_SCANS;
  const busy = isUploading || isPrepping;

  const moveFile = (index: number, direction: -1 | 1) => {
    const reordered = reorderItems(files, index, direction);
    if (reordered.every((item, idx) => item === files[idx])) return;
    onReorderFiles?.(reordered);
    haptics.light();
  };

  // Object URLs for image thumbnails — revoked when the files change.
  const thumbs = useMemo(
    () =>
      files.slice(0, 10).map((f) =>
        f.type.startsWith("image/") ? URL.createObjectURL(f) : ""
      ),
    [files],
  );
  useEffect(
    () => () => thumbs.forEach((u) => u && URL.revokeObjectURL(u)),
    [thumbs],
  );

  const headline = kind === "file"
    ? files[0].name
    : kind === "playlist"
    ? `${files.length} ${isSpanish ? "rolas" : "tracks"}`
    : kind === "slideshow"
    ? `${files.length} ${isSpanish ? "fotos" : "photos"}`
    : `${files.length} ${isSpanish ? "archivos" : "files"}`;

  const itemNoun = kind === "playlist"
    ? "track"
    : kind === "slideshow"
    ? "photo"
    : "item";

  return (
    <div class="mt-2 bg-[#fbf1e4] border-3 border-[#1e1714] rounded-3xl p-4 space-y-3 shadow-chunky animate-slide-down">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-10 h-10 rounded-xl border-2 border-[#1e1714] bg-amber-200 flex items-center justify-center text-lg shrink-0 shadow-[2px_2px_0_#1e1714]">
            {meta.glyph}
          </span>
          <div class="min-w-0">
            <p class="font-black text-[#1e1714] leading-tight truncate">
              {isSpanish ? meta.nounEs : meta.noun} · {headline}
            </p>
            <p class="text-xs font-semibold text-[#6f6158]">
              {isPrepping
                ? (isSpanish ? "Preparando fotos…" : "Prepping photos…")
                : `${formatSize(totalSize)} · ${
                  isSpanish ? "dura 30 días" : "30-day link"
                }`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          class="qr-modal-close-btn shrink-0 disabled:opacity-50"
          aria-label={isSpanish ? "Cancelar" : "Cancel"}
          title={isSpanish ? "Cancelar" : "Cancel"}
        >
          <svg
            class="w-4 h-4 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3.25"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6.5 6.5l11 11m0-11l-11 11" />
          </svg>
        </button>
      </div>

      {/* Polaroid thumbnail preview strip for slideshows (with inline ← / → reorder pills, no duplicate 5-row vertical list!) */}
      {kind === "slideshow" && (
        <div
          class="flex gap-2.5 overflow-x-auto scrollbar-none -mx-1 px-1 py-1"
          aria-label="Staged slideshow order"
        >
          {thumbs.map((src, i) => (
            <div
              key={`${files[i]?.name ?? i}-${i}`}
              class="relative shrink-0 group/tile"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <img
                src={src}
                alt={prettyName(files[i]?.name ?? `Photo ${i + 1}`)}
                class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border-2 border-[#1e1714] bg-[#fffef7] shadow-[2px_2px_0_#1e1714]"
              />
              <span class="absolute top-1 left-1 px-1.5 py-0.2 rounded-md border border-[#1e1714] bg-[#fffef7]/95 text-[10px] font-black text-[#1e1714] leading-tight">
                {i + 1}
              </span>
              {onReorderFiles && files.length > 1 && (
                <div class="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label={`Move ${itemNoun} ${i + 1} up`}
                    class="w-6 h-6 rounded-md border border-[#1e1714] bg-[#fffef7]/95 hover:bg-amber-200 text-[11px] font-black text-[#1e1714] flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(i, 1)}
                    disabled={i === thumbs.length - 1 || busy}
                    aria-label={`Move ${itemNoun} ${i + 1} down`}
                    class="w-6 h-6 rounded-md border border-[#1e1714] bg-[#fffef7]/95 hover:bg-amber-200 text-[11px] font-black text-[#1e1714] flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reorderable staging list for non-slideshow multi-file shares (mixtapes & packs) */}
      {files.length > 1 && kind !== "slideshow" && (
        <ol
          class="space-y-1.5 max-h-40 overflow-y-auto scrollbar-none"
          aria-label={`Staged ${meta.noun.toLowerCase()} order`}
        >
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              class="flex items-center gap-2 text-sm font-bold text-[#1e1714] min-h-[42px] bg-[#fffef7] px-2.5 py-1 rounded-xl border-2 border-[#1e1714]/15"
            >
              <span class="w-5 text-xs font-black text-neutral-500 text-right shrink-0">
                {i + 1}
              </span>
              <span class="truncate flex-1 min-w-0">
                {prettyName(f.name)}
              </span>
              {onReorderFiles && (
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label={`Move ${itemNoun} ${i + 1} up`}
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1e1714]/25 bg-white text-xs font-black text-[#1e1714] hover:bg-amber-200 hover:border-[#1e1714] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1 || busy}
                    aria-label={`Move ${itemNoun} ${i + 1} down`}
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1e1714]/25 bg-white text-xs font-black text-[#1e1714] hover:bg-amber-200 hover:border-[#1e1714] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {kind !== "file" && (
        <input
          type="text"
          value={title}
          maxLength={80}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          placeholder={isSpanish ? meta.placeholderEs : meta.placeholder}
          aria-label={isSpanish ? "Título para compartir" : "Share title"}
          class="w-full min-h-[42px] px-3.5 py-2 border-2 border-[#1e1714] bg-[#fffef7] rounded-2xl text-sm font-bold focus:border-[#ec4899] focus:outline-none transition-colors"
        />
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        class="qr-pitch-cta"
      >
        {isUploading
          ? (isSpanish ? "Subiendo…" : "Uploading…")
          : isPrepping
          ? (isSpanish ? "Preparando…" : "Prepping…")
          : (isSpanish ? meta.ctaEs : meta.cta)}
      </button>

      {/* Compact bottom row: Self-destruct toggle + optional Passport note */}
      <details class="group" open={isLimited}>
        <summary class="list-none cursor-pointer min-h-[32px] flex items-center justify-center gap-1 text-xs font-bold text-[#6f6158] hover:text-[#1e1714] transition-colors select-none">
          {isLimited
            ? (isSpanish
              ? `💣 Se autodestruye después de ${maxDownloads.value} ${
                maxDownloads.value === 1 ? "descarga" : "descargas"
              }`
              : `💣 Self-destructs after ${maxDownloads.value} ${
                maxDownloads.value === 1 ? "download" : "downloads"
              }`)
            : (isSpanish
              ? "¿Autodestruir después de algunas descargas?"
              : "Self-destruct after a few downloads?")}
          <span class="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div class="flex gap-2 flex-wrap justify-center pt-2">
          {[null, 1, 3, 5, 10].map((limit) => {
            const value = limit || UNLIMITED_SCANS;
            const active = maxDownloads.value === value;
            return (
              <button
                type="button"
                key={limit?.toString() || "unlimited"}
                aria-pressed={active}
                onClick={() => {
                  maxDownloads.value = value;
                  haptics.light();
                }}
                class={`min-w-[40px] min-h-[38px] px-3 rounded-full border-2 font-black text-xs transition-all ${
                  active
                    ? "border-[#1e1714] bg-amber-200 text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                    : "border-[#1e1714]/15 bg-[#fffef7] text-neutral-700 hover:border-[#1e1714]/60"
                }`}
              >
                {limit === null ? "∞" : limit}
              </button>
            );
          })}
        </div>
      </details>

      {kind === "file" && !getSupporterPass() && (
        <div class="text-center">
          <button
            type="button"
            onClick={openPricingModal}
            class="inline-flex items-center justify-center px-3 py-1 rounded-full border border-[#1e1714]/20 bg-[#fffef7] text-[11px] font-bold text-[#6f6158] hover:border-[#1e1714] hover:text-[#1e1714] transition-colors"
          >
            {isSpanish
              ? "50 MB gratis · ¿Hasta 500 MB? Pasaporte QRBuddy 🛂"
              : "50 MB free · Need 500 MB? QRBuddy Passport 🛂"}
          </button>
        </div>
      )}
    </div>
  );
}

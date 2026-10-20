import { Signal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";
import { prettyName } from "../../utils/image-prep.ts";
import { reorderItems } from "../../utils/share-stats.ts";
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
    <div class="mt-4 bg-white border-2 border-black rounded-2xl p-4 space-y-4 animate-slide-down">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl border-2 border-black bg-amber-200 flex items-center justify-center text-lg shrink-0">
          {meta.glyph}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-black text-black leading-tight truncate">
            {isSpanish ? meta.nounEs : meta.noun} · {headline}
          </p>
          <p class="text-xs text-neutral-600">
            {isPrepping
              ? (isSpanish ? "Preparando fotos…" : "Prepping photos…")
              : formatSize(totalSize)}
          </p>
        </div>
      </div>

      {/* Polaroid thumbnail preview strip for slideshows */}
      {kind === "slideshow" && (
        <div class="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
          {thumbs.map((src, i) => (
            <img
              key={`${files[i]?.name ?? i}-${i}`}
              src={src}
              alt=""
              class="w-14 h-14 shrink-0 object-cover rounded-xl border-2 border-black bg-neutral-100"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            />
          ))}
        </div>
      )}

      {/* Reorderable staging list for 2+ files (mixtape, slideshow, or pack) */}
      {files.length > 1 && (
        <ol
          class="space-y-1.5 max-h-56 overflow-y-auto scrollbar-none"
          aria-label={`Staged ${meta.noun.toLowerCase()} order`}
        >
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              class="flex items-center gap-2 text-sm font-bold text-black min-h-[48px] bg-qr-cream px-2.5 py-1 rounded-xl border-2 border-black/15"
            >
              <span class="w-5 text-xs font-black text-neutral-500 text-right shrink-0">
                {i + 1}
              </span>
              {thumbs[i] && (
                <img
                  src={thumbs[i]}
                  alt=""
                  class="w-9 h-9 rounded-lg border border-black object-cover shrink-0 bg-white"
                />
              )}
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
                    class="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl border-2 border-black/20 bg-white text-sm font-black text-black hover:bg-amber-200 hover:border-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1 || busy}
                    aria-label={`Move ${itemNoun} ${i + 1} down`}
                    class="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl border-2 border-black/20 bg-white text-sm font-black text-black hover:bg-amber-200 hover:border-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
          class="w-full min-h-[44px] px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-base font-bold focus:border-qr-pop focus:outline-none transition-colors"
        />
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        class="w-full min-h-[52px] rounded-full border-3 border-black bg-qr-pop text-white text-lg font-black shadow-chunky hover:scale-[1.02] hover:bg-qr-popDeep hover:shadow-chunky-hover active:scale-[0.97] transition-all disabled:opacity-60 disabled:hover:scale-100"
      >
        {isUploading
          ? (isSpanish ? "Subiendo…" : "Uploading…")
          : isPrepping
          ? (isSpanish ? "Preparando…" : "Prepping…")
          : (isSpanish ? meta.ctaEs : meta.cta)}
      </button>
      <p class="-mt-2 text-center text-xs text-neutral-500">
        {isSpanish
          ? "El link dura 30 días. El límite de descargas es aparte."
          : "Link expires after 30 days. Download limit is separate."}
      </p>

      {/* Self-destruct lives under a toggle: it's the exception, not the form */}
      <details class="group" open={isLimited}>
        <summary class="list-none cursor-pointer min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-neutral-500 hover:text-black transition-colors select-none">
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
                class={`min-w-[44px] min-h-[44px] px-3 rounded-full border-2 font-black text-sm transition-all ${
                  active
                    ? "border-black bg-amber-200 text-black shadow-chunky"
                    : "border-black/15 bg-white text-neutral-700 hover:border-black/60"
                }`}
              >
                {limit === null ? "∞" : limit}
              </button>
            );
          })}
        </div>
      </details>

      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        class="w-full min-h-[44px] text-xs font-bold text-neutral-500 hover:text-black transition-colors disabled:opacity-50"
      >
        {isSpanish ? "Mejor no" : "Never mind"}
      </button>
    </div>
  );
}

import { Signal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";
import { prettyName } from "../../utils/image-prep.ts";
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
  { glyph: string; noun: string; cta: string; placeholder: string }
> = {
  slideshow: {
    glyph: "🖼️",
    noun: "Slideshow",
    cta: "Make the slideshow ✨",
    placeholder: "Name it — Summer '26, Nan's 80th…",
  },
  playlist: {
    glyph: "🎵",
    noun: "Mixtape",
    cta: "Make the mixtape 🎵",
    placeholder: "Name it — Mixtape vol. 3, road trip…",
  },
  pack: {
    glyph: "📦",
    noun: "Pack",
    cta: "Create QR",
    placeholder: "Name it (optional)",
  },
  file: {
    glyph: "📄",
    noun: "File",
    cta: "Create QR",
    placeholder: "Name it (optional)",
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
  }: FileUploadOptionsProps,
) {
  const kind = shareKindOf(files);
  const meta = KIND[kind];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const isLimited = maxDownloads.value !== UNLIMITED_SCANS;
  const busy = isUploading || isPrepping;

  // Object URLs for the thumbnail strip — revoked when the files change.
  const thumbs = useMemo(
    () =>
      kind === "slideshow"
        ? files.slice(0, 10).map((f) => URL.createObjectURL(f))
        : [],
    [files, kind],
  );
  useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [
    thumbs,
  ]);

  const headline = kind === "file"
    ? files[0].name
    : kind === "playlist"
    ? `${files.length} tracks`
    : kind === "slideshow"
    ? `${files.length} photos`
    : `${files.length} files`;

  return (
    <div class="mt-4 bg-white border-2 border-black rounded-2xl p-4 space-y-4 animate-slide-down">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl border-2 border-black bg-amber-200 flex items-center justify-center text-lg shrink-0">
          {meta.glyph}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-black text-black leading-tight truncate">
            {meta.noun} · {headline}
          </p>
          <p class="text-xs text-neutral-600">
            {isPrepping ? "Prepping photos…" : formatSize(totalSize)}
          </p>
        </div>
      </div>

      {/* Show the thing: a strip of photos, or the tracklist */}
      {kind === "slideshow" && (
        <div class="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
          {thumbs.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              class="w-16 h-16 shrink-0 object-cover rounded-xl border-2 border-black bg-neutral-100"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            />
          ))}
        </div>
      )}
      {kind === "playlist" && (
        <ol class="space-y-1 max-h-40 overflow-y-auto scrollbar-none">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              class="flex items-center gap-2 text-sm font-bold text-black min-h-[32px]"
            >
              <span class="w-6 text-xs font-black text-neutral-400 text-right">
                {i + 1}
              </span>
              <span class="truncate">{prettyName(f.name)}</span>
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
          placeholder={meta.placeholder}
          aria-label="Share title"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-base font-bold focus:border-qr-pop focus:outline-none transition-colors"
        />
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        class="w-full min-h-[52px] rounded-full border-3 border-black bg-qr-pop text-white text-lg font-black shadow-chunky hover:scale-[1.02] hover:bg-qr-popDeep hover:shadow-chunky-hover active:scale-[0.97] transition-all disabled:opacity-60 disabled:hover:scale-100"
      >
        {isUploading ? "Uploading…" : isPrepping ? "Prepping…" : meta.cta}
      </button>

      {/* Self-destruct lives under a toggle: it's the exception, not the form */}
      <details class="group" open={isLimited}>
        <summary class="list-none cursor-pointer min-h-[36px] flex items-center justify-center gap-1 text-xs font-bold text-neutral-500 hover:text-black transition-colors select-none">
          {isLimited
            ? `💣 Self-destructs after ${maxDownloads.value} ${
              maxDownloads.value === 1 ? "download" : "downloads"
            }`
            : "Self-destruct after a few downloads?"}
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
                class={`min-w-[44px] min-h-[40px] px-3 rounded-full border-2 font-black text-sm transition-all ${
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
        class="w-full min-h-[36px] text-xs font-bold text-neutral-500 hover:text-black transition-colors disabled:opacity-50"
      >
        Never mind
      </button>
    </div>
  );
}

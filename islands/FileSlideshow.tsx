import { useEffect, useRef, useState } from "preact/hooks";
// @ts-expect-error — esm.sh's jszip types omit the default export the runtime ESM build has
import JSZip from "jszip";
import { formatFileSize } from "../utils/file-validation.ts";
import { prettyName } from "../utils/image-prep.ts";
import { getApiUrl, getAuthHeaders } from "../utils/api.ts";
import { safeZipEntryNames } from "../utils/zip-names.ts";
import OwnerStrip, { type ShareItem } from "./OwnerStrip.tsx";
import ShareActions from "./ShareActions.tsx";
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { getSupporterPass } from "../utils/supporter-pass.ts";
import { getOwnerToken } from "../utils/token-vault.ts";

const SLIDE_MS = 4500;

export const SHARE_FOOTER_PILL_CLASS =
  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black bg-qr-cream text-black text-xs font-black shadow-chunky hover:scale-105 active:scale-95 transition-all";

export function getShareFooterPillCopy(lang?: Locale): string {
  return getClientLocale(lang) === "es"
    ? "⚡ Hecho con QRBuddy · Haz el tuyo gratis →"
    : "⚡ Made with QRBuddy · Make yours free →";
}

interface FileSlideshowProps {
  files?: Array<{
    id: string;
    path: string;
    name: string;
    size: number;
    type: string;
  }>;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  maxDownloads: number;
  remainingDownloads: number;
  expiresAt?: string | null;
  theme?: string;
  unbranded?: boolean;
  lang?: Locale;
}

// Theme styles keyed to the real QR styles (utils/qr-styles.ts) — the
// uploader sends the live picker style as `theme`.
export function getThemeStylesFor(theme = "sunset"): string {
  switch (theme) {
    case "noir":
      return "bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#020617] text-white";
    case "terminal":
      return "bg-[#0A0A0A] text-[#00FF41]";
    case "brutalist":
      return "bg-[#FFFF00] text-black";
    case "candy":
      return "bg-gradient-to-br from-[#FFFDF9] via-[#FFF0F7] to-[#F3E8FF] text-black";
    case "blush":
      return "bg-gradient-to-br from-[#FFFDF9] via-[#FFF5F7] to-[#FFE4E9] text-black";
    case "matcha":
      return "bg-gradient-to-br from-[#FFFDF9] via-[#F2FBF7] to-[#DCFCE7] text-black";
    case "pool":
      return "bg-gradient-to-br from-[#FFFDF9] via-[#F0FDFA] to-[#E0F2FE] text-black";
    case "vapor":
      return "bg-gradient-to-br from-[#FFFDFB] via-[#FAF5FF] to-[#FCE7F3] text-black";
    case "grape":
      return "bg-gradient-to-br from-[#FFFDFB] via-[#FBF1E4] to-[#EDE9FE] text-black";
    case "sunset":
    default:
      return "bg-gradient-to-br from-[#FFF8F0] via-[#FFE5B4] to-[#FFD6E7] text-black";
  }
}

export function getCardStylesFor(theme = "sunset"): string {
  switch (theme) {
    case "noir":
      return "bg-[#1E293B] border-4 border-white/80 shadow-chunky text-white";
    case "terminal":
      return "bg-[#0D1512] border-4 border-[#00FF41] shadow-[4px_4px_0px_rgba(0,255,65,0.35)] text-[#00FF41]";
    case "brutalist":
      return "bg-white border-4 border-black shadow-chunky text-black";
    case "sunset":
    case "candy":
    case "blush":
    case "matcha":
    case "pool":
    case "vapor":
    case "grape":
    default:
      return "bg-qr-cream border-4 border-black shadow-chunky text-black";
  }
}

function formatExpiry(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default function FileSlideshow({
  files: initialFiles,
  fileId,
  fileName: initialFileName,
  fileSize,
  mimeType,
  maxDownloads,
  remainingDownloads,
  expiresAt,
  theme: initialTheme = "sunset",
  unbranded: initialUnbranded = false,
  lang,
}: FileSlideshowProps) {
  const isUnlimited = maxDownloads >= 999999;
  const formattedExpiry = formatExpiry(expiresAt);
  const isSpanish = getClientLocale(lang) === "es";

  // The owner can rename, re-theme and add/remove from the strip below —
  // the page updates in place, no reload.
  const [files, setFiles] = useState<ShareItem[] | undefined>(initialFiles);
  const [fileName, setFileName] = useState(initialFileName);
  const [theme, setTheme] = useState(initialTheme);
  const [unbranded, setUnbranded] = useState(Boolean(initialUnbranded));

  useEffect(() => {
    if (initialUnbranded) {
      setUnbranded(true);
    }
  }, [initialUnbranded]);

  useEffect(() => {
    let cancelled = false;
    if (getSupporterPass()) {
      getOwnerToken("file", fileId).then((token) => {
        if (!cancelled && token) {
          setUnbranded(true);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  // Slideshow State
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [lastDownloadStarted, setLastDownloadStarted] = useState(false);
  const [trackSelected, setTrackSelected] = useState(false);
  const [mediaErrorKey, setMediaErrorKey] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const hasMultipleFiles = files && files.length > 1;
  const isAllAudio = Boolean(
    hasMultipleFiles && files!.every((f) => f.type.startsWith("audio/")),
  );
  const isAllImages = Boolean(
    hasMultipleFiles && files!.every((f) => f.type.startsWith("image/")),
  );
  let ownerKind: "playlist" | "slideshow" | "file" = "file";
  if (files?.length && files.every((f) => f.type.startsWith("audio/"))) {
    ownerKind = "playlist";
  } else if (
    files?.length && files.every((f) => f.type.startsWith("image/"))
  ) {
    ownerKind = "slideshow";
  }
  const currentFile = files?.[currentIndex] ?? null;

  // A photo slideshow plays itself; any hand on the wheel stops it.
  const [isPlaying, setIsPlaying] = useState(isAllImages && isUnlimited);
  const wasAllImages = useRef(isAllImages);

  useEffect(() => {
    if (!wasAllImages.current && isAllImages && isUnlimited) {
      setIsPlaying(true);
    }
    wasAllImages.current = isAllImages;
  }, [isAllImages, isUnlimited]);

  // The share's own name. Legacy multi-shares were named "IMG_1.jpg + 7 more"
  // by the server — read those as what they are.
  const legacyMulti = /^(.*) \+ (\d+) more$/.exec(fileName);
  const shareTitle = hasMultipleFiles && legacyMulti
    ? `${files!.length} ${
      isAllAudio ? "tracks" : isAllImages ? "photos" : "files"
    }`
    : fileName;

  // Determine what to show
  const displayFileName = currentFile ? currentFile.name : fileName;
  const displayFileSize = currentFile ? currentFile.size : fileSize;
  const displayMimeType = currentFile ? currentFile.type : mimeType;

  const fileSizeLabel = formatFileSize(displayFileSize);

  // Download URL logic
  const getDownloadUrl = (path?: string, format?: "zip") => {
    let url = `/api/download-file?id=${fileId}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }
    if (format) {
      url += `&download=${format}`;
    }
    return url;
  };

  const currentDownloadUrl = hasMultipleFiles
    ? getDownloadUrl(currentFile!.path)
    : getDownloadUrl();
  const zipDownloadUrl = getDownloadUrl(undefined, "zip");
  const primaryDownloadUrl = hasMultipleFiles && !isUnlimited
    ? zipDownloadUrl
    : currentDownloadUrl;
  const defaultZipBaseName = isAllAudio
    ? "playlist"
    : isAllImages
    ? "slideshow"
    : "files";
  const primaryDownloadName = hasMultipleFiles && !isUnlimited
    ? `${fileName || defaultZipBaseName}.zip`
    : displayFileName;

  // Helper to determine media type
  const isImage = displayMimeType?.startsWith("image/");
  const isAudio = displayMimeType?.startsWith("audio/");
  const isVideo = displayMimeType?.startsWith("video/");
  const showPreview = isUnlimited && (isImage || isAudio || isVideo);
  const fileKindLabel = isImage
    ? "Image"
    : isVideo
    ? "Video"
    : isAudio
    ? "Audio"
    : displayMimeType?.includes("pdf")
    ? "PDF"
    : "File";
  const fileGlyph = isImage
    ? "🖼️"
    : isVideo
    ? "🎬"
    : isAudio
    ? "🎵"
    : displayMimeType?.includes("pdf")
    ? "📕"
    : "📦";

  // Theme styles keyed to the real QR styles (utils/qr-styles.ts) — the
  // uploader sends the live picker style as `theme`.
  const isDarkTheme = theme === "noir" || theme === "terminal";
  const isTerminal = theme === "terminal";
  const getThemeStyles = () => getThemeStylesFor(theme);
  const getCardStyles = () => getCardStylesFor(theme);

  // Navigation Handlers
  const nextSlide = () => {
    if (!hasMultipleFiles) return;
    setCurrentIndex((prev) => (prev + 1) % files!.length);
  };

  const handleTrackEnded = () => {
    if (isAudio && (!hasMultipleFiles || currentIndex >= files!.length - 1)) {
      engagement.current.completed = true;
      return;
    }
    if (hasMultipleFiles) setCurrentIndex((index) => index + 1);
  };

  const prevSlide = () => {
    if (!hasMultipleFiles) return;
    setCurrentIndex((prev) => (prev - 1 + files!.length) % files!.length);
  };

  // Manual navigation takes the wheel from autoplay.
  const goNext = () => {
    setIsPlaying(false);
    setTrackSelected(true);
    setMediaErrorKey(null);
    nextSlide();
  };
  const goPrev = () => {
    setIsPlaying(false);
    setTrackSelected(true);
    setMediaErrorKey(null);
    prevSlide();
  };
  const goTo = (idx: number) => {
    // Changing autoPlay on an already mounted audio element does not start it.
    // Start the selected track in this tap's user gesture, including a replay.
    if (idx === currentIndex && audioRef.current) {
      void audioRef.current.play().catch(() => {
        addToast("Couldn't start this track. Try its Play control.", 4000);
      });
    }
    setIsPlaying(false);
    setTrackSelected(true);
    setMediaErrorKey(null);
    setCurrentIndex(idx);
  };

  useEffect(() => {
    if (!isPlaying || !hasMultipleFiles) return;
    const t = setInterval(nextSlide, SLIDE_MS);
    return () => clearInterval(t);
  }, [isPlaying, hasMultipleFiles, files]);

  // ── Stats beacons ──────────────────────────────────────────────────────
  // One "view" when the page opens (from the browser, so the edge sees the
  // visitor's real country/device), one "engagement" batch when it goes
  // away: which items got seen/played, how long, did they finish, taps.
  // Tallies only; nothing that identifies anyone leaves this page.
  const engagement = useRef({
    items: {} as Record<string, number>,
    started: Date.now(),
    completed: false,
    downloads: 0,
    sent: false,
  });

  const beacon = (body: Record<string, unknown>) => {
    try {
      void fetch(`${getApiUrl()}/share-beacon`, {
        method: "POST",
        keepalive: true,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, ...body }),
      }).catch(() => {/* Best-effort telemetry. */});
    } catch {
      // A beacon that fails is a stat that didn't happen. Fine.
    }
  };

  useEffect(() => {
    beacon({ kind: "view" });
    const flush = () => {
      const e = engagement.current;
      if (e.sent) return;
      e.sent = true;
      beacon({
        kind: "engagement",
        items: e.items,
        dwellSeconds: Math.round((Date.now() - e.started) / 1000),
        completed: e.completed,
        downloads: e.downloads,
      });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    globalThis.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      globalThis.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [fileId]);

  // Count the item on screen; reaching the last one counts as finishing.
  useEffect(() => {
    if (!currentFile || !showPreview || isAudio) return;
    const e = engagement.current;
    e.items[currentFile.id] = (e.items[currentFile.id] ?? 0) + 1;
    if (isAllImages && currentIndex === files!.length - 1) {
      e.completed = true;
    }
  }, [currentIndex, currentFile?.id, showPreview, isAllImages]);

  // Keyboard Navigation
  useEffect(() => {
    if (!hasMultipleFiles) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey ||
        (e.target instanceof Element && e.target.closest(
          'input, textarea, select, button, a, audio, video, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="tab"]',
        ))
      ) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " " && isAllImages) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleFiles, files, isAllImages]);

  // Touch Navigation
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    if (isAudio) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (isAudio || touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goNext();
    if (isRightSwipe) goPrev();
  };

  // Download All Handler
  const handleDownloadAll = async () => {
    if (!files || isZipping) return;
    engagement.current.downloads += 1;

    try {
      setIsZipping(true);
      const zip = new JSZip();
      const entryNames = safeZipEntryNames(files.map((file) => file.name));

      // Fetch all files
      const promises = files.map(async (file, index) => {
        const response = await fetch(getDownloadUrl(file.path));
        if (!response.ok) {
          throw new Error(`Failed to download ${file.name}`);
        }
        const blob = await response.blob();
        zip.file(entryNames[index], blob);
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "slideshow"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Let browsers (especially Safari) begin consuming the download before
      // releasing its backing Blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setZipError(null);
    } catch (error) {
      console.error("Failed to zip files:", error);
      const msg = "Failed to create ZIP. Try downloading files individually.";
      setZipError(msg);
      addToast(msg, 4000);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadClick = () => {
    engagement.current.downloads += 1;
    if (!isUnlimited && remainingDownloads <= 1) {
      // Let the anchor's default navigation begin before replacing it with
      // the one-time status message.
      setTimeout(() => setLastDownloadStarted(true), 0);
      setIsExploding(true);
      setTimeout(() => setIsExploding(false), 2000);
    }
  };

  return (
    <div
      class={`min-h-screen flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden transition-colors duration-500 ${getThemeStyles()}`}
    >
      {isExploding && (
        <div class="fixed inset-0 z-[100] bg-qr-scrim/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div class="text-7xl sm:text-9xl animate-bounce mb-4">💥</div>
          <h2 class="text-3xl sm:text-5xl font-black text-red-500 tracking-tight animate-pulse mb-3">
            SELF-DESTRUCT INITIATED
          </h2>
          <p class="text-base sm:text-lg font-mono text-yellow-300 font-bold max-w-md">
            Your download is starting. This link has used its final pass.
          </p>
          <div class="mt-8 flex gap-3 text-3xl animate-pulse">
            <span>💣</span>
            <span>🔥</span>
            <span>💨</span>
          </div>
        </div>
      )}

      {/* Slideshow Container */}
      <div class="w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
        <header class="w-full max-w-md text-center space-y-2">
          <div
            class={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide px-3.5 py-2 rounded-full ${
              isTerminal
                ? "bg-black border-2 border-[#00FF41] text-[#00FF41] shadow-[2px_2px_0px_rgba(0,255,65,0.4)]"
                : isDarkTheme
                ? "bg-slate-900 border-2 border-white/80 text-white shadow-chunky"
                : "bg-white border-2 border-black text-black shadow-chunky"
            }`}
          >
            <span>
              {isAllAudio
                ? "Mixtape Playlist 🎵"
                : isAllImages
                ? "Image Slideshow 🖼️"
                : hasMultipleFiles
                ? "Multi-File Pack 📦"
                : isUnlimited
                ? "Shared file"
                : "Limited share"}
            </span>
            {hasMultipleFiles && (
              <>
                <span class="opacity-50">•</span>
                <span>{currentIndex + 1} / {files!.length}</span>
              </>
            )}
          </div>
          <h1 class="text-2xl sm:text-3xl font-black leading-tight break-words">
            {shareTitle}
          </h1>
          <p class="text-sm font-bold opacity-80">
            {hasMultipleFiles
              ? prettyName(displayFileName)
              : `${fileKindLabel} • ${fileSizeLabel}`}
          </p>
        </header>

        {/* Main Content Card */}
        <div
          class={`relative w-full ${
            isAudio && showPreview ? "" : "aspect-[4/3] md:aspect-video"
          } rounded-3xl overflow-hidden group ${getCardStyles()}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Audio has a tracklist; overlay arrows would cover native controls. */}
          {hasMultipleFiles && !isAudio && (
            <>
              <button
                type="button"
                onClick={goPrev}
                class={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] rounded-full font-black text-base sm:opacity-0 group-hover:opacity-100 transition-all shadow-chunky ${
                  isTerminal
                    ? "bg-black text-[#00FF41] border-2 border-[#00FF41] hover:bg-[#00FF41] hover:text-black"
                    : "bg-white text-black border-2 border-black hover:bg-amber-200"
                }`}
                aria-label="Previous track or image"
              >
                ←
              </button>
              <button
                type="button"
                onClick={goNext}
                class={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] rounded-full font-black text-base sm:opacity-0 group-hover:opacity-100 transition-all shadow-chunky ${
                  isTerminal
                    ? "bg-black text-[#00FF41] border-2 border-[#00FF41] hover:bg-[#00FF41] hover:text-black"
                    : "bg-white text-black border-2 border-black hover:bg-amber-200"
                }`}
                aria-label="Next track or image"
              >
                →
              </button>
            </>
          )}

          {/* Media Content */}
          <div class="w-full h-full flex items-center justify-center p-4">
            {showPreview
              ? (
                <>
                  {isImage && (
                    mediaErrorKey === currentDownloadUrl
                      ? (
                        <div
                          class={`flex flex-col items-center justify-center p-6 text-center space-y-3 rounded-2xl border-2 ${
                            isDarkTheme
                              ? "bg-slate-900 border-white/40 text-white"
                              : "bg-white border-black text-black shadow-chunky"
                          }`}
                        >
                          <span class="text-4xl">⚠️</span>
                          <p class="font-bold text-sm">
                            Couldn't load photo
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaErrorKey(null);
                              haptics.light();
                            }}
                            class="min-h-[44px] px-4 py-2 rounded-full border-2 border-black bg-amber-200 text-black font-black text-xs hover:bg-amber-300 transition-all shadow-chunky"
                          >
                            🔄 Retry photo
                          </button>
                        </div>
                      )
                      : (
                        <img
                          key={currentDownloadUrl} // Force re-render on change
                          src={currentDownloadUrl}
                          alt={displayFileName}
                          onError={() => setMediaErrorKey(currentDownloadUrl)}
                          class="w-full h-full object-contain animate-scale-in"
                        />
                      )
                  )}
                  {isAudio && (
                    <div
                      class={`w-full max-w-md p-6 sm:p-8 rounded-2xl border-2 text-center space-y-4 ${
                        isTerminal
                          ? "bg-black border-[#00FF41] text-[#00FF41]"
                          : isDarkTheme
                          ? "bg-slate-900 border-white/40 text-white"
                          : "bg-white border-black text-black"
                      }`}
                    >
                      <div class="text-5xl sm:text-6xl animate-float">🎵</div>
                      <div>
                        <p class="font-black text-lg truncate mb-1">
                          {displayFileName}
                        </p>
                        {hasMultipleFiles && (
                          <p class="text-xs font-bold opacity-75">
                            Track {currentIndex + 1} of {files!.length}
                          </p>
                        )}
                      </div>
                      <audio
                        ref={audioRef}
                        key={currentDownloadUrl}
                        controls
                        autoPlay={currentIndex > 0 || trackSelected}
                        onError={() => setMediaErrorKey(currentDownloadUrl)}
                        onPlay={() => {
                          if (currentFile) {
                            engagement.current.items[currentFile.id] =
                              (engagement.current.items[currentFile.id] ?? 0) +
                              1;
                          }
                        }}
                        onEnded={handleTrackEnded}
                        class="w-full"
                      >
                        <source
                          src={currentDownloadUrl}
                          type={displayMimeType}
                        />
                        Your browser does not support the audio element.
                      </audio>
                      {mediaErrorKey === currentDownloadUrl && (
                        <div class="p-2.5 rounded-xl border-2 border-red-600 bg-red-100 text-xs font-bold text-red-950 flex items-center justify-between gap-2 animate-slide-down">
                          <span>Audio failed to load.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaErrorKey(null);
                              audioRef.current?.load();
                              haptics.light();
                            }}
                            class="min-h-[36px] px-3 py-1 rounded-lg border-2 border-black bg-white text-black font-black text-xs hover:bg-amber-100"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Tracklist — names, not numbers */}
                      {hasMultipleFiles && (
                        <ol class="text-left space-y-1 pt-2 max-h-44 overflow-y-auto scrollbar-none">
                          {files!.map((file, idx) => {
                            const active = currentIndex === idx;
                            return (
                              <li key={file.id}>
                                <button
                                  type="button"
                                  onClick={() => goTo(idx)}
                                  aria-current={active ? "true" : undefined}
                                  class={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-all border-2 ${
                                    isTerminal
                                      ? active
                                        ? "bg-[#00FF41] text-black border-[#00FF41]"
                                        : "border-transparent text-[#00FF41] hover:bg-[#00FF41]/15"
                                      : isDarkTheme
                                      ? active
                                        ? "bg-white text-black border-white"
                                        : "border-transparent text-white/90 hover:bg-white/10"
                                      : active
                                      ? "bg-amber-200 text-black border-black shadow-chunky"
                                      : "border-transparent text-black/85 hover:bg-amber-50 hover:border-black/20"
                                  }`}
                                >
                                  <span class="w-5 text-xs font-black opacity-75 text-right">
                                    {active ? "▶" : idx + 1}
                                  </span>
                                  <span class="truncate">
                                    {prettyName(file.name)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  )}
                  {isVideo && (
                    <video
                      key={currentDownloadUrl}
                      controls
                      class="w-full h-full object-contain bg-black rounded-xl"
                    >
                      <source src={currentDownloadUrl} type={displayMimeType} />
                      Your browser does not support the video element.
                    </video>
                  )}
                </>
              )
              : (
                <div class="text-center p-6 sm:p-8 max-w-md">
                  <div class="text-7xl sm:text-8xl mb-5">
                    {isUnlimited ? fileGlyph : "💣"}
                  </div>
                  <h2 class="text-2xl font-black mb-2">
                    {isUnlimited ? `${fileKindLabel} ready` : "Preview locked"}
                  </h2>
                  <p class="opacity-80 font-medium leading-relaxed">
                    {isUnlimited
                      ? "Download or preview this shared file."
                      : "This share is limited, so preview stays closed until download starts."}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Slideshow transport: dots + play/pause */}
        {isAllImages && showPreview && (
          <div class="flex items-center justify-center gap-3 -mt-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
              class={`min-h-[44px] min-w-[44px] rounded-full text-base font-black flex items-center justify-center transition-all shadow-chunky ${
                isTerminal
                  ? "bg-black border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black"
                  : isDarkTheme
                  ? "bg-slate-900 border-2 border-white text-white hover:bg-slate-800"
                  : "bg-white border-2 border-black text-black hover:bg-amber-200"
              }`}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <div class="max-w-[calc(100vw-7rem)] sm:max-w-[480px] flex flex-wrap items-center justify-center gap-1.5">
              {files!.map((file, idx) => (
                <button
                  type="button"
                  key={file.id}
                  onClick={() => goTo(idx)}
                  aria-label={`Photo ${idx + 1}`}
                  aria-current={currentIndex === idx ? "step" : undefined}
                  class="min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <span
                    class={`block h-2.5 rounded-full transition-all ${
                      isTerminal
                        ? currentIndex === idx
                          ? "w-6 bg-[#00FF41]"
                          : "w-2.5 bg-[#00FF41]/40 hover:bg-[#00FF41]/75"
                        : isDarkTheme
                        ? currentIndex === idx
                          ? "w-6 bg-white"
                          : "w-2.5 bg-white/40 hover:bg-white/75"
                        : currentIndex === idx
                        ? "w-6 bg-black"
                        : "w-2.5 bg-black/35 hover:bg-black/65"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Details & Actions (Compressed Neo-Toybrut action dock) */}
        <div class="w-full max-w-md space-y-4">
          <div
            class={`rounded-3xl p-4 sm:p-5 space-y-3 ${getCardStyles()}`}
          >
            <div class="flex items-center justify-between gap-2 text-xs font-black opacity-80">
              <span class="truncate">
                {hasMultipleFiles
                  ? `${prettyName(displayFileName)} (${currentIndex + 1}/${
                    files!.length
                  })`
                  : displayFileName}
              </span>
              <span class="shrink-0">
                {fileSizeLabel}
                {formattedExpiry
                  ? ` · Exp ${formattedExpiry.slice(0, 10)}`
                  : ""}
              </span>
            </div>

            {/* Primary Download + Secondary Zip Row */}
            {lastDownloadStarted
              ? (
                <p
                  role="status"
                  class="min-h-[48px] flex items-center justify-center w-full px-4 py-3 rounded-2xl bg-red-100 border-2 border-black text-red-950 font-black text-center text-sm"
                >
                  One-time link used. Your download may take a moment.
                </p>
              )
              : (
                <div
                  class={hasMultipleFiles && isUnlimited
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
                    : ""}
                >
                  <a
                    href={primaryDownloadUrl}
                    download={primaryDownloadName}
                    onClick={handleDownloadClick}
                    class={`min-h-[48px] flex items-center justify-center w-full px-4 py-2.5 rounded-2xl font-black text-center text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-chunky ${
                      isUnlimited
                        ? isTerminal
                          ? "bg-[#00FF41] text-black border-2 border-[#00FF41]"
                          : isDarkTheme
                          ? "bg-white text-black border-2 border-white hover:bg-slate-200"
                          : "bg-[#fbbf24] text-[#1e1714] border-2 border-[#1e1714] hover:bg-[#f59e0b]"
                        : "bg-gradient-to-r from-red-500 to-orange-500 text-white border-2 border-black shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse-glow"
                    }`}
                  >
                    {hasMultipleFiles && !isUnlimited
                      ? "Download All & Destroy (.zip) 💥"
                      : isUnlimited
                      ? `Download ${fileKindLabel} ↓`
                      : "Download & Destroy 💥"}
                  </a>

                  {hasMultipleFiles && isUnlimited && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={isZipping}
                      class={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-center text-sm transition-all border-2 disabled:opacity-60 ${
                        isTerminal
                          ? "border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41]/10"
                          : isDarkTheme
                          ? "border-white/50 text-white hover:bg-white/10"
                          : "bg-white border-black text-black shadow-chunky hover:bg-amber-100"
                      }`}
                    >
                      {isZipping ? "Zipping..." : "Download All (.zip)"}
                    </button>
                  )}
                </div>
              )}

            {zipError && (
              <p
                role="alert"
                class="text-xs text-center text-red-950 font-bold bg-red-100 p-2 rounded-xl border-2 border-black animate-slide-down"
              >
                {zipError}
              </p>
            )}

            {!isUnlimited && (
              <p
                class={`text-xs text-center font-bold leading-snug rounded-xl p-2 border-2 ${
                  isDarkTheme
                    ? "text-amber-200 bg-amber-950/60 border-amber-400/50"
                    : "text-amber-950 bg-amber-100 border-black"
                }`}
              >
                {hasMultipleFiles
                  ? "Limited share: downloads as one zip and consumes 1 use."
                  : "Starting this download consumes 1 use."}
              </p>
            )}

            <ShareActions
              shareUrl={globalThis.location?.href ?? ""}
              shareText={`Check out ${shareTitle} on QRBuddy.`}
              onShared={() => beacon({ kind: "engagement", shares: 1 })}
            />

            {/* Limits Info */}
            <div
              class={`flex justify-between text-xs font-bold opacity-75 pt-2 border-t-2 ${
                isDarkTheme ? "border-white/20" : "border-black/15"
              }`}
            >
              <span>
                {isUnlimited
                  ? "∞ Unlimited Downloads"
                  : `${remainingDownloads}/${maxDownloads} uses left`}
              </span>
              {!unbranded && <span>Powered by QRBuddy</span>}
            </div>
          </div>

          {/* Owner only — renders nothing for everyone else */}
          {files && (
            <OwnerStrip
              fileId={fileId}
              shareUrl={globalThis.location?.href ?? ""}
              title={shareTitle}
              files={files}
              theme={theme}
              isLimited={!isUnlimited}
              kind={ownerKind}
              lang={lang}
              unbranded={unbranded}
              onUnbranded={() => setUnbranded(true)}
              onTitle={setFileName}
              onFiles={(next) => {
                setFiles(next);
                setCurrentIndex((i) => Math.min(i, next.length - 1));
              }}
              onTheme={setTheme}
            />
          )}

          {/* Create Your Own */}
          {!unbranded && (
            <div class="text-center">
              <a
                href={isSpanish
                  ? "/es?utm_source=file_download&utm_medium=slideshow"
                  : "/?utm_source=file_download&utm_medium=slideshow"}
                class={SHARE_FOOTER_PILL_CLASS}
              >
                {getShareFooterPillCopy(lang)}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

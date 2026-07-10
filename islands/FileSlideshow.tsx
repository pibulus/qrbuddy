import { useEffect, useState } from "preact/hooks";
import JSZip from "jszip";
import { formatFileSize } from "../utils/file-validation.ts";

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
  theme?: string;
}

export default function FileSlideshow({
  files,
  fileId,
  fileName,
  fileSize,
  mimeType,
  maxDownloads,
  remainingDownloads,
  theme = "sunset",
}: FileSlideshowProps) {
  const isUnlimited = maxDownloads >= 999999;

  // Slideshow State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const hasMultipleFiles = files && files.length > 1;
  const currentFile = hasMultipleFiles ? files![currentIndex] : null;

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
  const primaryDownloadName = hasMultipleFiles && !isUnlimited
    ? `${fileName || "files"}.zip`
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
  const getThemeStyles = () => {
    switch (theme) {
      case "noir":
        return "bg-black text-white";
      case "brutalist":
        return "bg-[#f4f1ea] text-[#2c2c2c]";
      case "terminal":
        return "bg-[#0a0a2a] text-[#00ff9d]";
      case "pool":
        return "bg-gradient-to-br from-[#0b2740] via-[#0e3a5c] to-black text-white";
      case "candy":
        return "bg-gradient-to-br from-[#2b0f24] via-[#3a1430] to-black text-white";
      case "vapor":
        return "bg-gradient-to-br from-[#1d1038] via-[#2a1748] to-black text-white";
      case "sunset":
      default:
        return "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white";
    }
  };

  const getCardStyles = () => {
    switch (theme) {
      case "noir":
        return "bg-white/10 border-white/20";
      case "brutalist":
        return "bg-[#e8e4da] border-[#2c2c2c] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
      case "terminal":
        return "bg-[#0f0f3a] border-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.3)]";
      case "pool":
      case "candy":
      case "vapor":
        return "bg-black/40 border-white/15 shadow-2xl backdrop-blur-md";
      case "sunset":
      default:
        return "bg-black/50 border-white/10 shadow-2xl backdrop-blur-md";
    }
  };

  // Navigation Handlers
  const nextSlide = () => {
    if (!hasMultipleFiles) return;
    setCurrentIndex((prev) => (prev + 1) % files!.length);
  };

  const prevSlide = () => {
    if (!hasMultipleFiles) return;
    setCurrentIndex((prev) => (prev - 1 + files!.length) % files!.length);
  };

  // Keyboard Navigation
  useEffect(() => {
    if (!hasMultipleFiles) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleFiles, files]);

  // Touch Navigation
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  // Download All Handler
  const handleDownloadAll = async () => {
    if (!files || isZipping) return;

    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Fetch all files
      const promises = files.map(async (file) => {
        const response = await fetch(getDownloadUrl(file.path));
        if (!response.ok) {
          throw new Error(`Failed to download ${file.name}`);
        }
        const blob = await response.blob();
        zip.file(file.name, blob);
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
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip files:", error);
      alert("Failed to create zip file. Please try downloading individually.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      class={`min-h-screen flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden transition-colors duration-500 ${getThemeStyles()}`}
    >
      {/* Slideshow Container */}
      <div class="w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
        <header class="w-full max-w-md text-center space-y-2">
          <div
            class={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide px-3 py-2 rounded-full border ${getCardStyles()}`}
          >
            <span>{isUnlimited ? "Shared file" : "Limited share"}</span>
            {hasMultipleFiles && (
              <>
                <span class="opacity-40">•</span>
                <span>{currentIndex + 1} / {files!.length}</span>
              </>
            )}
          </div>
          <h1 class="text-2xl sm:text-3xl font-black leading-tight break-words">
            {displayFileName}
          </h1>
          <p class="text-sm opacity-60">
            {fileKindLabel} • {fileSizeLabel}
          </p>
        </header>

        {/* Main Content Card */}
        <div
          class={`relative w-full aspect-[4/3] md:aspect-video rounded-3xl overflow-hidden border group ${getCardStyles()}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Navigation Arrows (Desktop) */}
          {hasMultipleFiles && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black backdrop-blur-sm"
                aria-label="Previous image"
              >
                ←
              </button>
              <button
                type="button"
                onClick={nextSlide}
                class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/60 text-white sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black backdrop-blur-sm"
                aria-label="Next image"
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
                    <img
                      key={currentDownloadUrl} // Force re-render on change
                      src={currentDownloadUrl}
                      alt={displayFileName}
                      class="w-full h-full object-contain animate-scale-in"
                    />
                  )}
                  {isAudio && (
                    <div
                      class={`w-full max-w-md p-8 rounded-2xl border text-center ${getCardStyles()}`}
                    >
                      <div class="text-6xl mb-4">🎵</div>
                      <p class="mb-4 font-bold truncate">{displayFileName}</p>
                      <audio controls class="w-full">
                        <source
                          src={currentDownloadUrl}
                          type={displayMimeType}
                        />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                  {isVideo && (
                    <video
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
                  <p class="opacity-70 leading-relaxed">
                    {isUnlimited
                      ? "Download or preview this shared file."
                      : "This share is limited, so preview stays closed until download starts."}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* File Details & Actions */}
        <div class="w-full max-w-md space-y-4">
          <div
            class={`rounded-2xl p-5 sm:p-6 space-y-4 border ${getCardStyles()}`}
          >
            <div class="flex items-start justify-between gap-3">
              <h1
                class="text-lg sm:text-xl font-bold break-words flex-1"
                title={displayFileName}
              >
                {displayFileName}
              </h1>
              <span class="text-xs sm:text-sm opacity-60 whitespace-nowrap pt-1">
                {fileSizeLabel}
              </span>
            </div>

            {/* Download Button */}
            <a
              href={primaryDownloadUrl}
              download={primaryDownloadName}
              class={`min-h-[56px] flex items-center justify-center w-full px-4 py-4 rounded-xl font-black text-center text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isUnlimited
                  ? (theme === "terminal"
                    ? "bg-[#00ff9d] text-black"
                    : "bg-white text-black hover:bg-gray-200")
                  : "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse-glow"
              }`}
            >
              {hasMultipleFiles && !isUnlimited
                ? "Download All & Destroy (.zip) 💥"
                : isUnlimited
                ? `Download ${fileKindLabel} ↓`
                : "Download & Destroy 💥"}
            </a>

            {/* Download All Button */}
            {hasMultipleFiles && isUnlimited && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isZipping}
                class={`min-h-[48px] block w-full py-3 rounded-xl font-bold text-center text-base transition-all border-2 disabled:opacity-60 ${
                  theme === "terminal"
                    ? "border-[#00ff9d] text-[#00ff9d] hover:bg-[#00ff9d]/10"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                {isZipping ? "Zipping..." : "Download All (.zip)"}
              </button>
            )}

            {hasMultipleFiles && !isUnlimited && (
              <p class="text-xs text-center text-orange-200 leading-relaxed">
                This limited share downloads as one zip so every file survives
                the trip. Starting the download consumes one use.
              </p>
            )}

            {!isUnlimited && !hasMultipleFiles && (
              <p class="text-xs text-center text-orange-200 leading-relaxed">
                Starting this download consumes one use, even if the browser
                later cancels the handoff.
              </p>
            )}

            {/* Limits Info */}
            <div class="flex justify-between text-xs opacity-50 pt-2 border-t border-white/10">
              <span>
                {isUnlimited
                  ? "∞ Unlimited Downloads"
                  : `${remainingDownloads}/${maxDownloads} uses left`}
              </span>
              <span>Powered by QRBuddy</span>
            </div>
          </div>

          {/* Create Your Own */}
          <div class="text-center">
            <a
              href="/?utm_source=file_download&utm_medium=slideshow"
              class="inline-block text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              Create your own slideshow →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

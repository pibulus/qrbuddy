import { useEffect, useState } from "preact/hooks";

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
}

export default function FileSlideshow({
  files,
  fileId,
  fileName,
  fileSize,
  mimeType,
  maxDownloads,
  remainingDownloads,
}: FileSlideshowProps) {
  const isUnlimited = maxDownloads >= 999999;
  
  // Slideshow State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const hasMultipleFiles = files && files.length > 1;
  const currentFile = hasMultipleFiles ? files![currentIndex] : null;

  // Determine what to show
  const displayFileName = currentFile ? currentFile.name : fileName;
  const displayFileSize = currentFile ? currentFile.size : fileSize;
  const displayMimeType = currentFile ? currentFile.type : mimeType;
  
  const fileSizeMB = (displayFileSize / (1024 * 1024)).toFixed(2);
  
  // Download URL logic
  const getDownloadUrl = (path?: string) => {
    let url = `/api/download-file?id=${fileId}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }
    return url;
  };

  const currentDownloadUrl = hasMultipleFiles 
    ? getDownloadUrl(currentFile!.path)
    : getDownloadUrl();

  // Helper to determine media type
  const isImage = displayMimeType?.startsWith("image/");
  const isAudio = displayMimeType?.startsWith("audio/");
  const isVideo = displayMimeType?.startsWith("video/");
  const showPreview = isUnlimited && (isImage || isAudio || isVideo);

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

  return (
    <div class="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      
      {/* Slideshow Container */}
      <div class="w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
        
        {/* Header / Counter */}
        {hasMultipleFiles && (
          <div class="flex items-center gap-2 text-sm font-medium text-gray-400 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
            <span>{currentIndex + 1}</span>
            <span class="text-gray-600">/</span>
            <span>{files!.length}</span>
          </div>
        )}

        {/* Main Content Card */}
        <div 
          class="relative w-full aspect-[4/3] md:aspect-video bg-black/50 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group"
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
                class="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
                aria-label="Previous image"
              >
                ←
              </button>
              <button 
                type="button"
                onClick={nextSlide}
                class="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
                aria-label="Next image"
              >
                →
              </button>
            </>
          )}

          {/* Media Content */}
          <div class="w-full h-full flex items-center justify-center p-4">
            {showPreview ? (
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
                  <div class="w-full max-w-md p-8 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 text-center">
                    <div class="text-6xl mb-4">🎵</div>
                    <p class="mb-4 font-bold truncate">{displayFileName}</p>
                    <audio controls class="w-full">
                      <source src={currentDownloadUrl} type={displayMimeType} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {isVideo && (
                  <video controls class="w-full h-full object-contain bg-black">
                    <source src={currentDownloadUrl} type={displayMimeType} />
                    Your browser does not support the video element.
                  </video>
                )}
              </>
            ) : (
              <div class="text-center p-8">
                <div class="text-8xl mb-6 animate-bounce-slow">
                  {isUnlimited ? "📦" : "💣"}
                </div>
                <h2 class="text-2xl font-bold mb-2">
                  {isUnlimited ? "Shared File" : "Self-Destructing File"}
                </h2>
                <p class="text-gray-400">Preview not available</p>
              </div>
            )}
          </div>
        </div>

        {/* File Details & Actions */}
        <div class="w-full max-w-md space-y-4">
          <div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h1 class="text-xl font-bold truncate flex-1 mr-4" title={displayFileName}>
                {displayFileName}
              </h1>
              <span class="text-sm text-gray-400 whitespace-nowrap">
                {fileSizeMB} MB
              </span>
            </div>

            {/* Download Button */}
            <a
              href={currentDownloadUrl}
              download={displayFileName}
              class={`block w-full py-4 rounded-xl font-bold text-center text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isUnlimited
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse-glow"
              }`}
            >
              {isUnlimited ? "Download Image ↓" : "Download & Destroy 💥"}
            </a>

            {/* Limits Info */}
            <div class="flex justify-between text-xs text-gray-500 pt-2 border-t border-white/10">
              <span>
                {isUnlimited ? "∞ Unlimited Downloads" : `${remainingDownloads}/${maxDownloads} uses left`}
              </span>
              <span>Powered by QRBuddy</span>
            </div>
          </div>

          {/* Create Your Own */}
          <div class="text-center">
            <a
              href="/?utm_source=file_download&utm_medium=slideshow"
              class="inline-block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Create your own slideshow →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

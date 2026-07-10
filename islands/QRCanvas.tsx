import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { addToast } from "./ToastManager.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { addToHistory } from "../utils/history.ts";
import { haptics } from "../utils/haptics.ts";

interface QRCanvasProps {
  url: Signal<string>;
  style: Signal<keyof typeof QR_STYLES | "custom">;
  customStyle?: Signal<QRStyle | null>;
  triggerDownload: Signal<boolean>;
  isDestructible?: Signal<boolean>;
  isDynamic?: Signal<boolean>;
  logoUrl?: Signal<string>;
  maxDownloads?: Signal<number>;
  /** Frame ("SCAN ME") config — previewed on the card, baked into PNGs. */
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  /** Listen for global "qr-export" events (only the primary canvas should). */
  listenForExportEvents?: boolean;
}

export default function QRCanvas(
  {
    url,
    style,
    customStyle,
    triggerDownload,
    isDestructible,
    isDynamic,
    logoUrl,
    maxDownloads,
    frameConfig,
    listenForExportEvents = false,
  }: QRCanvasProps,
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  // The init effect already renders with the current signal values, so the
  // update effect must skip its OWN first (mount) run to avoid a double render.
  const updateEffectRan = useRef(false);
  const [isDragHover, setIsDragHover] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  // "Watch it bloom": a tiny scale tick every time the QR data changes, and a
  // springy pop when the style changes — the card acknowledges every update.
  const [bloomTick, setBloomTick] = useState(false);
  const [stylePop, setStylePop] = useState(false);
  const prevStyleRef = useRef(style.value);
  const prevCustomRef = useRef(customStyle?.value);

  useEffect(() => {
    if (!url.value) return;
    setBloomTick(true);
    const t = setTimeout(() => setBloomTick(false), 180);
    return () => clearTimeout(t);
  }, [url.value]);

  useEffect(() => {
    const styleChanged = prevStyleRef.current !== style.value;
    const customChanged = prevCustomRef.current !== customStyle?.value;
    if (!styleChanged && !customChanged) return;
    prevStyleRef.current = style.value;
    prevCustomRef.current = customStyle?.value;
    setStylePop(true);
    const popTimer = setTimeout(() => setStylePop(false), 380);
    return () => clearTimeout(popTimer);
  }, [style.value, customStyle?.value]);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragHover(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragHover(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragHover(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const uploadEvent = new CustomEvent("smart-input-upload", {
        detail: { file: files[0] },
      });
      globalThis.dispatchEvent(uploadEvent);
    }
  };

  // Composite the QR onto a chunky-bordered card with a caption strip and
  // download the result — the "SCAN ME" table-tent look, baked into the file.
  const downloadFramedPng = async (caption: string) => {
    const qr = qrCodeRef.current;
    if (!qr) return;
    const raw = await qr.getRawData("png");
    if (!raw) return;
    const img = await createImageBitmap(raw as Blob);

    const pad = 64;
    const border = 20;
    const captionText = caption.trim().toUpperCase();
    const capH = captionText ? 170 : 0;
    const canvas = document.createElement("canvas");
    canvas.width = img.width + pad * 2;
    canvas.height = img.height + pad * 2 + capH;
    const ctx = canvas.getContext("2d")!;

    // Cream card with a fat black border, soft-brutal style.
    const r = 56;
    ctx.fillStyle = "#FFFBF5";
    ctx.beginPath();
    ctx.roundRect(
      border / 2,
      border / 2,
      canvas.width - border,
      canvas.height - border,
      r,
    );
    ctx.fill();
    ctx.lineWidth = border;
    ctx.strokeStyle = "#000000";
    ctx.stroke();

    ctx.drawImage(img, pad, pad);

    if (captionText) {
      ctx.fillStyle = "#000000";
      ctx.font = "900 92px 'Inter Black', Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        captionText,
        canvas.width / 2,
        img.height + pad + capH / 2 + 12,
        canvas.width - pad * 2,
      );
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qrbuddy-${style.value}-framed-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadClick = async () => {
    if (!qrCodeRef.current) return;

    // Squish animation on click
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);

    // Trigger download — framed composite when a frame is on
    if (frameConfig?.value?.enabled) {
      await downloadFramedPng(frameConfig.value.caption);
    } else {
      qrCodeRef.current.download({
        name: `qrbuddy-${style.value}-${Date.now()}`,
        extension: "png",
      });
    }

    // Save to history (Time Machine)
    if (url.value) {
      addToHistory({
        type: "url", // Generic type for static QRs
        content: url.value,
        metadata: {
          title: url.value.length > 30
            ? url.value.substring(0, 30) + "..."
            : url.value,
        },
      });
    }

    // Copy URL to clipboard
    if (url.value) {
      try {
        await navigator.clipboard.writeText(url.value);
        addToast("URL copied to clipboard! 📋");
      } catch (err) {
        console.error("Failed to copy URL:", err);
        addToast("Failed to copy URL ❌");
      }
    }

    // Show success flash + close the loop physically
    haptics.success();
    setShowSuccessFlash(true);
    setTimeout(() => setShowSuccessFlash(false), 600);
  };

  // Derive the ambient-glow gradient from the ACTIVE style's dot colors so the
  // glow matches the QR (it used to be hardcoded sunset — looked like a bug on
  // Terminal/Brutalist). Falls back to the sunset tokens if colors are missing.
  const getGlowGradient = (): string => {
    const s = getCurrentStyle();
    const dots = s?.dots as
      | { color?: string; gradient?: { colorStops?: { color: string }[] } }
      | undefined;
    const stops = dots?.gradient?.colorStops?.map((cs) => cs.color);
    if (stops && stops.length >= 2) {
      return `linear-gradient(135deg, ${stops.join(", ")})`;
    }
    if (dots?.color) {
      return `linear-gradient(135deg, ${dots.color}, ${dots.color})`;
    }
    return "linear-gradient(135deg, #FFE5B4, #FF69B4, #9370DB)";
  };

  // Helper function to get the current style object
  const getCurrentStyle = () => {
    if (style.value === "custom" && customStyle?.value) {
      return customStyle.value;
    }
    return QR_STYLES[style.value as keyof typeof QR_STYLES];
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const currentStyle = getCurrentStyle();

    const qrCode = new QRCodeStyling({
      width: 1000,
      height: 1000,
      data: url.value || "https://qrbuddy.app",
      margin: 20,
      image: logoUrl?.value || undefined,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        // A center logo hides modules — bump error correction to compensate.
        errorCorrectionLevel: logoUrl?.value ? "H" : "Q",
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 8,
      },
      dotsOptions: {
        type:
          ("type" in currentStyle.dots && currentStyle.dots.type === "gradient")
            ? "rounded"
            : "square",
        color: "color" in currentStyle.dots
          ? currentStyle.dots.color
          : undefined,
        gradient: "gradient" in currentStyle.dots
          ? currentStyle.dots.gradient
          : undefined,
      },
      backgroundOptions: {
        color: "color" in currentStyle.background
          ? currentStyle.background.color
          : undefined,
        gradient: "gradient" in currentStyle.background
          ? currentStyle.background.gradient
          : undefined,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color:
          currentStyle.cornersSquare && "color" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.color
            : undefined,
        gradient:
          currentStyle.cornersSquare && "gradient" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.gradient
            : undefined,
      },
      cornersDotOptions: {
        type: "dot",
        color: currentStyle.cornersDot && "color" in currentStyle.cornersDot
          ? currentStyle.cornersDot.color
          : undefined,
        gradient:
          currentStyle.cornersDot && "gradient" in currentStyle.cornersDot
            ? currentStyle.cornersDot.gradient
            : undefined,
      },
    });

    canvasRef.current.innerHTML = "";
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
  }, []);

  useEffect(() => {
    if (!qrCodeRef.current) return;
    // Skip this effect's first (mount) run — the init effect above already
    // rendered the current signal values, so updating again would double-render.
    if (!updateEffectRan.current) {
      updateEffectRan.current = true;
      return;
    }

    const currentStyle = getCurrentStyle();

    qrCodeRef.current.update({
      data: url.value || "https://qrbuddy.app",
      image: logoUrl?.value || undefined,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        // A center logo hides modules — bump error correction to compensate.
        errorCorrectionLevel: logoUrl?.value ? "H" : "Q",
      },
      dotsOptions: {
        type:
          ("type" in currentStyle.dots && currentStyle.dots.type === "gradient")
            ? "rounded"
            : "square",
        color: "color" in currentStyle.dots
          ? currentStyle.dots.color
          : undefined,
        gradient: "gradient" in currentStyle.dots
          ? currentStyle.dots.gradient
          : undefined,
      },
      backgroundOptions: {
        color: "color" in currentStyle.background
          ? currentStyle.background.color
          : undefined,
        gradient: "gradient" in currentStyle.background
          ? currentStyle.background.gradient
          : undefined,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color:
          currentStyle.cornersSquare && "color" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.color
            : undefined,
        gradient:
          currentStyle.cornersSquare && "gradient" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.gradient
            : undefined,
      },
      cornersDotOptions: {
        type: "dot",
        color: currentStyle.cornersDot && "color" in currentStyle.cornersDot
          ? currentStyle.cornersDot.color
          : undefined,
        gradient:
          currentStyle.cornersDot && "gradient" in currentStyle.cornersDot
            ? currentStyle.cornersDot.gradient
            : undefined,
      },
    });
  }, [url.value, style.value, customStyle?.value, logoUrl?.value]);

  useEffect(() => {
    if (triggerDownload.value && qrCodeRef.current) {
      qrCodeRef.current.download({
        name: `qrbuddy-${style.value}-${Date.now()}`,
        extension: "png",
      });
      triggerDownload.value = false;
    }
  }, [triggerDownload.value]);

  // Global export requests (from the Create modal's Design tab).
  useEffect(() => {
    if (!listenForExportEvents) return;
    const handleExport = (event: Event) => {
      const format = (event as CustomEvent<{ format?: string }>).detail
        ?.format;
      const qr = qrCodeRef.current;
      if (!qr) return;
      if (format === "svg") {
        qr.download({
          name: `qrbuddy-${style.value}-${Date.now()}`,
          extension: "svg",
        });
      } else if (frameConfig?.value?.enabled) {
        void downloadFramedPng(frameConfig.value.caption);
      } else {
        qr.download({
          name: `qrbuddy-${style.value}-${Date.now()}`,
          extension: "png",
        });
      }
    };
    globalThis.addEventListener("qr-export", handleExport as EventListener);
    return () =>
      globalThis.removeEventListener(
        "qr-export",
        handleExport as EventListener,
      );
  }, [listenForExportEvents]);

  return (
    <div
      class={`relative max-w-full w-full ${stylePop ? "animate-pop-in" : ""}`}
    >
      <div
        ref={canvasRef}
        onClick={handleDownloadClick}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDownloadClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Download QR code as PNG"
        class={`
          bg-white rounded-chunky border-4
          ${showSuccessFlash ? "border-green-500" : "border-black"}
          shadow-chunky-hover cursor-pointer
          transition-all duration-300
          w-full flex justify-center items-center
          [&>canvas]:w-full [&>canvas]:h-auto
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-400
          ${
          isClicking
            ? "scale-95"
            : bloomTick
            ? "scale-[1.02]"
            : !url.value
            ? "scale-[0.97] hover:scale-100"
            : "hover:scale-105"
        }
          ${
          isDragHover
            ? "ring-8 ring-pink-400 ring-opacity-60 animate-pulse"
            : ""
        }
          ${
          !isClicking && !isDragHover
            ? "hover:shadow-[0_0_30px_rgba(255,105,180,0.4)]"
            : ""
        }
        `}
        title="Click to download"
      />
      <div
        class="absolute -z-10 inset-0 opacity-20 blur-xl rounded-chunky"
        style={{ background: getGlowGradient() }}
      />

      {/* Frame caption preview — the downloaded PNG bakes this in */}
      {frameConfig?.value?.enabled && frameConfig.value.caption.trim() !== "" &&
        (
          <div class="bg-white border-4 border-t-0 border-black rounded-b-chunky -mt-3 pt-4 pb-3 text-center animate-slide-down">
            <span class="font-chunky font-black text-xl sm:text-2xl tracking-wide text-black uppercase">
              {frameConfig.value.caption}
            </span>
          </div>
        )}

      {
        /* Empty state is shown, not told: full color always (a faded QR read
          as broken), but the card sits slightly small and grows to full size
          on the first character. The ⬇ chip appears with real content to
          show the card is a download button. */
      }
      {url.value && (
        <div
          class="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-white border-2 border-black shadow-chunky flex items-center justify-center text-xl font-black text-black z-10 pointer-events-none animate-bounce-in select-none"
          aria-hidden="true"
        >
          ↓
        </div>
      )}

      {/* Destructible badge */}
      {isDestructible?.value && (
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float will-change-transform z-10 pointer-events-none select-none">
          💣 {maxDownloads?.value === UNLIMITED_SCANS
            ? "∞"
            : maxDownloads?.value || 1}{" "}
          {maxDownloads?.value === 1 ? "scan" : "scans"}
        </div>
      )}

      {/* Dynamic QR badge */}
      {isDynamic?.value && !isDestructible?.value && (
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float will-change-transform z-10 pointer-events-none select-none">
          🔗 editable
        </div>
      )}
    </div>
  );
}

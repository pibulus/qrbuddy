import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { addToast } from "./ToastManager.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { addToHistory } from "../utils/history.ts";
import { haptics } from "../utils/haptics.ts";
import { checkQRScannability } from "../utils/qr-decode.ts";
import { createFramedSvg, measureCaptionWidth } from "../utils/svg-export.ts";

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
  // Decode-check verdict for the current render: silence means scannable.
  const [scanWarning, setScanWarning] = useState(false);
  const scanCheckToken = useRef(0);
  // True once the client-drawn canvas has painted; until then the SSR'd
  // default-QR image (static/qr-default.png) covers the card so the page
  // arrives in one piece instead of text-first, QR-later.
  const [qrReady, setQrReady] = useState(false);

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

  // Helper function to get the current style object. `style.value` can arrive
  // as anything (URL param, EasterEggs, an older shared link) — an unknown key
  // used to return `undefined` here, then blow up 4 lines later at `.dots`.
  // Falls back to "sunset", the app's own default (routes/index.tsx).
  const getCurrentStyle = () => {
    if (style.value === "custom" && customStyle?.value) {
      return customStyle.value;
    }
    return QR_STYLES[style.value as keyof typeof QR_STYLES] ??
      QR_STYLES.sunset;
  };

  const getQrOptions = (renderSize: number) => {
    const currentStyle = getCurrentStyle();

    const dotShape = (currentStyle.dots && "shape" in currentStyle.dots &&
        currentStyle.dots.shape)
      ? currentStyle.dots.shape
      : (("type" in currentStyle.dots &&
          currentStyle.dots.type === "gradient")
        ? "rounded"
        : "square");

    const cornerSquareShape = (currentStyle.cornersSquare &&
        "shape" in currentStyle.cornersSquare &&
        currentStyle.cornersSquare.shape)
      ? currentStyle.cornersSquare.shape
      : "extra-rounded";

    const cornerDotShape =
      (currentStyle.cornersDot && "shape" in currentStyle.cornersDot &&
          currentStyle.cornersDot.shape)
        ? currentStyle.cornersDot.shape
        : "dot";

    const scaleFactor = renderSize / 1000;

    return {
      width: renderSize,
      height: renderSize,
      data: url.value || "https://qrbuddy.app",
      margin: Math.max(1, Math.round(20 * scaleFactor)),
      image: logoUrl?.value || undefined,
      qrOptions: {
        typeNumber: 0 as const,
        mode: "Byte" as const,
        // A center logo hides modules — bump error correction to compensate.
        errorCorrectionLevel: logoUrl?.value ? ("H" as const) : ("Q" as const),
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.25,
        margin: Math.max(1, Math.round(6 * scaleFactor)),
        crossOrigin: "anonymous",
      },
      dotsOptions: {
        type: dotShape as
          | "rounded"
          | "dots"
          | "classy"
          | "classy-rounded"
          | "square"
          | "extra-rounded",
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
        type: cornerSquareShape as "dot" | "square" | "extra-rounded",
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
        type: cornerDotShape as "dot" | "square",
        color: currentStyle.cornersDot && "color" in currentStyle.cornersDot
          ? currentStyle.cornersDot.color
          : undefined,
        gradient:
          currentStyle.cornersDot && "gradient" in currentStyle.cornersDot
            ? currentStyle.cornersDot.gradient
            : undefined,
      },
    };
  };

  // Composite the QR onto a chunky-bordered card with a caption strip and
  // download the result — the "SCAN ME" table-tent look, baked into the file.
  // Proportional scaling ensures 1000, 2000, or 3000px longest edge.
  const downloadFramedPng = async ({
    caption,
    targetSize = 1000,
  }: {
    caption: string;
    targetSize?: 1000 | 2000 | 3000;
  }) => {
    const captionText = caption.trim().toUpperCase();
    const hasCaption = captionText.length > 0;

    const baseWidth = 1128;
    const baseHeight = hasCaption ? 1298 : 1128;
    const baseLongest = Math.max(baseWidth, baseHeight);
    const scale = targetSize / baseLongest;

    let canvasWidth: number;
    let canvasHeight: number;
    if (baseHeight >= baseWidth) {
      canvasHeight = targetSize;
      canvasWidth = Math.round(baseWidth * scale);
    } else {
      canvasWidth = targetSize;
      canvasHeight = Math.round(baseHeight * scale);
    }

    const pad = Math.round(64 * scale);
    const border = Math.max(2, Math.round(20 * scale));
    const qrSize = canvasWidth - pad * 2;
    const capH = hasCaption ? (canvasHeight - pad * 2 - qrSize) : 0;
    const r = Math.round(56 * scale);

    const baseFontSize = 92;
    const maxTextWidth = canvasWidth - pad * 2;
    const measuredWidth = measureCaptionWidth(
      captionText,
      baseFontSize * scale,
    );
    const fontSize = measuredWidth > maxTextWidth
      ? Math.max(
        Math.round(38 * scale),
        Math.floor(baseFontSize * scale * (maxTextWidth / measuredWidth)),
      )
      : Math.round(baseFontSize * scale);

    // Render the QR code directly at target qrSize
    const qrOptions = getQrOptions(qrSize);
    const exportQr = new QRCodeStyling(qrOptions);
    const raw = await exportQr.getRawData("png");
    if (!raw) throw new Error("QR image could not be created");
    const img = await createImageBitmap(raw as Blob);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");

    // Cream card with a fat black border, soft-brutal style.
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

    ctx.drawImage(img, pad, pad, qrSize, qrSize);

    if (hasCaption) {
      ctx.fillStyle = "#000000";
      ctx.font =
        `900 ${fontSize}px 'Inter Black', Inter, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        captionText,
        canvas.width / 2,
        pad + qrSize + capH / 2 + Math.round(12 * scale),
        maxTextWidth,
      );
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("Framed PNG could not be created");
    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = `qrbuddy-${style.value}-framed-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const downloadPng = async ({
    size = 1000,
    frame,
  }: {
    size?: 1000 | 2000 | 3000;
    frame?: { enabled: boolean; caption: string } | null;
  } = {}) => {
    const isFramed = frame !== undefined
      ? (frame?.enabled ?? false)
      : (frameConfig?.value?.enabled ?? false);
    const effectiveCaption = frame !== undefined
      ? (frame?.caption ?? "")
      : (frameConfig?.value?.caption ?? "");

    if (isFramed) {
      await downloadFramedPng({
        caption: effectiveCaption,
        targetSize: size,
      });
      return;
    }

    const qrOptions = getQrOptions(size);
    const exportQr = new QRCodeStyling(qrOptions);
    const raw = await exportQr.getRawData("png");
    if (!raw) throw new Error("QR image could not be created");

    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(raw as Blob);
    a.href = objectUrl;
    a.download = `qrbuddy-${style.value}-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const downloadSvg = async ({
    frame,
  }: {
    frame?: { enabled: boolean; caption: string } | null;
  } = {}) => {
    const isFramed = frame !== undefined
      ? (frame?.enabled ?? false)
      : (frameConfig?.value?.enabled ?? false);
    const effectiveCaption = frame !== undefined
      ? (frame?.caption ?? "")
      : (frameConfig?.value?.caption ?? "");

    const qrOptions = getQrOptions(1000);
    const exportQr = new QRCodeStyling(qrOptions);
    const raw = await exportQr.getRawData("svg");
    if (!raw) throw new Error("SVG raw data could not be generated");
    const rawText = await (raw as Blob).text();

    let finalSvgText = rawText;
    let fileName = `qrbuddy-${style.value}-${Date.now()}.svg`;

    if (isFramed) {
      // The helper normalizes the caption before measuring the text it exports.
      finalSvgText = createFramedSvg(rawText, effectiveCaption);
      fileName = `qrbuddy-${style.value}-framed-${Date.now()}.svg`;
    }

    const blob = new Blob([finalSvgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleDownloadClick = async () => {
    if (!qrCodeRef.current) return;

    // Squish animation on click
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);

    // Start the download — framed composite when a frame is on.
    try {
      await downloadPng();
      haptics.success();
      addToast("PNG download started! 🖼️");
      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 600);
    } catch (err) {
      console.error("Failed to start PNG download:", err);
      haptics.error();
      addToast("Couldn't start PNG download ❌");
      return;
    }

    // Save to history (Time Machine)
    if (url.value) {
      try {
        addToHistory({
          type: "url", // Generic type for static QRs
          content: url.value,
          metadata: {
            title: url.value.length > 30
              ? url.value.substring(0, 30) + "..."
              : url.value,
          },
        });
      } catch (err) {
        console.error("Failed to save QR to history:", err);
      }
    }
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
    return "linear-gradient(135deg, #FF8C42, #FF69B4, #9370DB)";
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const qrCode = new QRCodeStyling(getQrOptions(1000));

    // Remove any stale canvas but keep the SSR placeholder <img> (it's Preact's
    // to remove, via qrReady) — it covers the canvas until drawing settles.
    canvasRef.current.querySelectorAll("canvas, svg").forEach((n) =>
      n.remove()
    );
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
    // ponytail: fixed 300ms handoff — qr-code-styling has no public "painted"
    // promise; swap to one if the library ever exposes it.
    const readyTimer = setTimeout(() => setQrReady(true), 300);
    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (!qrCodeRef.current) return;
    // Skip this effect's first (mount) run — the init effect above already
    // rendered the current signal values, so updating again would double-render.
    if (!updateEffectRan.current) {
      updateEffectRan.current = true;
      return;
    }

    qrCodeRef.current.update(getQrOptions(1000));
  }, [url.value, style.value, customStyle?.value, logoUrl?.value]);

  // The honesty check: after each render settles, machine-decode the actual
  // canvas. If a real decoder can't read it (wild custom gradients, huge
  // payloads), say so with a chip instead of letting someone print a dud.
  useEffect(() => {
    const token = ++scanCheckToken.current;
    const timer = setTimeout(async () => {
      const source = canvasRef.current?.querySelector("canvas");
      if (!source) return;
      const verdict = await checkQRScannability(
        source,
        url.value || "https://qrbuddy.app",
      );
      if (token !== scanCheckToken.current) return; // superseded render
      setScanWarning(verdict === false);
    }, 700);
    return () => clearTimeout(timer);
  }, [url.value, style.value, customStyle?.value, logoUrl?.value]);

  useEffect(() => {
    if (triggerDownload.value && qrCodeRef.current) {
      void downloadPng().then(() => {
        haptics.success();
        addToast("PNG download started! 🖼️");
      }).catch((err) => {
        console.error("Failed to start PNG download:", err);
        haptics.error();
        addToast("Couldn't start PNG download ❌");
      });
      triggerDownload.value = false;
    }
  }, [triggerDownload.value]);

  // Global export requests (from the Create modal's Design tab or ShareReady sticker).
  useEffect(() => {
    if (!listenForExportEvents) return;
    const handleExport = async (event: Event) => {
      const handledEvent = event as Event & { _handled?: boolean };
      if (handledEvent.defaultPrevented || handledEvent._handled) return;
      handledEvent._handled = true;
      handledEvent.preventDefault();

      const detail = (event as CustomEvent<{
        format?: string;
        size?: 1000 | 2000 | 3000;
        frameOverride?: { enabled: boolean; caption: string } | null;
      }>).detail;
      const format = detail?.format ?? "png";
      const exportSize = detail?.size ?? 1000;
      const effectiveFrame = detail?.frameOverride ?? frameConfig?.value;

      try {
        if (format === "svg") {
          await downloadSvg({ frame: effectiveFrame });
          haptics.success();
          addToast("SVG download started! 📐");
        } else {
          await downloadPng({ size: exportSize, frame: effectiveFrame });
          haptics.success();
          addToast("PNG download started! 🖼️");
        }
      } catch (err) {
        console.error(`Failed to start ${format.toUpperCase()} download:`, err);
        haptics.error();
        addToast(`Couldn't start ${format.toUpperCase()} download ❌`);
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
        data-dropzone="true"
        role="button"
        tabIndex={0}
        aria-label="Download QR code as PNG"
        class={`
          bg-white rounded-chunky border-4
          ${showSuccessFlash ? "border-green-500" : "border-black"}
          shadow-chunky-hover cursor-pointer
          transition-all duration-300
          relative aspect-square
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
      >
        {
          /* SSR'd first-paint QR (the default render, pre-baked) — the live
          canvas is appended underneath and this lifts once it has painted */
        }
        {!qrReady && !url.value && (
          <img
            src="/qr-default.png"
            alt=""
            width={720}
            height={720}
            class="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
          />
        )}
      </div>
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
          on the first character. The save pill is ALWAYS present and is a REAL
          button (regular users don't click posters) — always a SOLID cream
          surface (a translucent pill over the QR read as mush), popping in
          with a bounce when real content lands. When a frame caption strip is
          active, dock the Save pill cleanly below the frame so it never covers
          the caption text. */
      }
      {frameConfig?.value?.enabled && frameConfig.value.caption.trim() !== ""
        ? (
          <div class="mt-3 flex justify-end">
            <button
              type="button"
              key={url.value ? "chip-live-framed" : "chip-idle-framed"}
              onClick={handleDownloadClick}
              class={`min-h-[44px] px-4 rounded-full bg-qr-cream border-3 border-black shadow-chunky inline-flex items-center justify-center gap-1 text-sm font-black text-black z-10 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                url.value ? "animate-bounce-in" : ""
              }`}
              aria-label="Download QR code as PNG"
            >
              ↓ Save PNG
            </button>
          </div>
        )
        : (
          <button
            type="button"
            key={url.value ? "chip-live" : "chip-idle"}
            onClick={handleDownloadClick}
            class={`absolute -bottom-4 -right-3 min-h-[44px] px-4 rounded-full bg-qr-cream border-3 border-black shadow-chunky flex items-center justify-center gap-1 text-sm font-black text-black z-10 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              url.value ? "animate-bounce-in" : ""
            }`}
            aria-label="Download QR code as PNG"
          >
            ↓ Save PNG
          </button>
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

      {/* Scannability warning — only appears when a real decoder failed */}
      {scanWarning && (
        <div
          class="absolute -bottom-3 -left-3 bg-gradient-to-r from-amber-400 to-orange-400 text-black px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-bounce-in z-10 pointer-events-none select-none"
          title="A scanner may struggle with this combo — try darker colors or a shorter link"
        >
          ⚠️ hard to scan
        </div>
      )}
    </div>
  );
}

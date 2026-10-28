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
import { buildQrSvgString, toSvgDataUrl } from "../utils/qr-vector-svg.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

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
  lang?: Locale;
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
    lang,
  }: QRCanvasProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
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
  const stylePopTimerRef = useRef<number | null>(null);
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

  // Coarse Umami event tracking lives inside QRCanvas instead of a dedicated
  // `islands/Analytics.tsx` island so Fresh never emits an `island-analytics.js`
  // bundle (which EasyPrivacy / iOS content blockers block, aborting the
  // top-level ES module hydration graph on mobile Safari).
  useEffect(() => {
    if (!listenForExportEvents || !url.value) return;
    const timeoutId = setTimeout(() => {
      // deno-lint-ignore no-explicit-any
      const win = globalThis as any;
      if (win.umami?.track) {
        let qrType = "url";
        if (url.value.startsWith("WIFI:")) qrType = "wifi";
        else if (url.value.startsWith("BEGIN:VCARD")) qrType = "vcard";
        else if (url.value.startsWith("SMSTO:")) qrType = "sms";
        else if (url.value.startsWith("mailto:")) qrType = "email";
        else if (url.value.startsWith("http")) qrType = "url";
        else qrType = "text";

        win.umami.track("qr_generated", {
          style: style.value,
          type: qrType,
          has_logo: Boolean(logoUrl?.value),
          is_dynamic: Boolean(isDynamic?.value),
          is_destructible: Boolean(isDestructible?.value),
        });
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [url.value, listenForExportEvents]);

  useEffect(() => {
    const onBloom = () => {
      if (stylePopTimerRef.current !== null) {
        clearTimeout(stylePopTimerRef.current);
      }
      setStylePop(true);
      stylePopTimerRef.current = setTimeout(() => {
        setStylePop(false);
        stylePopTimerRef.current = null;
      }, 380) as unknown as number;
    };
    globalThis.addEventListener("qrb-modal-bloom", onBloom);
    return () => {
      globalThis.removeEventListener("qrb-modal-bloom", onBloom);
      if (stylePopTimerRef.current !== null) {
        clearTimeout(stylePopTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const styleChanged = prevStyleRef.current !== style.value;
    const customChanged = prevCustomRef.current !== customStyle?.value;
    if (!styleChanged && !customChanged) return;
    prevStyleRef.current = style.value;
    prevCustomRef.current = customStyle?.value;
    if (stylePopTimerRef.current !== null) {
      clearTimeout(stylePopTimerRef.current);
    }
    setStylePop(true);
    stylePopTimerRef.current = setTimeout(() => {
      setStylePop(false);
      stylePopTimerRef.current = null;
    }, 380) as unknown as number;
    return () => {
      if (stylePopTimerRef.current !== null) {
        clearTimeout(stylePopTimerRef.current);
      }
    };
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
  const getCurrentStyle = (): QRStyle => {
    if (style.value === "custom" && customStyle?.value) {
      return customStyle.value;
    }
    const base = (QR_STYLES[style.value as keyof typeof QR_STYLES] ??
      QR_STYLES.sunset) as QRStyle;
    const overrides = customStyle?.value;
    if (!overrides) return base;
    return {
      ...base,
      dots: {
        ...base.dots,
        ...(overrides.dots?.shape ? { shape: overrides.dots.shape } : {}),
      },
      cornersSquare: base.cornersSquare
        ? {
          ...base.cornersSquare,
          ...(overrides.cornersSquare?.shape
            ? { shape: overrides.cornersSquare.shape }
            : {}),
        }
        : overrides.cornersSquare,
      cornersDot: base.cornersDot
        ? {
          ...base.cornersDot,
          ...(overrides.cornersDot?.shape
            ? { shape: overrides.cornersDot.shape }
            : {}),
        }
        : overrides.cornersDot,
    };
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

  const handleSvgDownloadClick = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!qrCodeRef.current) return;

    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);

    try {
      await downloadSvg();
      haptics.success();
      addToast(
        isSpanish
          ? "¡Descarga SVG vectorial iniciada! 📐"
          : "Vector SVG download started! 📐",
      );
      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 600);
    } catch (err) {
      console.error("Failed to start SVG download:", err);
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo descargar el SVG ❌"
          : "Couldn't start SVG download ❌",
      );
    }
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
      addToast(
        isSpanish ? "¡Descarga PNG iniciada! 🖼️" : "PNG download started! 🖼️",
      );
      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 600);
    } catch (err) {
      console.error("Failed to start PNG download:", err);
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo descargar el PNG ❌"
          : "Couldn't start PNG download ❌",
      );
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

  // Derive the ambient radial aura from the ACTIVE style's dot colors so the
  // QR card projects a soft TalkType-style glow onto the warm cream canvas.
  const getGlowGradient = (): string => {
    const s = getCurrentStyle();
    const dots = s?.dots as
      | { color?: string; gradient?: { colorStops?: { color: string }[] } }
      | undefined;
    const stops = dots?.gradient?.colorStops?.map((cs) => cs.color);
    if (stops && stops.length >= 2) {
      return `radial-gradient(circle at 50% 50%, ${stops[0]} 0%, ${
        stops[1]
      } 48%, transparent 76%)`;
    }
    if (dots?.color) {
      return `radial-gradient(circle at 50% 50%, ${dots.color} 0%, transparent 74%)`;
    }
    return "radial-gradient(circle at 50% 50%, #F97316 0%, #FF69B4 48%, transparent 76%)";
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const qrCode = new QRCodeStyling(getQrOptions(1000));

    // Remove any stale canvas/svg but keep the SSR placeholder <img> (it's Preact's
    // to remove, via qrReady) — it covers the canvas until drawing settles.
    canvasRef.current.querySelectorAll("canvas, svg").forEach((n) =>
      n.remove()
    );
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
    // Verify the <canvas> has actually mounted and sized before lifting the
    // SSR vector preview, so no route ever flashes an empty white card.
    const markReadyIfPainted = () => {
      const c = canvasRef.current?.querySelector("canvas");
      if (c && c.width > 0) {
        setQrReady(true);
        return true;
      }
      return false;
    };
    const readyTimer = setTimeout(() => {
      if (!markReadyIfPainted()) {
        setTimeout(() => markReadyIfPainted(), 350);
      }
    }, 220);
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
        addToast(
          isSpanish ? "¡Descarga PNG iniciada! 🖼️" : "PNG download started! 🖼️",
        );
      }).catch((err) => {
        console.error("Failed to start PNG download:", err);
        haptics.error();
        addToast(
          isSpanish
            ? "No se pudo descargar el PNG ❌"
            : "Couldn't start PNG download ❌",
        );
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
          addToast(
            isSpanish
              ? "¡Descarga SVG iniciada! 📐"
              : "SVG download started! 📐",
          );
        } else {
          await downloadPng({ size: exportSize, frame: effectiveFrame });
          haptics.success();
          addToast(
            isSpanish
              ? "¡Descarga PNG iniciada! 🖼️"
              : "PNG download started! 🖼️",
          );
        }
      } catch (err) {
        console.error(`Failed to start ${format.toUpperCase()} download:`, err);
        haptics.error();
        addToast(
          isSpanish
            ? `No se pudo descargar el ${format.toUpperCase()} ❌`
            : `Couldn't start ${format.toUpperCase()} download ❌`,
        );
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
        aria-label={isSpanish
          ? "Descargar código QR como PNG"
          : "Download QR code as PNG"}
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
        title={isSpanish ? "Clic para descargar" : "Click to download"}
      >
        {
          /* SSR'd first-paint QR — uses /qr-default.png on the blank home sunset
          state, and a live inline vector SVG on pre-populated vertical/tool
          studios (/for/*, /vs/*, /compare) so no route ever renders an empty
          white square before hydration or when scripts are delayed. */
        }
        {!qrReady && (
          <img
            src={!url.value && style.value === "sunset"
              ? "/qr-default.png"
              : toSvgDataUrl(
                buildQrSvgString({
                  data: url.value || "https://qrbuddy.app",
                  palette: style.value === "custom" ? "sunset" : style.value,
                  dotShape: getCurrentStyle().dots?.shape,
                  cornerSquareShape: getCurrentStyle().cornersSquare?.shape as
                    | "dot"
                    | "square"
                    | "extra-rounded"
                    | undefined,
                }),
              )}
            alt={isSpanish ? "Vista previa del código QR" : "QR code preview"}
            width={720}
            height={720}
            class="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
          />
        )}
      </div>
      <div
        class="absolute -z-10 -inset-6 opacity-25 blur-2xl rounded-full pointer-events-none transition-all duration-500"
        style={{ background: getGlowGradient() }}
      />

      {/* Frame caption preview — the downloaded PNG bakes this in */}
      {frameConfig?.value?.enabled && frameConfig.value.caption.trim() !== "" &&
        (
          <div class="bg-[#fffef7] border-4 border-t-0 border-[#1e1714] rounded-b-chunky -mt-3 pt-3 pb-7 text-center animate-slide-down">
            <span class="font-chunky font-black text-xl sm:text-2xl tracking-wide text-[#1e1714] uppercase">
              {frameConfig.value.caption}
            </span>
          </div>
        )}

      {/* Signature TalkType Gold Save Pill — immediately visible against the white QR card */}
      <div
        key={url.value ? "chip-live" : "chip-idle"}
        class={`absolute ${
          frameConfig?.value?.enabled && frameConfig.value.caption.trim() !== ""
            ? "-bottom-5"
            : "-bottom-4"
        } -right-3 min-h-[44px] p-0.5 rounded-full bg-[#F6B93B] border-3 border-[#1e1714] shadow-chunky inline-flex items-center z-10 ${
          url.value ? "animate-bounce-in" : ""
        }`}
      >
        <button
          type="button"
          onClick={handleDownloadClick}
          class="min-h-[38px] pl-3.5 pr-2.5 rounded-l-full flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-[#1e1714] transition-all hover:bg-[#fffef7]/40 active:scale-95"
          aria-label={isSpanish
            ? "Descargar código QR como PNG"
            : "Download QR code as PNG"}
        >
          {isSpanish ? "↓ Guardar PNG" : "↓ Save PNG"}
        </button>
        <span class="w-[2px] h-5 bg-[#1e1714]/25" aria-hidden="true" />
        <button
          type="button"
          onClick={handleSvgDownloadClick}
          class="min-h-[38px] pl-2.5 pr-3.5 rounded-r-full flex items-center justify-center text-xs font-black text-[#1e1714] transition-all hover:bg-[#fffef7]/40 active:scale-95"
          aria-label={isSpanish
            ? "Descargar código QR como SVG vectorial"
            : "Download QR code as vector SVG"}
          title={isSpanish
            ? "Descargar SVG vectorial para imprenta"
            : "Download print-ready vector SVG"}
        >
          SVG
        </button>
      </div>

      {/* Destructible badge */}
      {isDestructible?.value && (
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float will-change-transform z-10 pointer-events-none select-none">
          💣 {maxDownloads?.value === UNLIMITED_SCANS
            ? "∞"
            : maxDownloads?.value || 1} {isSpanish
            ? (maxDownloads?.value === 1 ? "escaneo" : "escaneos")
            : (maxDownloads?.value === 1 ? "scan" : "scans")}
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
          title={isSpanish
            ? "Puede costar trabajo escanear esta combinación — prueba colores más oscuros o un link más corto"
            : "A scanner may struggle with this combo — try darker colors or a shorter link"}
        >
          {isSpanish ? "⚠️ difícil de escanear" : "⚠️ hard to scan"}
        </div>
      )}
    </div>
  );
}

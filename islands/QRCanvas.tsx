import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import QRRenderer, { styledQrSvg } from "../utils/qr-renderer.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { addToast } from "./ToastManager.tsx";
import type { BannerTheme, FrameConfig, QRStyle } from "../types/qr-types.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import {
  addToHistory,
  getHistory,
  summarizeQrPayload,
} from "../utils/history.ts";
import { haptics } from "../utils/haptics.ts";
import { checkQRScannability } from "../utils/qr-decode.ts";
import {
  buildQrFilename,
  createFramedSvg,
  measureCaptionWidth,
} from "../utils/svg-export.ts";
import { buildQrSvgString, toSvgDataUrl } from "../utils/qr-vector-svg.ts";
import { bannerColors } from "../utils/qr-design.ts";
import { getQRThemeTokens } from "../utils/qr-styles.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

export { buildQrFilename };

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
  frameConfig?: Signal<FrameConfig | null>;
  /** Target PNG export resolution (1000 / 2000 / 3000px). */
  pngSize?: Signal<1000 | 2000 | 3000> | 1000 | 2000 | 3000;
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
    pngSize,
    listenForExportEvents = false,
    lang,
  }: QRCanvasProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const resolvedPngSize: 1000 | 2000 | 3000 = typeof pngSize === "number"
    ? pngSize
    : (pngSize?.value ?? 1000);
  const pngSizeRef = useRef<1000 | 2000 | 3000>(resolvedPngSize);
  pngSizeRef.current = resolvedPngSize;
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRRenderer | null>(null);
  // The init effect already renders with the current signal values, so the
  // update effect must skip its OWN first (mount) run to avoid a double render.
  const updateEffectRan = useRef(false);
  const [isDragHover, setIsDragHover] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  // The re-encode pulse: every time the matrix changes (data, palette, mode)
  // the card dips to 0.985 and springs back, so the update is felt, not read.
  const [pulse, setPulse] = useState(false);
  const pulseArmed = useRef(false);
  // "Copied PNG" pill after a tap on the matrix itself.
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const [stylePop, setStylePop] = useState(false);
  const stylePopTimerRef = useRef<number | null>(null);
  // Decode-check verdict for the current render: silence means scannable.
  const [scanWarning, setScanWarning] = useState(false);
  const scanCheckToken = useRef(0);
  // True once the client-drawn canvas has painted; until then the SSR'd
  // default-QR image (static/qr-default.png) covers the card so the page
  // arrives in one piece instead of text-first, QR-later.
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    // Skip the mount render; pulse only on real changes.
    if (!pulseArmed.current) {
      pulseArmed.current = true;
      return;
    }
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 140);
    return () => clearTimeout(t);
  }, [url.value, style.value, customStyle?.value, isDynamic?.value]);

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
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

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
    return resolveQRStyle(style.value, customStyle?.value);
  };

  const getQrOptions = (renderSize: number) => {
    const currentStyle = getCurrentStyle();

    return {
      size: renderSize,
      data: url.value || "https://qrbuddy.app",
      style: currentStyle,
      logoUrl: logoUrl?.value,
    };
  };

  // Composite the QR onto a chunky-bordered card with a caption strip —
  // the "SCAN ME" table-tent look, baked into a PNG Blob for download or clipboard.
  // Proportional scaling ensures 1000, 2000, or 3000px longest edge.
  const composeFramedPngBlob = async ({
    caption,
    theme,
    targetSize = 1000,
  }: {
    caption: string;
    theme?: BannerTheme;
    targetSize?: 1000 | 2000 | 3000;
  }): Promise<Blob> => {
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
    const exportQr = new QRRenderer(qrOptions);
    const raw = await exportQr.getRawData("png");
    if (!raw) throw new Error("QR image could not be created");
    const img = await createImageBitmap(raw as Blob);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");

    // Cream card with a fat black border, soft-brutal style.
    ctx.fillStyle = "#FFFEF7";
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
    ctx.strokeStyle = "#1e1714";
    ctx.stroke();

    // One pass: label banner on top, matrix below, single border.
    if (hasCaption) {
      const banner = bannerColors(
        theme,
        getQRThemeTokens(style.value, customStyle?.value).accent,
      );
      ctx.fillStyle = banner.bg;
      ctx.beginPath();
      ctx.roundRect(
        border / 2,
        border / 2,
        canvas.width - border,
        pad + capH - border / 2,
        [r, r, 0, 0],
      );
      ctx.fill();
    }

    ctx.drawImage(img, pad, pad + capH, qrSize, qrSize);

    if (hasCaption) {
      const banner = bannerColors(
        theme,
        getQRThemeTokens(style.value, customStyle?.value).accent,
      );
      const divider = Math.max(4, Math.round(8 * scale));
      ctx.fillStyle = "#1e1714";
      ctx.fillRect(
        border / 2,
        pad + capH - divider,
        canvas.width - border,
        divider,
      );
      ctx.fillStyle = banner.ink;
      ctx.font =
        `900 ${fontSize}px 'Inter Black', Inter, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        captionText,
        canvas.width / 2,
        pad + capH / 2 + Math.round(6 * scale),
        maxTextWidth,
      );
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("Framed PNG could not be created");
    return blob;
  };

  const downloadFramedPng = async ({
    caption,
    theme,
    targetSize = pngSizeRef.current,
  }: {
    caption: string;
    theme?: BannerTheme;
    targetSize?: 1000 | 2000 | 3000;
  }) => {
    const blob = await composeFramedPngBlob({ caption, theme, targetSize });
    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = buildQrFilename(
      url.value || "https://qrbuddy.app",
      style.value,
      caption,
      "png",
    );
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  // Save to history (Time Machine) on PNG download, SVG download, and clipboard copy.
  const recordQrHistory = () => {
    const content = url.value.trim();
    if (!content) return;
    try {
      const existing = getHistory().find((item) => item.content === content);
      if (
        existing &&
        (existing.type === "dynamic" || existing.type === "media" ||
          existing.type === "file")
      ) {
        addToHistory({
          type: existing.type,
          content: existing.content,
          metadata: existing.metadata,
        });
        return;
      }
      const summary = summarizeQrPayload(content);
      addToHistory({
        type: isDynamic?.value ? "dynamic" : summary.type,
        content,
        metadata: {
          title: summary.title,
          subtitle: summary.subtitle,
        },
      });
    } catch (err) {
      console.error("Failed to save QR to history:", err);
    }
  };

  const downloadPng = async ({
    size,
    frame,
  }: {
    size?: 1000 | 2000 | 3000;
    frame?: FrameConfig | null;
  } = {}) => {
    const exportSize = size ?? pngSizeRef.current;
    const isFramed = frame !== undefined
      ? (frame?.enabled ?? false)
      : (frameConfig?.value?.enabled ?? false);
    const effectiveCaption = frame !== undefined
      ? (frame?.caption ?? "")
      : (frameConfig?.value?.caption ?? "");

    if (isFramed) {
      await downloadFramedPng({
        caption: effectiveCaption,
        theme: frame !== undefined ? frame?.theme : frameConfig?.value?.theme,
        targetSize: exportSize,
      });
      return;
    }

    const qrOptions = getQrOptions(exportSize);
    const exportQr = new QRRenderer(qrOptions);
    const raw = await exportQr.getRawData("png");
    if (!raw) throw new Error("QR image could not be created");

    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(raw as Blob);
    a.href = objectUrl;
    a.download = buildQrFilename(
      url.value || "https://qrbuddy.app",
      style.value,
      undefined,
      "png",
    );
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const downloadSvg = async ({
    frame,
  }: {
    frame?: FrameConfig | null;
  } = {}) => {
    const isFramed = frame !== undefined
      ? (frame?.enabled ?? false)
      : (frameConfig?.value?.enabled ?? false);
    const effectiveCaption = frame !== undefined
      ? (frame?.caption ?? "")
      : (frameConfig?.value?.caption ?? "");
    const effectiveTheme = frame !== undefined
      ? frame?.theme
      : frameConfig?.value?.theme;

    const qrOptions = getQrOptions(1000);
    const exportQr = new QRRenderer(qrOptions);
    const raw = await exportQr.getRawData("svg");
    if (!raw) throw new Error("SVG raw data could not be generated");
    const rawText = await (raw as Blob).text();

    let finalSvgText = rawText;
    if (isFramed) {
      // The helper normalizes the caption before measuring the text it exports.
      finalSvgText = createFramedSvg(rawText, effectiveCaption, {
        banner: bannerColors(
          effectiveTheme,
          getQRThemeTokens(style.value, customStyle?.value).accent,
        ),
      });
    }
    const fileName = buildQrFilename(
      url.value || "https://qrbuddy.app",
      style.value,
      isFramed ? effectiveCaption : undefined,
      "svg",
    );

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
      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 600);
    } catch (err) {
      console.error("Failed to start SVG download:", err);
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo descargar el SVG"
          : "Couldn't start SVG download",
      );
      return;
    }

    recordQrHistory();
  };

  // Tap the matrix itself: the PNG lands on the clipboard. Browsers without
  // image clipboard support (Firefox) fall through to the download.
  const handleCanvasTap = async () => {
    if (!qrCodeRef.current) return;
    const canWriteImage = typeof ClipboardItem !== "undefined" &&
      typeof navigator.clipboard?.write === "function";
    if (!canWriteImage) {
      await handleDownloadClick();
      return;
    }
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);
    try {
      const activeFrame = frameConfig?.value;
      let pngBlob: Blob;
      if (activeFrame?.enabled) {
        pngBlob = await composeFramedPngBlob({
          caption: activeFrame.caption,
          theme: activeFrame.theme,
          targetSize: pngSizeRef.current,
        });
      } else {
        const exportQr = new QRRenderer(getQrOptions(pngSizeRef.current));
        const raw = await exportQr.getRawData("png");
        if (!raw) throw new Error("QR image could not be created");
        pngBlob = raw as Blob;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      haptics.success();
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1200) as unknown as number;
    } catch (err) {
      console.error("Failed to copy PNG:", err);
      haptics.error();
      addToast(
        isSpanish ? "No se pudo copiar el PNG" : "Couldn't copy the PNG",
      );
      return;
    }

    recordQrHistory();
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
      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 600);
    } catch (err) {
      console.error("Failed to start PNG download:", err);
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo descargar el PNG"
          : "Couldn't start PNG download",
      );
      return;
    }

    recordQrHistory();
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

    const qrCode = new QRRenderer(
      getQrOptions(1000),
      () => setQrReady(true),
    );

    // Remove any stale canvas/svg but keep the SSR placeholder <img> (it's Preact's
    // to remove, via qrReady) — it covers the canvas until drawing settles.
    canvasRef.current.querySelectorAll("canvas, svg").forEach((n) =>
      n.remove()
    );
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
    return () => qrCode.dispose();
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
      }).catch((err) => {
        console.error("Failed to start PNG download:", err);
        haptics.error();
        addToast(
          isSpanish
            ? "No se pudo descargar el PNG"
            : "Couldn't start PNG download",
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
      const exportSize = detail?.size ?? pngSizeRef.current;
      const effectiveFrame = detail?.frameOverride ?? frameConfig?.value;

      try {
        if (format === "svg") {
          await downloadSvg({ frame: effectiveFrame });
          haptics.success();
          addToast(
            isSpanish ? "Descarga SVG iniciada" : "SVG download started",
          );
        } else {
          await downloadPng({ size: exportSize, frame: effectiveFrame });
          haptics.success();
          addToast(
            isSpanish ? "Descarga PNG iniciada" : "PNG download started",
          );
        }
      } catch (err) {
        console.error(`Failed to start ${format.toUpperCase()} download:`, err);
        haptics.error();
        addToast(
          isSpanish
            ? `No se pudo descargar el ${format.toUpperCase()}`
            : `Couldn't start ${format.toUpperCase()} download`,
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

  const hasCaption = Boolean(
    frameConfig?.value?.enabled &&
      frameConfig.value.caption.trim() !== "",
  );
  const captionText = frameConfig?.value?.caption.trim() ?? "";
  const banner = bannerColors(
    frameConfig?.value?.theme,
    getQRThemeTokens(style.value, customStyle?.value).accent,
  );

  const centerMarkOmitted = (() => {
    if (!logoUrl?.value) return false;
    try {
      return styledQrSvg(getQrOptions(1000)).includes('data-cutout="none"');
    } catch {
      return false;
    }
  })();

  return (
    <div class={`max-w-full w-full ${stylePop ? "animate-pop-in" : ""}`}>
      <div class="relative w-full">
        {hasCaption && (
          <button
            type="button"
            data-edit-label
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              globalThis.dispatchEvent(new CustomEvent("qr-edit-label"));
              haptics.light();
            }}
            style={{
              background: banner.bg,
              color: banner.ink,
              borderBottomColor: "#1e1714",
            }}
            class="block w-full border-4 border-b-2 border-[#1e1714] rounded-t-chunky px-4 py-3 text-center transition-colors"
            title={isSpanish ? "Editar la etiqueta" : "Edit the label"}
            aria-label={isSpanish
              ? `Editar etiqueta: ${captionText}`
              : `Edit label: ${captionText}`}
          >
            <span class="block font-chunky font-black text-xl sm:text-2xl tracking-[0.1em] uppercase truncate">
              {captionText}
            </span>
          </button>
        )}
        <div
          ref={canvasRef}
          onClick={handleCanvasTap}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void handleCanvasTap();
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
            ? "Copiar código QR como PNG"
            : "Copy QR code as PNG"}
          class={`
          bg-[#fffef7] rounded-chunky border-4
          ${hasCaption ? "border-t-0 rounded-t-none" : ""}
          ${
            showSuccessFlash
              ? "border-[var(--qr-theme-accent,#ec4899)]"
              : "border-[#1e1714]"
          }
          shadow-chunky-hover cursor-pointer
          ${
            pulse
              ? "transition-transform duration-[140ms] ease-out"
              : "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          }
          relative aspect-square
          w-full flex justify-center items-center
          [&>canvas]:w-full [&>canvas]:h-auto
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--qr-theme-accent,#ec4899)]
          ${
            isClicking || pulse
              ? "scale-[0.985]"
              : !url.value
              ? "scale-[0.97]"
              : hasCaption
              ? ""
              : "hover:scale-[1.03]"
          }
          ${
            isDragHover
              ? "ring-8 ring-[var(--qr-theme-accent,#ec4899)] ring-opacity-60 animate-pulse"
              : ""
          }
        `}
          title={isSpanish ? "Tocar para copiar el PNG" : "Tap to copy the PNG"}
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
          {copied && (
            <div
              class="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-live="polite"
            >
              <span class="px-4 py-2 rounded-full bg-[#fffef7] border-2 border-[#1e1714] shadow-[0_2px_0_#1e1714] text-sm font-black text-[#1e1714] animate-pop-in">
                {isSpanish ? "PNG copiado" : "Copied PNG"}
              </span>
            </div>
          )}
        </div>
        <div
          class="absolute -z-10 -inset-6 opacity-25 blur-2xl rounded-full pointer-events-none transition-all duration-500"
          style={{ background: getGlowGradient() }}
        />

        {/* Save pill — the payoff, in one saturated gold that pops on every palette */}
        <div
          key={url.value ? "chip-live" : "chip-idle"}
          class={`absolute -bottom-3 -right-3 min-h-[40px] rounded-full bg-[#ffbe0b] border-2 border-[#1e1714] shadow-[0_2px_0_#1e1714] inline-flex items-stretch overflow-hidden z-10 ${
            url.value ? "animate-bounce-in" : ""
          }`}
        >
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              void handleDownloadClick();
            }}
            class="min-h-[36px] pl-3.5 pr-2.5 flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-[#1e1714] transition-[background-color,transform] duration-[70ms] hover:bg-[#ffd04a] active:bg-[#f2ac00] active:translate-y-[1.5px]"
            aria-label={isSpanish
              ? "Descargar código QR como PNG"
              : "Download QR code as PNG"}
          >
            {isSpanish ? "↓ Guardar PNG" : "↓ Save PNG"}
          </button>
          <span class="w-[2px] self-stretch bg-[#1e1714]" aria-hidden="true" />
          <button
            type="button"
            onClick={handleSvgDownloadClick}
            class="min-h-[36px] pl-2.5 pr-3.5 flex items-center justify-center text-xs font-black text-[#1e1714] transition-[background-color,transform] duration-[70ms] hover:bg-[#ffd04a] active:bg-[#f2ac00] active:translate-y-[1.5px]"
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
          <div class="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float will-change-transform z-10 pointer-events-none select-none">
            💣 {maxDownloads?.value === UNLIMITED_SCANS
              ? "∞"
              : maxDownloads?.value || 1} {isSpanish
              ? (maxDownloads?.value === 1 ? "escaneo" : "escaneos")
              : (maxDownloads?.value === 1 ? "scan" : "scans")}
          </div>
        )}

        {/* Editable mode tag — the artifact itself shows the mode changed */}
        {isDynamic?.value && !isDestructible?.value && (
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              globalThis.dispatchEvent(new CustomEvent("qrb-open-behavior"));
              haptics.light();
            }}
            class="absolute -top-3 -right-3 inline-flex items-center gap-1.5 bg-[var(--qr-theme-accent,#ec4899)] text-[#fffef7] px-3 py-1 rounded-full border-2 border-[#1e1714] shadow-[0_2px_0_#1e1714] text-xs font-black animate-pop-in z-10 transition-transform hover:-translate-y-px active:translate-y-[1px] cursor-pointer"
            aria-label={isSpanish
              ? "Editable: abrir ajustes de comportamiento"
              : "Editable: open behavior settings"}
            title={isSpanish
              ? "Cambiar link editable"
              : "Change the editable link"}
          >
            <span
              aria-hidden="true"
              class="w-2 h-2 rounded-full bg-[#fffef7] animate-pulse"
            />
            editable
          </button>
        )}

        {/* Scannability warning — only appears when a real decoder failed */}
        {scanWarning && (
          <div
            class="absolute -bottom-3 -left-3 bg-gradient-to-r from-amber-400 to-orange-400 text-black px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-bounce-in z-10 pointer-events-none select-none"
            title={isSpanish
              ? "Puede costar trabajo escanear esta combinación — prueba colores más oscuros o un link más corto"
              : "A scanner may struggle with this combo — try darker colors or a shorter link"}
          >
            {isSpanish
              ? "Mejor con más contraste"
              : "Better with more contrast"}
          </div>
        )}
      </div>
      {centerMarkOmitted && (
        <p
          role="status"
          aria-live="polite"
          data-cutout-notice
          class="mt-5 px-3 py-1.5 rounded-xl bg-amber-50 border-[1.5px] border-amber-400 text-amber-900 text-xs font-bold text-center"
        >
          {isSpanish
            ? "Código denso — marca central omitida para asegurar lectura"
            : "Dense code — center mark omitted for scan reliability"}
        </p>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { addToast } from "./ToastManager.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { addToHistory } from "../utils/history.ts";

interface QRCanvasProps {
  url: Signal<string>;
  style: Signal<keyof typeof QR_STYLES | "custom">;
  customStyle?: Signal<QRStyle | null>;
  triggerDownload: Signal<boolean>;
  isDestructible?: Signal<boolean>;
  isDynamic?: Signal<boolean>;
  logoUrl?: Signal<string>;
  maxDownloads?: Signal<number>;
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
  }: QRCanvasProps,
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [isDragHover, setIsDragHover] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

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

  const handleDownloadClick = async () => {
    if (!qrCodeRef.current) return;

    // Squish animation on click
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 150);

    // Trigger download
    qrCodeRef.current.download({
      name: `qrbuddy-${style.value}-${Date.now()}`,
      extension: "png",
    });

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

    // Show success flash
    setShowSuccessFlash(true);
    setTimeout(() => setShowSuccessFlash(false), 600);
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
        errorCorrectionLevel: "Q",
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

    const currentStyle = getCurrentStyle();

    qrCodeRef.current.update({
      data: url.value || "https://qrbuddy.app",
      image: logoUrl?.value || undefined,
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

  // ... (lines 143-233 omitted)

  return (
    <div class="relative max-w-full w-full">
      <div
        ref={canvasRef}
        onClick={handleDownloadClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        class={`
          bg-white rounded-chunky border-4
          ${showSuccessFlash ? "border-green-500" : "border-black"}
          shadow-chunky-hover cursor-pointer
          transition-all duration-200
          w-full flex justify-center items-center
          [&>canvas]:w-full [&>canvas]:h-auto
          ${isClicking ? "scale-95" : "hover:scale-105"}
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
      <div class="absolute -z-10 inset-0 bg-gradient-to-br from-qr-sunset1 via-qr-sunset2 to-qr-sunset3 opacity-20 blur-xl rounded-chunky" />

      {/* Destructible badge */}
      {isDestructible?.value && (
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float z-10">
          💣 {maxDownloads?.value === UNLIMITED_SCANS
            ? "∞"
            : maxDownloads?.value || 1}{" "}
          {maxDownloads?.value === 1 ? "scan" : "scans"}
        </div>
      )}

      {/* Dynamic QR badge */}
      {isDynamic?.value && !isDestructible?.value && (
        <div class="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full border-2 border-black shadow-lg text-sm font-bold animate-float z-10">
          🔗 editable
        </div>
      )}
    </div>
  );
}

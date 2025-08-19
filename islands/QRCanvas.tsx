import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";

interface QRCanvasProps {
  url: Signal<string>;
  style: Signal<keyof typeof QR_STYLES>;
  triggerDownload: Signal<boolean>;
  triggerCopy?: Signal<boolean>;
}

export default function QRCanvas(
  { url, style, triggerDownload, triggerCopy }: QRCanvasProps,
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleCopyToClipboard = async () => {
    if (!qrCodeRef.current) return;

    try {
      const blob = await qrCodeRef.current.getRawData("png");
      if (!blob) return;

      // Convert blob to clipboard item
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);

      // Show toast notification
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Failed to copy QR code:", err);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const currentStyle = QR_STYLES[style.value];

    const qrCode = new QRCodeStyling({
      width: 400,
      height: 400,
      data: url.value || "https://qrbuddy.app",
      margin: 20,
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

    const currentStyle = QR_STYLES[style.value];

    qrCodeRef.current.update({
      data: url.value || "https://qrbuddy.app",
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
  }, [url.value, style.value]);

  useEffect(() => {
    if (triggerDownload.value && qrCodeRef.current) {
      qrCodeRef.current.download({
        name: `qrbuddy-${style.value}-${Date.now()}`,
        extension: "png",
      });
      triggerDownload.value = false;
    }
  }, [triggerDownload.value]);

  useEffect(() => {
    if (triggerCopy && triggerCopy.value) {
      handleCopyToClipboard();
      triggerCopy.value = false;
    }
  }, [triggerCopy?.value]);

  return (
    <div class="relative">
      <div
        ref={canvasRef}
        onClick={handleCopyToClipboard}
        class="bg-white rounded-chunky border-4 border-black shadow-chunky-hover cursor-pointer hover:scale-[1.02] transition-transform duration-200"
        title="Click to copy"
      />
      <div class="absolute -z-10 inset-0 bg-gradient-to-br from-qr-sunset1 via-qr-sunset2 to-qr-sunset3 opacity-20 blur-xl rounded-chunky" />
      
      {/* Toast notification */}
      {showToast && (
        <div class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-pop z-50">
          QR copied! ✨
        </div>
      )}
    </div>
  );
}

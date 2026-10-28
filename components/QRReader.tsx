import { type Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "../islands/ToastManager.tsx";
import {
  decodeQRFromFile,
  decodeQRFromImageData,
  detectWithNativeBarcodeDetector,
} from "../utils/qr-decode.ts";
import { useModalShell } from "./modal/useModalShell.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { parsePassportFromUrl } from "../utils/passport.ts";
import {
  getInAppBrowserName,
  getUnsupportedCameraMessage,
} from "../utils/inAppBrowser.ts";

interface QRReaderProps {
  isOpen: boolean;
  onClose: () => void;
  url: Signal<string>;
  /** Pre-decoded content (e.g. from a dropped image the input recognised). */
  initialResult?: string | null;
  lang?: Locale;
}

type DecodedType =
  | "url"
  | "wifi"
  | "vcard"
  | "sms"
  | "email"
  | "tel"
  | "text";

interface DecodedResult {
  data: string;
  type: DecodedType;
}

interface PeekResult {
  ok: boolean;
  url: string;
  finalUrl: string;
  domain: string;
  isRedirected: boolean;
  redirectChain?: string[];
  isHttps?: boolean;
  statusCode?: number;
  title: string;
  description: string;
  image: string | null;
  screenshotUrl?: string | null;
}

function formatHopLabel(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const shortPath = u.pathname && u.pathname !== "/"
      ? (u.pathname.length > 18 ? `${u.pathname.slice(0, 16)}…` : u.pathname)
      : "";
    return `${u.hostname}${shortPath}`;
  } catch {
    return rawUrl;
  }
}

const TYPE_META: Record<
  DecodedType,
  { icon: string; label: string; labelEs: string }
> = {
  url: { icon: "🔗", label: "Link", labelEs: "Enlace" },
  wifi: { icon: "📶", label: "WiFi network", labelEs: "Red Wi-Fi" },
  vcard: { icon: "👤", label: "Contact card", labelEs: "Tarjeta de Contacto" },
  sms: { icon: "💬", label: "Text message", labelEs: "Mensaje SMS" },
  email: { icon: "✉️", label: "Email", labelEs: "Correo" },
  tel: { icon: "📞", label: "Phone number", labelEs: "Teléfono" },
  text: { icon: "📝", label: "Plain text", labelEs: "Texto" },
};

function detectType(data: string): DecodedType {
  const trimmed = data.trim();
  if (/^https?:\/\//i.test(trimmed)) return "url";
  if (/^WIFI:/i.test(trimmed)) return "wifi";
  if (/^BEGIN:VCARD/i.test(trimmed)) return "vcard";
  if (/^(SMSTO:|sms:)/i.test(trimmed)) return "sms";
  if (/^(mailto:|MATMSG:)/i.test(trimmed)) return "email";
  if (/^tel:/i.test(trimmed)) return "tel";
  return "text";
}

// Only ever offer to open plain web links — never javascript:/data:/etc.
function safeOpenUrl(data: string): string | null {
  try {
    const parsed = new URL(data.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    // not a URL
  }
  return null;
}

function parseWifi(
  data: string,
  isSpanish: boolean,
): { label: string; value: string }[] {
  const get = (key: string) => {
    const match = data.match(new RegExp(`${key}:((?:\\\\.|[^\\\\;])*)`, "i"));
    return match ? match[1].replace(/\\(.)/g, "$1") : "";
  };
  const rows = [
    { label: isSpanish ? "Red" : "Network", value: get("S") },
    { label: isSpanish ? "Contraseña" : "Password", value: get("P") },
    {
      label: isSpanish ? "Seguridad" : "Security",
      value: get("T") || (isSpanish ? "Ninguna" : "None"),
    },
  ];
  return rows.filter((r) => r.value !== "");
}

function parseVCard(
  data: string,
  isSpanish: boolean,
): { label: string; value: string }[] {
  const line = (key: string) => {
    const match = data.match(new RegExp(`^${key}[^:]*:(.+)$`, "im"));
    return match ? match[1].trim() : "";
  };
  const rows = [
    { label: isSpanish ? "Nombre" : "Name", value: line("FN") },
    { label: isSpanish ? "Organización" : "Organisation", value: line("ORG") },
    { label: isSpanish ? "Teléfono" : "Phone", value: line("TEL") },
    { label: isSpanish ? "Correo" : "Email", value: line("EMAIL") },
    { label: isSpanish ? "Sitio web" : "Website", value: line("URL") },
  ];
  return rows.filter((r) => r.value !== "");
}

export default function QRReader(
  { isOpen, onClose, url: _url, initialResult, lang }: QRReaderProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [result, setResult] = useState<DecodedResult | null>(null);
  const [peekData, setPeekData] = useState<PeekResult | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const [previewStage, setPreviewStage] = useState<
    "og" | "screenshot" | "fallback"
  >("fallback");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [screenshotRetry, setScreenshotRetry] = useState(0);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const shell = useModalShell({ open: isOpen, onClose });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const cameraSessionRef = useRef(0);

  const stopCamera = () => {
    cameraSessionRef.current += 1;
    if (scanLoopRef.current !== null) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  // Adopt a pre-decoded payload (image dropped on the main input).
  useEffect(() => {
    if (isOpen && initialResult) {
      setResult({ data: initialResult, type: detectType(initialResult) });
    }
  }, [isOpen, initialResult]);

  // Safe peek inspection when a URL is decoded
  useEffect(() => {
    if (!result || result.type !== "url") {
      setPeekData(null);
      setIsPeeking(false);
      setPreviewStage("fallback");
      setPreviewLoaded(false);
      setScreenshotRetry(0);
      return;
    }

    const openable = safeOpenUrl(result.data);
    if (!openable) return;

    // Strip #hash fragments before network inspection so client secrets (e.g. #passport=...)
    // never leave the browser or touch /api/peek or external screenshot services.
    let peekTargetUrl = openable;
    try {
      const parsed = new URL(openable);
      if (parsed.hash.startsWith("#passport=")) {
        // In-app Passport pairing QR scan: apply sync directly in-browser without network calls
        if (typeof globalThis.location !== "undefined") {
          globalThis.location.hash = parsed.hash;
          const synced = parsePassportFromUrl();
          if (synced) {
            addToast(
              isSpanish
                ? "✨ ¡Pasaporte QRBuddy sincronizado!"
                : "✨ QRBuddy Passport synced!",
              3500,
            );
          }
        }
        setIsPeeking(false);
        return;
      }
      parsed.hash = "";
      peekTargetUrl = parsed.href;
    } catch {
      // Fallback to openable if URL constructor fails
    }

    let isMounted = true;
    setIsPeeking(true);
    setPeekData(null);
    setPreviewLoaded(false);
    setScreenshotRetry(0);

    fetch(`/api/peek?url=${encodeURIComponent(peekTargetUrl)}`)
      .then((res) => res.json())
      .then((data: PeekResult) => {
        if (isMounted && data.ok) {
          setPeekData(data);
          if (data.image) {
            setPreviewStage("og");
          } else if (data.screenshotUrl) {
            setPreviewStage("screenshot");
          } else {
            setPreviewStage("fallback");
          }
        }
      })
      .catch((err) => {
        console.warn("Peek inspection failed:", err);
      })
      .finally(() => {
        if (isMounted) setIsPeeking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [result]);

  // Automatic timeout fallback if the external screenshot service takes too long
  useEffect(() => {
    if (previewStage !== "screenshot" || previewLoaded) return;
    const timer = setTimeout(() => {
      if (screenshotRetry < 1) {
        setScreenshotRetry((r) => r + 1);
      } else {
        setPreviewStage("fallback");
      }
    }, 3200);
    return () => clearTimeout(timer);
  }, [previewStage, previewLoaded, screenshotRetry]);

  // Camera cleanup + paste-to-decode. Escape/scroll-lock/focus live in the
  // shared modal shell (useModalShell); only reader-specific behaviour stays.
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setResult(null);
      setPeekData(null);
      setIsPeeking(false);
      setDecodeError(null);
      setCameraError(null);
      return;
    }
    // Cmd/Ctrl+V a screenshot anywhere while the reader is open.
    const handlePaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void decodeFile(file);
      }
    };
    globalThis.addEventListener("paste", handlePaste);
    return () => {
      globalThis.removeEventListener("paste", handlePaste);
      stopCamera();
    };
  }, [isOpen]);

  const decodeFile = async (file: File) => {
    setIsDecoding(true);
    setDecodeError(null);
    try {
      const data = await decodeQRFromFile(file);
      if (!isOpenRef.current) return;
      if (data) {
        stopCamera();
        setResult({ data, type: detectType(data) });
        haptics.success();
      } else {
        setDecodeError(
          isSpanish
            ? "No encontramos un QR en esa imagen. ¿Pruebas con una foto más clara?"
            : "No QR code found in that image. Try a sharper shot?",
        );
        haptics.error();
      }
    } catch (err) {
      console.error("QR decode failed:", err);
      setDecodeError(
        isSpanish
          ? "No se pudo leer esa imagen."
          : "Couldn't read that file as an image.",
      );
      haptics.error();
    } finally {
      setIsDecoding(false);
    }
  };

  // Attach MediaStream & run multi-pass QR scan loop once <video> is mounted.
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video) return;

    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.srcObject = stream;
    void video.play().catch(() => {
      // Autoplay/play promise rejection is benign if user taps or stream is starting
    });

    const fullCanvas = document.createElement("canvas");
    const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });
    const cropCanvas = document.createElement("canvas");
    const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });

    let cancelled = false;
    let inFlight = false;

    const commitDecoded = (data: string) => {
      if (cancelled) return;
      cancelled = true;
      stopCamera();
      setResult({ data, type: detectType(data) });
      haptics.success();
    };

    scanLoopRef.current = setInterval(async () => {
      if (cancelled || inFlight) return;
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
        return;
      }
      inFlight = true;
      try {
        // Pass 0: Hardware/OS BarcodeDetector fast-path directly on <video>
        const nativeHit = await detectWithNativeBarcodeDetector(video);
        if (nativeHit) {
          commitDecoded(nativeHit);
          return;
        }

        // Pass 1: Full frame @ up to 720px (jsQR attemptBoth + zxing-wasm tryHarder/tryInvert)
        if (fullCtx) {
          const maxDim = Math.max(video.videoWidth, video.videoHeight);
          const scale = Math.min(1, 720 / maxDim);
          fullCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          fullCanvas.height = Math.max(
            1,
            Math.round(video.videoHeight * scale),
          );
          fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
          const fullData = await decodeQRFromImageData(
            fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height),
          );
          if (fullData) {
            commitDecoded(fullData);
            return;
          }
        }

        // Pass 2: 1:1 Center-crop macro pass (reads smaller or held-back codes without downscale blur)
        if (cropCtx) {
          const minSide = Math.min(video.videoWidth, video.videoHeight);
          const cropSize = Math.max(120, Math.round(minSide * 0.58));
          const sx = Math.round((video.videoWidth - cropSize) / 2);
          const sy = Math.round((video.videoHeight - cropSize) / 2);
          const outSize = Math.min(480, cropSize);
          cropCanvas.width = outSize;
          cropCanvas.height = outSize;
          cropCtx.drawImage(
            video,
            sx,
            sy,
            cropSize,
            cropSize,
            0,
            0,
            outSize,
            outSize,
          );
          const cropData = await decodeQRFromImageData(
            cropCtx.getImageData(0, 0, outSize, outSize),
          );
          if (cropData) {
            commitDecoded(cropData);
            return;
          }
        }
      } catch {
        // Ignore transient frame decode errors while camera warms up
      } finally {
        inFlight = false;
      }
    }, 150) as unknown as number;

    return () => {
      cancelled = true;
      if (scanLoopRef.current !== null) {
        clearInterval(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [cameraActive]);

  const startCamera = async () => {
    const sessionId = ++cameraSessionRef.current;
    setCameraError(null);
    setDecodeError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for desktop webcams that reject resolution/facingMode ideals
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!isOpenRef.current || cameraSessionRef.current !== sessionId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Enable continuous autofocus on mobile lenses when supported
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === "function") {
        try {
          const caps = track.getCapabilities() as { focusMode?: string[] };
          if (
            Array.isArray(caps.focusMode) &&
            caps.focusMode.includes("continuous")
          ) {
            await track.applyConstraints({
              advanced: [
                {
                  focusMode: "continuous",
                } as unknown as MediaTrackConstraintSet,
              ],
            });
          }
        } catch {
          // Ignore if browser disallows focusMode constraint
        }
      }

      if (!isOpenRef.current || cameraSessionRef.current !== sessionId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const inApp = getInAppBrowserName();
      setCameraError(
        inApp
          ? getUnsupportedCameraMessage()
          : name === "NotAllowedError"
          ? (isSpanish
            ? "Permiso de cámara denegado — elige una imagen o pega una captura."
            : "Camera permission denied — drop an image or paste a screenshot instead.")
          : name === "NotFoundError"
          ? (isSpanish
            ? "No encontramos una cámara — elige una imagen o pega una captura."
            : "No camera found — drop an image or paste a screenshot instead.")
          : (isSpanish
            ? "No se pudo abrir la cámara. Elige una imagen del QR."
            : "Couldn't start the camera. Drop an image instead."),
      );
      haptics.error();
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.data);
      addToast(isSpanish ? "¡Copiado! 📋" : "Copied! 📋");
      haptics.copy();
    } catch {
      addToast(isSpanish ? "No se pudo copiar ❌" : "Couldn't copy ❌");
      haptics.error();
    }
  };

  if (!shell.mounted) return null;

  const openableUrl = result ? safeOpenUrl(result.data) : null;
  const parsedRows = result?.type === "wifi"
    ? parseWifi(result.data, isSpanish)
    : result?.type === "vcard"
    ? parseVCard(result.data, isSpanish)
    : [];

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        ref={shell.backdropRef}
        class={`absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm charm-modal-backdrop animate-fade-in${
          shell.closing
            ? " charm-modal-backdrop--closing charm-modal--closing"
            : ""
        }`}
        onClick={shell.onBackdropClick}
      />

      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-reader-title"
        tabindex={-1}
        class={`relative w-full max-w-lg bg-[#fbf1e4] border-t-4 sm:border-3 border-[#1e1714] rounded-t-3xl sm:rounded-3xl shadow-chunky-hover max-h-[92dvh] flex flex-col charm-modal-sheet animate-slide-up sm:animate-pop-in overflow-hidden${
          shell.closing ? " charm-modal--closing" : ""
        }`}
      >
        <div class="flex items-center justify-between gap-3 p-4 sm:px-6 sm:pt-5 pb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-12 h-12 rounded-2xl border-2 border-[#1e1714] bg-gradient-to-br from-emerald-200 via-amber-200 to-pink-300 shadow-[2px_2px_0_#1e1714] flex items-center justify-center text-2xl shrink-0 select-none"
              aria-hidden="true"
            >
              🛡️
            </div>
            <div class="min-w-0">
              <h2
                id="qr-reader-title"
                class="text-xl sm:text-2xl font-black text-[#1e1714] tracking-tight leading-tight truncate"
              >
                {isSpanish
                  ? (
                    <>
                      Escudo <span class="qr-marker">Callejero.</span>
                    </>
                  )
                  : (
                    <>
                      Street-Safe <span class="qr-marker">Airlock.</span>
                    </>
                  )}
              </h2>
              <p class="text-xs sm:text-sm font-bold text-[#ec4899] truncate">
                {isSpanish
                  ? "Un filtro seguro entre un QR desconocido y el navegador."
                  : "A safe buffer between a mystery QR and the browser."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={shell.requestClose}
            class="qr-modal-close-btn shrink-0"
            aria-label={isSpanish ? "Cerrar lector QR" : "Close QR reader"}
          >
            <svg
              class="w-4 h-4 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3.25"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6.5 6.5l11 11m0-11l-11 11" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-none p-4 sm:px-6 sm:py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-3.5">
          {!result && (
            <>
              {/* 3-pill Safe Buffer promise strip */}
              <div class="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-black text-[#1e1714]">
                <span class="px-2.5 py-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] shadow-[1px_1px_0_#1e1714]">
                  🛡️ {isSpanish ? "No abre nada solo" : "Zero auto-open"}
                </span>
                <span class="px-2.5 py-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] shadow-[1px_1px_0_#1e1714]">
                  🔄 {isSpanish ? "Revela acortadores" : "Unmasks shortlinks"}
                </span>
                <span class="px-2.5 py-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] shadow-[1px_1px_0_#1e1714]">
                  🍪 {isSpanish ? "Sin cookies" : "No cookies sent"}
                </span>
              </div>

              {/* Camera — primary action when out in the wild */}
              {cameraActive
                ? (
                  <div class="space-y-2">
                    <div class="relative rounded-2xl border-3 border-black bg-black overflow-hidden aspect-square sm:aspect-video">
                      <video
                        ref={videoRef}
                        aria-label={isSpanish
                          ? "Vista previa de la cámara en vivo"
                          : "Live camera scanner preview"}
                        class="w-full h-full object-cover"
                        playsInline
                        muted
                        autoPlay
                      />
                      {/* Viewfinder target reticle */}
                      <div
                        aria-hidden="true"
                        class="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
                      >
                        <div class="relative w-48 h-48 sm:w-44 sm:h-44 rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]">
                          <span class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-300 rounded-tl-xl" />
                          <span class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-300 rounded-tr-xl" />
                          <span class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-300 rounded-bl-xl" />
                          <span class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-300 rounded-br-xl" />
                        </div>
                      </div>
                      <div class="pointer-events-none absolute bottom-2.5 inset-x-0 flex justify-center">
                        <span class="px-3 py-1 rounded-full bg-black/75 text-white text-xs font-black tracking-wide border border-white/30 animate-pulse">
                          {isSpanish
                            ? "Apunta al QR para escanear…"
                            : "Center QR in frame to scan…"}
                        </span>
                      </div>
                    </div>
                    <input
                      ref={cameraCaptureInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      class="hidden"
                      onChange={(e) => {
                        const input = e.target as HTMLInputElement;
                        const file = input.files?.[0];
                        if (file) void decodeFile(file);
                        input.value = "";
                      }}
                    />
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          cameraCaptureInputRef.current?.click()}
                        class="min-h-[44px] px-3 rounded-full border-2 border-black text-xs sm:text-sm font-black text-black bg-amber-200 shadow-chunky hover:bg-amber-300 transition flex items-center justify-center gap-1.5"
                      >
                        <span>📸</span>
                        <span>
                          {isSpanish ? "Foto HD / Macro" : "Snap HD Photo"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        class="min-h-[44px] px-3 rounded-full border-2 border-black text-xs sm:text-sm font-black text-black bg-white shadow-chunky hover:bg-amber-100 transition"
                      >
                        {isSpanish ? "Detener cámara" : "Stop camera"}
                      </button>
                    </div>
                  </div>
                )
                : (
                  <button
                    type="button"
                    onClick={startCamera}
                    class="qr-pitch-cta"
                  >
                    <span>📷</span>
                    <span>
                      {isSpanish
                        ? "Escanear con la cámara"
                        : "Scan with Camera"}
                    </span>
                  </button>
                )}

              {/* Drop / pick zone */}
              <div
                data-dropzone="true"
                role="button"
                tabIndex={0}
                aria-label={isSpanish
                  ? "Elegir una captura o foto del QR"
                  : "Pick a screenshot or QR image"}
                class={`border-2 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white ${
                  isDragging
                    ? "border-black bg-amber-200 shadow-chunky scale-[1.01]"
                    : "border-black/15 hover:border-black/60"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) void decodeFile(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  class="hidden"
                  onChange={(e) => {
                    const input = e.target as HTMLInputElement;
                    const file = input.files?.[0];
                    if (file) void decodeFile(file);
                    input.value = "";
                  }}
                />
                <div class="text-3xl mb-2">🖼️</div>
                <p class="font-black text-black text-sm sm:text-base">
                  {isDecoding
                    ? (isSpanish
                      ? "Leyendo imagen del QR..."
                      : "Reading QR image...")
                    : (isSpanish
                      ? "O elige una captura o foto del QR"
                      : "Or pick a screenshot / QR image")}
                </p>
                <p class="text-xs text-neutral-500 font-medium mt-1">
                  <span>
                    {isSpanish
                      ? "Toca para elegir una foto"
                      : "Tap to choose a photo"}
                  </span>
                  <span class="hidden sm:inline">
                    {isSpanish
                      ? " · o suelta / pega (⌘V)"
                      : " · or drop / paste (⌘V)"}
                  </span>
                </p>
              </div>

              {(decodeError || cameraError) && (
                <p
                  class="text-red-600 text-sm text-center animate-slide-down"
                  role="alert"
                >
                  {decodeError || cameraError}
                </p>
              )}
            </>
          )}

          {result && (
            <div class="space-y-4 animate-slide-down">
              <section class="rounded-2xl border-3 border-black bg-qr-cream p-4 sm:p-5 shadow-chunky space-y-3.5">
                {/* Header row with Type & Domain */}
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    {openableUrl
                      ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${
                            peekData?.domain || new URL(openableUrl).hostname
                          }&sz=64`}
                          alt="Site icon"
                          referrerpolicy="no-referrer"
                          class="w-10 h-10 rounded-xl border-2 border-black bg-white object-contain p-1 shrink-0 shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )
                      : (
                        <span class="w-10 h-10 rounded-xl border-2 border-black bg-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                          {TYPE_META[result.type].icon}
                        </span>
                      )}
                    <div class="min-w-0">
                      <p class="text-[11px] uppercase tracking-wider text-pink-600 font-black">
                        {isSpanish
                          ? TYPE_META[result.type].labelEs
                          : TYPE_META[result.type].label}
                      </p>
                      {openableUrl && (
                        <p class="text-sm font-black text-gray-900 truncate">
                          {peekData?.domain || new URL(openableUrl).hostname}
                        </p>
                      )}
                    </div>
                  </div>

                  {openableUrl && !isPeeking && peekData?.ok && (
                    <div class="shrink-0">
                      {peekData.isRedirected
                        ? (
                          <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-xs">
                            <span>🔄</span>
                            <span>
                              {isSpanish ? "Redirección detectada" : "Unmasked"}
                            </span>
                          </span>
                        )
                        : (
                          <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                            <span>🛡️</span>
                            <span>
                              {isSpanish ? "Enlace directo" : "Direct Link"}
                            </span>
                          </span>
                        )}
                    </div>
                  )}
                </div>

                {/* Mini-Browser Webpage Inspection Preview Card */}
                {openableUrl && (
                  <div class="space-y-2.5">
                    {isPeeking
                      ? (
                        <div
                          class="rounded-2xl border-2 border-black bg-white overflow-hidden shadow-chunky"
                          role="status"
                          aria-live="polite"
                        >
                          <div class="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border-b-2 border-black">
                            <div class="flex items-center gap-1.5 shrink-0">
                              <span class="w-2.5 h-2.5 rounded-full bg-red-400 border border-black" />
                              <span class="w-2.5 h-2.5 rounded-full bg-amber-300 border border-black" />
                              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                            </div>
                            <span class="text-[11px] font-mono font-bold text-neutral-600 truncate">
                              {new URL(openableUrl).hostname}
                            </span>
                            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 border border-black text-black">
                              {isSpanish ? "Revisando…" : "Peeking…"}
                            </span>
                          </div>
                          <div class="w-full aspect-video px-4 bg-gradient-to-br from-amber-50 via-white to-pink-50 text-center animate-pulse flex flex-col items-center justify-center gap-1.5">
                            <span class="text-2xl animate-spin">🔍</span>
                            <span class="text-xs font-black text-gray-900">
                              {isSpanish
                                ? "Revisando el destino de forma segura..."
                                : "Inspecting destination safely..."}
                            </span>
                            <span class="text-[10px] text-gray-500 font-medium">
                              {isSpanish
                                ? "Desarmando redirecciones y obteniendo vista previa sin cookies"
                                : "Unrolling redirects & fetching visual preview without cookies"}
                            </span>
                          </div>
                          <div
                            class="p-3 space-y-2 border-t-2 border-black bg-white"
                            aria-hidden="true"
                          >
                            <div class="h-4 w-2/3 rounded bg-black/10 animate-pulse" />
                            <div class="h-3 w-full rounded bg-black/5 animate-pulse" />
                          </div>
                        </div>
                      )
                      : peekData
                      ? (() => {
                        const finalUrlStr = peekData.finalUrl || openableUrl;
                        const isHttps = peekData.isHttps ??
                          finalUrlStr.startsWith("https://");
                        const hopChain = peekData.redirectChain &&
                            peekData.redirectChain.length > 1
                          ? peekData.redirectChain
                          : peekData.isRedirected
                          ? [openableUrl, finalUrlStr]
                          : [finalUrlStr];
                        const activePreviewSrc = previewStage === "og"
                          ? peekData.image
                          : previewStage === "screenshot" &&
                              peekData.screenshotUrl
                          ? `${peekData.screenshotUrl}${
                            screenshotRetry > 0 ? `&r=${screenshotRetry}` : ""
                          }`
                          : null;
                        const previewLabel = previewStage === "og"
                          ? (isSpanish
                            ? "Vista previa de tarjeta"
                            : "Site Card Preview")
                          : (isSpanish
                            ? "Vista previa en vivo"
                            : "Live Page Preview");

                        return (
                          <div class="rounded-2xl border-2 border-black bg-white overflow-hidden shadow-chunky">
                            {/* Mini Browser Top Bar */}
                            <div class="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border-b-2 border-black">
                              <div
                                class="flex items-center gap-1.5 shrink-0"
                                aria-hidden="true"
                              >
                                <span class="w-2.5 h-2.5 rounded-full bg-red-400 border border-black" />
                                <span class="w-2.5 h-2.5 rounded-full bg-amber-300 border border-black" />
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                              </div>

                              <div class="flex-1 min-w-0 px-2 py-0.5 rounded-full bg-white border border-black/30 flex items-center justify-center gap-1.5">
                                <span class="font-mono text-[11px] font-bold text-black truncate">
                                  {peekData.domain ||
                                    new URL(finalUrlStr).hostname}
                                </span>
                              </div>

                              {isHttps
                                ? (
                                  <span class="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-900 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded-full">
                                    <span>🔒</span>
                                    <span>HTTPS</span>
                                  </span>
                                )
                                : (
                                  <span class="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-red-900 bg-red-100 border border-red-400 px-2 py-0.5 rounded-full">
                                    <span>⚠️</span>
                                    <span>
                                      {isSpanish
                                        ? "No seguro (HTTP)"
                                        : "Not Secure (HTTP)"}
                                    </span>
                                  </span>
                                )}
                            </div>

                            {/* Visual Viewport Area (aspect-video) */}
                            <div class="relative w-full aspect-video border-b-2 border-black bg-gradient-to-br from-[#FFF8F0] via-[#FFF0F7] to-[#F0F9FF] overflow-hidden">
                              {activePreviewSrc
                                ? (
                                  <>
                                    {!previewLoaded && (
                                      <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-amber-50 via-pink-50 to-amber-50 animate-pulse p-4 text-center">
                                        <span class="text-2xl">🖼️</span>
                                        <span class="text-xs font-black text-black/75">
                                          {isSpanish
                                            ? `Cargando ${previewLabel.toLowerCase()}…`
                                            : `Loading ${previewLabel.toLowerCase()}…`}
                                        </span>
                                      </div>
                                    )}
                                    <img
                                      key={activePreviewSrc}
                                      src={activePreviewSrc}
                                      alt={peekData.title || peekData.domain}
                                      referrerpolicy="no-referrer"
                                      class={`w-full h-full object-cover object-top transition-opacity duration-300 ${
                                        previewLoaded
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                      loading="lazy"
                                      onLoad={() => setPreviewLoaded(true)}
                                      onError={() => {
                                        setPreviewLoaded(false);
                                        if (
                                          previewStage === "og" &&
                                          peekData.screenshotUrl
                                        ) {
                                          setPreviewStage("screenshot");
                                        } else if (
                                          previewStage === "screenshot" &&
                                          screenshotRetry < 1
                                        ) {
                                          setScreenshotRetry((r) => r + 1);
                                        } else {
                                          setPreviewStage("fallback");
                                        }
                                      }}
                                    />
                                    <span class="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border-2 border-black text-[10px] font-black text-black shadow-chunky">
                                      <span>
                                        {previewStage === "og" ? "🪪" : "🖥️"}
                                      </span>
                                      <span>{previewLabel}</span>
                                    </span>
                                  </>
                                )
                                : (
                                  /* Clean Visual Domain Card Fallback */
                                  <div class="w-full h-full p-4 flex flex-col items-center justify-center text-center gap-2">
                                    <div class="w-12 h-12 rounded-2xl border-2 border-black bg-white shadow-chunky flex items-center justify-center p-2">
                                      <img
                                        src={`https://www.google.com/s2/favicons?domain=${peekData.domain}&sz=64`}
                                        alt=""
                                        referrerpolicy="no-referrer"
                                        class="w-7 h-7 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style
                                            .display = "none";
                                        }}
                                      />
                                    </div>
                                    <div class="space-y-0.5 max-w-[90%]">
                                      <p class="font-mono text-sm font-black text-black truncate">
                                        {peekData.domain}
                                      </p>
                                      <p class="text-[11px] font-bold text-neutral-600 line-clamp-1">
                                        {peekData.title &&
                                            peekData.title !== peekData.domain
                                          ? peekData.title
                                          : (isSpanish
                                            ? "Destino web verificado"
                                            : "Verified web destination")}
                                      </p>
                                    </div>
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border-2 border-black text-[10px] font-black text-black">
                                      <span>🪪</span>
                                      <span>
                                        {isSpanish
                                          ? "Vista previa de tarjeta"
                                          : "Site Card Preview"}
                                      </span>
                                    </span>
                                  </div>
                                )}
                            </div>

                            {/* Metadata & Unrolled Redirect Chain */}
                            <div class="p-3 space-y-2">
                              <div>
                                <h4 class="text-sm font-black text-gray-900 leading-snug">
                                  {peekData.title || peekData.domain}
                                </h4>
                                {peekData.description && (
                                  <p class="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium mt-0.5">
                                    {peekData.description}
                                  </p>
                                )}
                              </div>

                              {(hopChain.length > 1 ||
                                peekData.isRedirected) && (
                                <div class="rounded-xl border-2 border-amber-400 bg-amber-50 p-2.5 space-y-1">
                                  <div class="flex items-center justify-between gap-2">
                                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-900">
                                      {isSpanish
                                        ? `🔄 Ruta de redirección (${hopChain.length} saltos)`
                                        : `🔄 Redirect Path (${hopChain.length} hops)`}
                                    </span>
                                    <span class="font-mono text-[10px] font-bold text-amber-800 truncate max-w-[160px]">
                                      → {peekData.domain}
                                    </span>
                                  </div>
                                  <div
                                    class="flex flex-wrap items-center gap-1 text-[11px] font-mono font-bold text-black"
                                    aria-label="Redirect hop chain"
                                  >
                                    {hopChain.map((hop, idx) => (
                                      <span
                                        key={`${hop}-${idx}`}
                                        class="inline-flex items-center gap-1 max-w-full"
                                      >
                                        {idx > 0 && (
                                          <span
                                            class="text-amber-700 font-black"
                                            aria-hidden="true"
                                          >
                                            →
                                          </span>
                                        )}
                                        <span
                                          title={hop}
                                          class={`px-1.5 py-0.5 rounded border truncate max-w-[200px] ${
                                            idx === hopChain.length - 1
                                              ? "bg-white border-black text-black font-black"
                                              : "bg-amber-100/80 border-amber-300 text-neutral-700"
                                          }`}
                                        >
                                          {formatHopLabel(hop)}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                      : null}
                  </div>
                )}

                {/* Parsed structured data (Wifi / vCard) or raw payload */}
                {parsedRows.length > 0
                  ? (
                    <div class="rounded-xl border-2 border-black bg-white divide-y divide-gray-100">
                      {parsedRows.map((row) => (
                        <div
                          key={row.label}
                          class="flex items-baseline justify-between gap-3 px-3 py-2"
                        >
                          <span class="text-[11px] font-black uppercase tracking-wide text-gray-500">
                            {row.label}
                          </span>
                          <span class="text-sm font-bold text-gray-900 break-all text-right">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                  : openableUrl
                  ? (
                    <details class="group rounded-xl border-2 border-black/20 bg-white/70 text-xs transition-all">
                      <summary class="cursor-pointer min-h-[44px] px-3 py-2 font-bold text-gray-600 hover:text-black list-none flex items-center justify-between text-[11px] select-none">
                        <span class="flex items-center gap-1.5">
                          <span>🔍</span>
                          <span>
                            {isSpanish
                              ? "Revisar URL completa y parámetros"
                              : "Inspect Raw URL & Parameters"}
                          </span>
                        </span>
                        <span class="group-open:rotate-180 transition-transform text-[10px]">
                          ▼
                        </span>
                      </summary>
                      <div class="px-3 pb-2.5 pt-2 border-t border-gray-200 font-mono text-[11px] text-gray-800 break-all select-all max-h-24 overflow-y-auto">
                        {result.data}
                      </div>
                    </details>
                  )
                  : (
                    <div class="rounded-xl border-2 border-black bg-white p-3 font-mono text-xs font-bold text-gray-900 break-all whitespace-pre-wrap max-h-28 overflow-y-auto">
                      {result.data}
                    </div>
                  )}
              </section>

              {/* Action Buttons */}
              <div class="grid gap-2.5 sm:grid-cols-2">
                {openableUrl && (
                  <a
                    href={(peekData?.finalUrl &&
                      safeOpenUrl(peekData.finalUrl)) || openableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="min-h-[50px] rounded-xl border-3 border-black bg-black px-4 py-3 font-black text-white shadow-[3px_3px_0px_0px_#FF69B4] hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🛡️</span>
                    <span>{isSpanish ? "Abrir link ↗" : "Open link ↗"}</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  class={`min-h-[50px] rounded-xl border-3 border-black bg-white px-4 py-3 font-black text-gray-900 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5 ${
                    openableUrl ? "" : "sm:col-span-2"
                  }`}
                >
                  <span>📋</span>
                  <span>{isSpanish ? "Copiar link" : "Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setPeekData(null);
                    setDecodeError(null);
                  }}
                  class="sm:col-span-2 min-h-[44px] rounded-xl border-2 border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 hover:border-black hover:text-black transition-all"
                >
                  {isSpanish ? "Escanear otro QR" : "Scan another QR"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

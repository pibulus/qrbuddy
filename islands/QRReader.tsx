import { type Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";
import { decodeQRFromFile, decodeQRFromImageData } from "../utils/qr-decode.ts";
import { useModalShell } from "./modal/useModalShell.ts";
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
  title: string;
  description: string;
  image: string | null;
}

const TYPE_META: Record<DecodedType, { icon: string; label: string }> = {
  url: { icon: "🔗", label: "Link" },
  wifi: { icon: "📶", label: "WiFi network" },
  vcard: { icon: "👤", label: "Contact card" },
  sms: { icon: "💬", label: "Text message" },
  email: { icon: "✉️", label: "Email" },
  tel: { icon: "📞", label: "Phone number" },
  text: { icon: "📝", label: "Plain text" },
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

function parseWifi(data: string): { label: string; value: string }[] {
  const get = (key: string) => {
    const match = data.match(new RegExp(`${key}:((?:\\\\.|[^\\\\;])*)`, "i"));
    return match ? match[1].replace(/\\(.)/g, "$1") : "";
  };
  const rows = [
    { label: "Network", value: get("S") },
    { label: "Password", value: get("P") },
    { label: "Security", value: get("T") || "None" },
  ];
  return rows.filter((r) => r.value !== "");
}

function parseVCard(data: string): { label: string; value: string }[] {
  const line = (key: string) => {
    const match = data.match(new RegExp(`^${key}[^:]*:(.+)$`, "im"));
    return match ? match[1].trim() : "";
  };
  const rows = [
    { label: "Name", value: line("FN") },
    { label: "Organisation", value: line("ORG") },
    { label: "Phone", value: line("TEL") },
    { label: "Email", value: line("EMAIL") },
    { label: "Website", value: line("URL") },
  ];
  return rows.filter((r) => r.value !== "");
}

export default function QRReader(
  { isOpen, onClose, url: _url, initialResult }: QRReaderProps,
) {
  const [result, setResult] = useState<DecodedResult | null>(null);
  const [peekData, setPeekData] = useState<PeekResult | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const shell = useModalShell({ open: isOpen, onClose });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const stopCamera = () => {
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
      return;
    }

    const openable = safeOpenUrl(result.data);
    if (!openable) return;

    let isMounted = true;
    setIsPeeking(true);
    setPeekData(null);

    fetch(`/api/peek?url=${encodeURIComponent(openable)}`)
      .then((res) => res.json())
      .then((data: PeekResult) => {
        if (isMounted && data.ok) {
          setPeekData(data);
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
      if (data) {
        stopCamera();
        setResult({ data, type: detectType(data) });
        haptics.success();
      } else {
        setDecodeError("No QR code found in that image. Try a sharper shot?");
        haptics.error();
      }
    } catch (err) {
      console.error("QR decode failed:", err);
      setDecodeError("Couldn't read that file as an image.");
      haptics.error();
    } finally {
      setIsDecoding(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setDecodeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Wait a tick for the <video> to mount, then attach + scan.
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        scanLoopRef.current = setInterval(async () => {
          if (!video.videoWidth) return;
          const scale = Math.min(1, 640 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = await decodeQRFromImageData(
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          );
          if (data) {
            stopCamera();
            setResult({ data, type: detectType(data) });
            haptics.success();
          }
        }, 200) as unknown as number;
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const inApp = getInAppBrowserName();
      setCameraError(
        inApp
          ? getUnsupportedCameraMessage()
          : name === "NotAllowedError"
          ? "Camera permission denied — drop an image or paste a screenshot instead."
          : name === "NotFoundError"
          ? "No camera found — drop an image or paste a screenshot instead."
          : "Couldn't start the camera. Drop an image instead.",
      );
      haptics.error();
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.data);
      addToast("Copied! 📋");
      haptics.copy();
    } catch {
      addToast("Couldn't copy ❌");
      haptics.error();
    }
  };

  if (!shell.mounted) return null;

  const openableUrl = result ? safeOpenUrl(result.data) : null;
  const parsedRows = result?.type === "wifi"
    ? parseWifi(result.data)
    : result?.type === "vcard"
    ? parseVCard(result.data)
    : [];

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        ref={shell.backdropRef}
        class="absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm"
        onClick={shell.onBackdropClick}
      />

      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-reader-title"
        tabindex={-1}
        class="relative w-full max-w-lg bg-white sm:border-4 sm:border-black rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col animate-slide-up sm:animate-pop-in overflow-hidden"
      >
        <div class="flex items-start justify-between gap-3 p-4 sm:p-6 border-b-2 border-gray-100">
          <div>
            <p class="text-xs uppercase tracking-wide text-pink-600 font-black">
              Safe QR Inspector
            </p>
            <h2
              id="qr-reader-title"
              class="text-xl sm:text-2xl font-black text-gray-900 leading-tight"
            >
              Street Safe Inspection
            </h2>
          </div>
          <button
            type="button"
            onClick={shell.requestClose}
            class="min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 transition-colors text-2xl font-black text-gray-500"
            aria-label="Close QR reader"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
          {!result && (
            <>
              {/* Drop / pick zone */}
              <div
                data-dropzone="true"
                class={`border-3 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-purple-500 bg-purple-50 scale-[1.02]"
                    : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
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
                <div class="text-5xl mb-3">🔍</div>
                <p class="font-black text-gray-800">
                  {isDecoding ? "Reading..." : "Drop a QR image here"}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  tap to pick a file · or paste a screenshot (⌘V)
                </p>
              </div>

              {/* Camera */}
              {cameraActive
                ? (
                  <div class="space-y-2">
                    <video
                      ref={videoRef}
                      class="w-full rounded-2xl border-3 border-black bg-black aspect-video object-cover"
                      playsInline
                      muted
                    />
                    <button
                      type="button"
                      onClick={stopCamera}
                      class="w-full min-h-[44px] rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition"
                    >
                      Stop camera
                    </button>
                  </div>
                )
                : (
                  <button
                    type="button"
                    onClick={startCamera}
                    class="w-full min-h-[52px] rounded-xl border-3 border-black bg-white px-4 py-3 font-black text-gray-900 shadow-chunky hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    📷 Scan with camera
                  </button>
                )}

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
                        {TYPE_META[result.type].label}
                      </p>
                      {openableUrl && (
                        <p class="text-sm font-black text-gray-900 truncate">
                          {peekData?.domain || new URL(openableUrl).hostname}
                        </p>
                      )}
                    </div>
                  </div>

                  {openableUrl && (
                    <div class="shrink-0">
                      {peekData?.isRedirected
                        ? (
                          <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-xs">
                            <span>🔄</span>
                            <span>Unmasked</span>
                          </span>
                        )
                        : (
                          <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                            <span>🛡️</span>
                            <span>Direct Link</span>
                          </span>
                        )}
                    </div>
                  )}
                </div>

                {/* Quick Cat Club style Inspection Preview Card */}
                {openableUrl && (
                  <div class="space-y-2">
                    {isPeeking
                      ? (
                        <div class="w-full py-7 px-4 rounded-xl border-2 border-black bg-white/80 text-center animate-pulse flex flex-col items-center justify-center gap-1.5 shadow-inner">
                          <span class="text-2xl animate-spin">🔍</span>
                          <span class="text-xs font-black text-gray-900">
                            Inspecting destination safely...
                          </span>
                          <span class="text-[10px] text-gray-500 font-medium">
                            Checking metadata & redirects without firing tracker
                            cookies
                          </span>
                        </div>
                      )
                      : peekData
                      ? (
                        <div class="rounded-xl border-2 border-black bg-white overflow-hidden shadow-sm">
                          {peekData.image && (
                            <div class="relative w-full aspect-video border-b-2 border-black bg-gray-100 overflow-hidden">
                              <img
                                src={peekData.image}
                                alt={peekData.title}
                                class="w-full h-full object-cover object-center"
                                loading="lazy"
                                onError={(e) => {
                                  const el =
                                    (e.target as HTMLElement).parentElement;
                                  if (el) el.style.display = "none";
                                }}
                              />
                            </div>
                          )}
                          <div class="p-3 space-y-1">
                            <h4 class="text-sm font-black text-gray-900 leading-snug">
                              {peekData.title || peekData.domain}
                            </h4>
                            {peekData.description && (
                              <p class="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium">
                                {peekData.description}
                              </p>
                            )}
                            {peekData.isRedirected && (
                              <div class="pt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                                <span class="text-amber-700">Destination:</span>
                                <span class="font-mono text-black text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[240px]">
                                  {peekData.finalUrl}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
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
                    <details class="group rounded-xl border-2 border-black/20 bg-white/70 p-2.5 text-xs transition-all">
                      <summary class="cursor-pointer font-bold text-gray-600 hover:text-black list-none flex items-center justify-between text-[11px] select-none">
                        <span class="flex items-center gap-1.5">
                          <span>🔍</span>
                          <span>Inspect Raw URL & Parameters</span>
                        </span>
                        <span class="group-open:rotate-180 transition-transform text-[10px]">
                          ▼
                        </span>
                      </summary>
                      <div class="pt-2 mt-1.5 border-t border-gray-200 font-mono text-[11px] text-gray-800 break-all select-all max-h-24 overflow-y-auto">
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
                    href={peekData?.finalUrl || openableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="min-h-[50px] rounded-xl border-3 border-black bg-black px-4 py-3 font-black text-white shadow-[3px_3px_0px_0px_#FF69B4] hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🛡️</span>
                    <span>Visit Safely ↗</span>
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
                  <span>Copy Link</span>
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
                  Scan another QR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

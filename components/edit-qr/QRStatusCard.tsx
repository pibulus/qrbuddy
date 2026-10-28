import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { QRData } from "../../hooks/useQRData.ts";
import type { QR_STYLES } from "../../utils/qr-styles.ts";
import QRCanvas from "../../islands/QRCanvas.tsx";
import { formatRelativeVisit } from "./FieldReportCard.tsx";

interface QRStatusCardProps {
  qrData: QRData;
}

export type QRStatusLabel = "Active ✓" | "Paused" | "Exhausted" | "Expired";

export interface DerivedQRStatus {
  status: QRStatusLabel;
  scansRemaining: number | "∞";
  isActive: boolean;
  exhausted: boolean;
  expired: boolean;
}

export function deriveQRStatus(
  qrData: Pick<
    QRData,
    "is_active" | "max_scans" | "scan_count" | "expires_at"
  >,
  nowMs = Date.now(),
): DerivedQRStatus {
  const scansRemaining = qrData.max_scans !== null
    ? Math.max(0, qrData.max_scans - qrData.scan_count)
    : "∞";

  const exhausted = qrData.max_scans !== null &&
    qrData.scan_count >= qrData.max_scans;
  const expired = Boolean(
    qrData.expires_at && Date.parse(qrData.expires_at) <= nowMs,
  );
  const isActive = qrData.is_active && !exhausted && !expired;
  const status: QRStatusLabel = exhausted
    ? "Exhausted"
    : expired
    ? "Expired"
    : isActive
    ? "Active ✓"
    : "Paused";

  return {
    status,
    scansRemaining,
    isActive,
    exhausted,
    expired,
  };
}

export default function QRStatusCard({ qrData }: QRStatusCardProps) {
  // Use APP_URL from window location or fallback to production URL
  const baseUrl = typeof globalThis !== "undefined" &&
      globalThis.location
    ? `${globalThis.location.protocol}//${globalThis.location.host}`
    : "https://qrbuddy.app";
  const redirectUrl = `${baseUrl}/r?code=${qrData.short_code}`;

  const { status, scansRemaining, isActive, exhausted, expired } =
    deriveQRStatus(qrData);
  const lastVisit = formatRelativeVisit(qrData.analytics?.last_scan);

  // Mini QRCanvas state for immediate re-download / sticker printing
  const qrUrl = useSignal(redirectUrl);
  const qrStyle = useSignal<keyof typeof QR_STYLES | "custom">("sunset");
  const triggerDownload = useSignal(false);
  const frameConfig = useSignal<{ enabled: boolean; caption: string } | null>({
    enabled: true,
    caption: "SCAN ME",
  });

  useEffect(() => {
    qrUrl.value = redirectUrl;
  }, [redirectUrl]);

  const statusBadgeClass = isActive
    ? "bg-emerald-200 text-black border-black"
    : exhausted || expired
    ? "bg-rose-200 text-black border-black"
    : "bg-amber-200 text-black border-black";

  const handleDownloadSticker = () => {
    triggerDownload.value = true;
    haptics.medium();
    addToast("Sticker on the way — print it, stick it 🖨️", 3000);
  };

  return (
    <section
      class="bg-qr-cream border-4 border-black rounded-3xl p-4 sm:p-6 space-y-4 shadow-chunky"
      aria-label="QR Status and Sticker"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
          QR Status
        </h2>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-white font-mono text-xs font-black text-black">
          <span>Code:</span>
          <span>{qrData.short_code}</span>
        </span>
      </div>

      {/* High-Contrast KPI Tiles */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-neutral-600">
            Total Visits
          </span>
          <p class="mt-1 text-xl sm:text-2xl font-black font-mono text-black truncate">
            {qrData.scan_count}
          </p>
          <span class="text-[11px] font-bold text-neutral-600 truncate">
            {qrData.max_scans !== null
              ? `of ${qrData.max_scans} limit`
              : "All-time total"}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-neutral-600">
            Remaining Scans
          </span>
          <div class="mt-1 flex items-center gap-1.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full border-2 border-black bg-amber-200 text-base sm:text-lg font-black font-mono text-black">
              {scansRemaining}
            </span>
          </div>
          <span class="mt-1 text-[11px] font-bold text-neutral-600 truncate">
            {scansRemaining === "∞" ? "Unlimited scans" : "Countdown active"}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-neutral-600">
            Status
          </span>
          <div class="mt-1">
            <span
              class={`inline-flex items-center px-2.5 py-0.5 rounded-full border-2 text-xs sm:text-sm font-black ${statusBadgeClass}`}
            >
              {status}
            </span>
          </div>
          <span class="mt-1 text-[11px] font-bold text-neutral-600 truncate">
            {isActive
              ? "Redirecting live"
              : exhausted
              ? "Scan cap reached"
              : expired
              ? "Past expiry date"
              : "Scans paused"}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-neutral-600">
            Last Visit
          </span>
          <p class="mt-1 text-sm sm:text-base font-black text-black leading-tight truncate">
            {lastVisit.relative}
          </p>
          <span class="mt-0.5 text-[11px] font-bold text-neutral-600 truncate">
            {lastVisit.localDateTime ?? "Waiting for first scan"}
          </span>
        </div>
      </div>

      {/* Redirect URL + Copy */}
      <div class="pt-2 border-t-2 border-black/10 space-y-1.5">
        <label
          htmlFor="qr-redirect-url"
          class="block text-xs font-black uppercase tracking-wider text-neutral-700"
        >
          Public Redirect URL
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="qr-redirect-url"
            type="text"
            value={redirectUrl}
            readOnly
            class="flex-1 min-w-0 min-h-[44px] px-3 py-2 border-2 border-black/15 bg-white rounded-2xl text-xs font-mono text-black focus:border-qr-pop focus:outline-none"
          />
          <div class="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(redirectUrl);
                  haptics.success();
                  addToast("Copied! ✨", 2000);
                } catch {
                  haptics.error();
                  addToast("Couldn't reach the clipboard", 3000);
                }
              }}
              class="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-white hover:bg-amber-200 text-black rounded-full border-2 border-black font-black text-xs shadow-chunky transition-all active:scale-95"
            >
              📋 Copy Link
            </button>
            <button
              type="button"
              onClick={handleDownloadSticker}
              class="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-qr-pop hover:bg-qr-popDeep text-white rounded-full border-2 border-black font-black text-xs shadow-chunky transition-all active:scale-95"
            >
              🖨️ Download / Print QR Sticker
            </button>
          </div>
        </div>
      </div>

      {/* Mini QR Sticker Preview */}
      <div class="pt-2 flex flex-col items-center gap-2">
        <div class="w-full max-w-[190px]">
          <QRCanvas
            url={qrUrl}
            style={qrStyle}
            triggerDownload={triggerDownload}
            frameConfig={frameConfig}
          />
        </div>
      </div>
    </section>
  );
}

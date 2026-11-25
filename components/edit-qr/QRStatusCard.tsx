import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { QRData } from "../../hooks/useQRData.ts";
import type { QR_STYLES } from "../../utils/qr-styles.ts";
import QRCanvas from "../../islands/QRCanvas.tsx";
import { formatRelativeVisit } from "./FieldReportCard.tsx";
import { getHistory, getSavedItemByShortCode } from "../../utils/history.ts";
import { loadDesignPreferences } from "../../utils/design-preferences.ts";
import type { QRStyle } from "../../types/qr-types.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface QRStatusCardProps {
  qrData: QRData;
  lang?: Locale;
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

const STATUS_LABELS_ES: Record<QRStatusLabel, string> = {
  "Active ✓": "Activo ✓",
  Paused: "En pausa",
  Exhausted: "Agotado",
  Expired: "Vencido",
};

export default function QRStatusCard({ qrData, lang }: QRStatusCardProps) {
  const isSpanish = getClientLocale(lang) === "es";
  // Use APP_URL from window location or fallback to production URL
  const baseUrl = typeof globalThis !== "undefined" &&
      globalThis.location
    ? `${globalThis.location.protocol}//${globalThis.location.host}`
    : "https://qrbuddy.app";
  const redirectUrl = `${baseUrl}/r?code=${qrData.short_code}`;

  const { status, scansRemaining, isActive, exhausted, expired } =
    deriveQRStatus(qrData);
  const lastVisit = formatRelativeVisit(
    qrData.analytics?.last_scan,
    Date.now(),
    isSpanish ? "es" : "en",
  );
  const statusText = isSpanish ? STATUS_LABELS_ES[status] : status;

  // Mini QRCanvas state for immediate re-download / sticker printing
  const qrUrl = useSignal(redirectUrl);
  const qrStyle = useSignal<keyof typeof QR_STYLES | "custom">("sunset");
  const triggerDownload = useSignal(false);
  const customStyle = useSignal<QRStyle | null>(null);
  const logoUrl = useSignal("");
  const frameConfig = useSignal<{ enabled: boolean; caption: string } | null>(
    null,
  );

  useEffect(() => {
    qrUrl.value = redirectUrl;
  }, [redirectUrl]);

  // Re-download the sticker in the design it was made with: the vault entry
  // for this code first, then the last design used on this device.
  const [savedLabel, setSavedLabel] = useState("");
  useEffect(() => {
    const syncLabel = () => {
      const savedEntry = getSavedItemByShortCode(qrData.short_code);
      const serverLabel = typeof qrData.title === "string" &&
          qrData.title.trim() &&
          qrData.title.trim() !== qrData.destination_url.trim()
        ? qrData.title.trim()
        : "";
      const label = (typeof savedEntry?.metadata?.label === "string" &&
          savedEntry.metadata.label.trim()
        ? savedEntry.metadata.label.trim()
        : "") ||
        serverLabel ||
        (typeof savedEntry?.metadata?.title === "string" &&
            savedEntry.metadata.title.trim() &&
            savedEntry.metadata.title.trim() !==
              qrData.destination_url.trim()
          ? savedEntry.metadata.title.trim()
          : "");
      setSavedLabel(label);
    };
    syncLabel();
    globalThis.addEventListener?.("history-updated", syncLabel);
    return () => globalThis.removeEventListener?.("history-updated", syncLabel);
  }, [qrData.short_code, qrData.destination_url, qrData.title]);

  useEffect(() => {
    const saved = getHistory().find((item) =>
      item.metadata?.shortCode === qrData.short_code ||
      item.content.includes(`code=${qrData.short_code}`)
    )?.metadata?.design;
    const prefs = saved ? null : loadDesignPreferences();
    const design = saved ?? (prefs
      ? {
        style: prefs.style,
        customStyle: prefs.customStyle,
        logoUrl: prefs.logoUrl,
        frameConfig: prefs.frameConfig,
      }
      : null);
    if (!design) return;
    qrStyle.value = design.style as keyof typeof QR_STYLES | "custom";
    customStyle.value = design.customStyle ?? null;
    logoUrl.value = design.logoUrl ?? "";
    frameConfig.value = design.frameConfig?.enabled
      ? {
        enabled: true,
        caption: design.frameConfig.caption ?? "",
      }
      : null;
  }, [qrData.short_code]);

  const statusBadgeClass = isActive
    ? "bg-emerald-200 text-black border-black"
    : exhausted || expired
    ? "bg-amber-200 text-black border-black"
    : "bg-amber-200 text-black border-black";

  const handleDownloadSticker = () => {
    triggerDownload.value = true;
    haptics.medium();
    addToast(
      isSpanish
        ? "Sticker en camino: imprímelo y pégalo"
        : "Sticker on the way: print it, stick it",
      3000,
    );
  };

  const handleDownloadSvg = () => {
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", { detail: { format: "svg" } }),
    );
    haptics.medium();
  };

  return (
    <section
      class="bg-qr-cream border-4 border-black rounded-3xl p-4 sm:p-6 space-y-4 shadow-chunky"
      aria-label={isSpanish
        ? "Estado del QR y sticker"
        : "QR Status and Sticker"}
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
            {savedLabel || (isSpanish ? "Estado del QR" : "QR Status")}
          </h2>
          {savedLabel && (
            <p class="text-[11px] font-black uppercase tracking-wider text-[#574c44]">
              {isSpanish ? "Estado del QR" : "QR Status"}
            </p>
          )}
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-white font-mono text-xs font-black text-black shrink-0">
          <span>{isSpanish ? "Código:" : "Code:"}</span>
          <span>{qrData.short_code}</span>
        </span>
      </div>

      {/* High-Contrast KPI Tiles */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-[#574c44]">
            {isSpanish ? "Visitas totales" : "Total Visits"}
          </span>
          <p class="mt-1 text-xl sm:text-2xl font-black font-mono text-black truncate">
            {qrData.scan_count}
          </p>
          <span class="text-[11px] font-bold text-[#574c44] truncate">
            {qrData.max_scans !== null
              ? (isSpanish
                ? `de ${qrData.max_scans} de límite`
                : `of ${qrData.max_scans} limit`)
              : (isSpanish ? "Total histórico" : "All-time total")}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-[#574c44]">
            {isSpanish ? "Escaneos restantes" : "Remaining Scans"}
          </span>
          <div class="mt-1 flex items-center gap-1.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full border-2 border-black bg-amber-200 text-base sm:text-lg font-black font-mono text-black">
              {scansRemaining}
            </span>
          </div>
          <span class="mt-1 text-[11px] font-bold text-[#574c44] truncate">
            {scansRemaining === "∞"
              ? (isSpanish ? "Escaneos ilimitados" : "Unlimited scans")
              : (isSpanish ? "Cuenta regresiva activa" : "Countdown active")}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-[#574c44]">
            {isSpanish ? "Estado" : "Status"}
          </span>
          <div class="mt-1">
            <span
              class={`inline-flex items-center px-2.5 py-0.5 rounded-full border-2 text-xs sm:text-sm font-black ${statusBadgeClass}`}
            >
              {statusText}
            </span>
          </div>
          <span class="mt-1 text-[11px] font-bold text-[#574c44] truncate">
            {isActive
              ? (isSpanish ? "Redirigiendo en vivo" : "Redirecting live")
              : exhausted
              ? (isSpanish
                ? "Límite de escaneos alcanzado"
                : "Scan cap reached")
              : expired
              ? (isSpanish
                ? "Fecha de vencimiento superada"
                : "Past expiry date")
              : (isSpanish ? "Escaneos en pausa" : "Scans paused")}
          </span>
        </div>

        <div class="bg-white border-2 border-black rounded-2xl p-3 flex flex-col justify-between min-w-0">
          <span class="text-[11px] font-black uppercase tracking-wider text-[#574c44]">
            {isSpanish ? "Última visita" : "Last Visit"}
          </span>
          <p class="mt-1 text-sm sm:text-base font-black text-black leading-tight truncate">
            {lastVisit.relative}
          </p>
          <span class="mt-0.5 text-[11px] font-bold text-[#574c44] truncate">
            {lastVisit.localDateTime ??
              (isSpanish
                ? "Esperando el primer escaneo"
                : "Waiting for first scan")}
          </span>
        </div>
      </div>

      {/* Redirect URL + Copy */}
      <div class="pt-2 border-t-2 border-black/10 space-y-1.5">
        <label
          htmlFor="qr-redirect-url"
          class="block text-xs font-black uppercase tracking-wider text-[#4a3f39]"
        >
          {isSpanish ? "URL pública de redirección" : "Public Redirect URL"}
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
                  addToast(isSpanish ? "Copiado" : "Copied", 2000);
                } catch {
                  haptics.error();
                  addToast(
                    isSpanish
                      ? "No se pudo acceder al portapapeles"
                      : "Couldn't reach the clipboard",
                    3000,
                  );
                }
              }}
              class="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-white hover:bg-amber-200 text-black rounded-full border-2 border-black font-black text-xs shadow-chunky transition-all active:scale-95"
            >
              {isSpanish ? "📋 Copiar link" : "📋 Copy Link"}
            </button>
            <button
              type="button"
              onClick={handleDownloadSticker}
              class="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-qr-pop hover:bg-qr-popDeep text-white rounded-full border-2 border-black font-black text-xs shadow-chunky transition-all active:scale-95"
            >
              {isSpanish ? "Descargar PNG" : "Download PNG"}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              class="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-white hover:bg-amber-200 text-black rounded-full border-2 border-black font-black text-xs shadow-chunky transition-all active:scale-95"
            >
              {isSpanish ? "Descargar SVG" : "Download SVG"}
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
            customStyle={customStyle}
            logoUrl={logoUrl}
            triggerDownload={triggerDownload}
            frameConfig={frameConfig}
            listenForExportEvents
            hideExportPill
          />
        </div>
      </div>
    </section>
  );
}

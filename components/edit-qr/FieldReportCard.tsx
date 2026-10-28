import { useEffect, useState } from "preact/hooks";
import { QRData } from "../../hooks/useQRData.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { haptics } from "../../utils/haptics.ts";
import { getOrCreatePassport } from "../../utils/passport.ts";
import { getSupporterPass } from "../../utils/supporter-pass.ts";
import {
  openPricingModal,
  pricingModalOpen,
} from "../../islands/PricingModal.tsx";

interface AnalyticsDashboardProps {
  analytics: QRData["analytics"];
  totalVisits?: number;
  shortCode?: string;
  lang?: Locale;
}

export interface FormattedVisitTime {
  relative: string;
  localDateTime: string | null;
}

export interface DayActivityBar {
  index: number;
  count: number;
  dayInitial: string;
  dayShort: string;
  dateShort: string;
  heightPx: number;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_SHORTS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour12(hour24: number): string {
  const normalized = ((Math.floor(hour24) % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "pm" : "am";
  const twelve = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${twelve}${suffix}`;
}

export function findPeakHourWindow(hours?: number[]): string | null {
  if (!hours || hours.length === 0) return null;
  const normalized = Array.from(
    { length: 24 },
    (_, i) => Math.max(0, Number(hours[i] ?? 0)),
  );
  const total = normalized.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return null;

  let bestStart = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const windowSum = normalized[h] + normalized[(h + 1) % 24];
    if (windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = h;
    }
  }

  return `${formatHour12(bestStart)}–${formatHour12((bestStart + 2) % 24)}`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvRow(cells: Array<string | number>): string {
  return cells.map(escapeCsvCell).join(",");
}

export function buildAnalyticsCsv(
  shortCode: string,
  analytics: NonNullable<QRData["analytics"]>,
  nowMs = Date.now(),
): string {
  const code = shortCode.trim() || "qr";
  const use30d = Array.isArray(analytics.sparkline_30d) &&
    analytics.sparkline_30d.length > 0;
  const series = use30d
    ? analytics.sparkline_30d!
    : (analytics.sparkline ?? []);
  const length = use30d ? series.length : Math.max(7, series.length);
  const normalizedSeries = Array.from(
    { length },
    (_, i) => Math.max(0, Number(series[i] ?? 0)),
  );

  const rows: string[] = [
    formatCsvRow(["short_code", "category", "label", "value"]),
  ];

  normalizedSeries.forEach((count, index) => {
    const daysAgo = length - 1 - index;
    const isoDate = new Date(nowMs - daysAgo * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(formatCsvRow([code, "daily", isoDate, count]));
  });

  if (typeof analytics.total_30d === "number") {
    rows.push(
      formatCsvRow([code, "summary", "total_30d", analytics.total_30d]),
    );
  }
  if (typeof analytics.total_90d === "number") {
    rows.push(
      formatCsvRow([code, "summary", "total_90d", analytics.total_90d]),
    );
  }
  const peakWindow = findPeakHourWindow(analytics.hours);
  if (peakWindow) {
    rows.push(formatCsvRow([code, "summary", "peak_rush_hour", peakWindow]));
  }

  const devices = analytics.devices ?? {
    ios: 0,
    android: 0,
    desktop: 0,
    other: 0,
  };
  rows.push(formatCsvRow([code, "device", "ios", devices.ios ?? 0]));
  rows.push(formatCsvRow([code, "device", "android", devices.android ?? 0]));
  rows.push(formatCsvRow([code, "device", "desktop", devices.desktop ?? 0]));
  rows.push(formatCsvRow([code, "device", "other", devices.other ?? 0]));

  for (const city of analytics.top_cities ?? []) {
    rows.push(formatCsvRow([code, "city", city.name, city.count]));
  }
  for (const country of analytics.top_countries ?? []) {
    rows.push(formatCsvRow([code, "country", country.code, country.count]));
  }
  if (analytics.browsers) {
    for (const [browser, count] of Object.entries(analytics.browsers)) {
      rows.push(formatCsvRow([code, "browser", browser, count]));
    }
  }

  return rows.join("\r\n");
}

export function formatRelativeVisit(
  isoString: string | null | undefined,
  nowMs = Date.now(),
): FormattedVisitTime {
  if (!isoString) {
    return { relative: "None recorded", localDateTime: null };
  }
  const date = new Date(isoString);
  const timeMs = date.getTime();
  if (!Number.isFinite(timeMs)) {
    return { relative: "None recorded", localDateTime: null };
  }

  const diffMs = Math.max(0, nowMs - timeMs);
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  let relative: string;
  if (diffMinutes < 1) {
    relative = "Just now";
  } else if (diffMinutes < 60) {
    relative = `${diffMinutes} ${diffMinutes === 1 ? "min" : "mins"} ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 30) {
    relative = `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    const months = Math.max(1, Math.floor(diffDays / 30));
    relative = `${months} ${months === 1 ? "month" : "months"} ago`;
  }

  const localDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const localTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    relative,
    localDateTime: `${localDate} · ${localTime}`,
  };
}

function buildActivityBars(
  series: number[] | undefined,
  days: number,
  nowMs: number,
): DayActivityBar[] {
  const normalized = Array.from(
    { length: days },
    (_, i) => Math.max(0, Number(series?.[i] ?? 0) || 0),
  );
  const peak = Math.max(1, ...normalized);

  return normalized.map((count, index) => {
    const daysAgo = (days - 1) - index;
    const dayDate = new Date(nowMs - daysAgo * 86_400_000);
    const dow = dayDate.getDay();
    const dateShort = dayDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const heightPx = count === 0
      ? 6
      : Math.max(12, Math.round((count / peak) * 56));

    return {
      index,
      count,
      dayInitial: DAY_INITIALS[dow],
      dayShort: DAY_SHORTS[dow],
      dateShort,
      heightPx,
    };
  });
}

export function buildSevenDayActivity(
  sparkline: number[] | undefined,
  nowMs = Date.now(),
): DayActivityBar[] {
  return buildActivityBars(sparkline, 7, nowMs);
}

function buildThirtyDayActivity(
  sparkline30d: number[] | undefined,
  fallback7d: number[] | undefined,
  nowMs = Date.now(),
): DayActivityBar[] {
  const source = Array.isArray(sparkline30d) && sparkline30d.length === 30
    ? sparkline30d
    : [
      ...new Array(23).fill(0),
      ...Array.from(
        { length: 7 },
        (_, i) => Number(fallback7d?.[i] ?? 0) || 0,
      ),
    ];
  return buildActivityBars(source, 30, nowMs);
}

function checkHasPassport(): boolean {
  if (typeof localStorage === "undefined") return false;
  return getSupporterPass() !== null || getOrCreatePassport().tier !== "free";
}

function formatBrowserSplit(browsers?: Record<string, number>): string {
  if (!browsers) return "Safari · Chrome · Firefox";
  const labelMap: Record<string, string> = {
    safari: "Safari",
    chrome: "Chrome",
    firefox: "Firefox",
    edge: "Edge",
    other: "Other",
  };
  const active = Object.entries(browsers)
    .map(([key, count]) => ({
      label: labelMap[key.toLowerCase()] ?? key,
      count: Math.max(0, Number(count) || 0),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  if (active.length === 0) {
    return "Safari · Chrome · Firefox";
  }
  return active
    .slice(0, 3)
    .map((entry) => `${entry.label} (${entry.count})`)
    .join(" · ");
}

export default function AnalyticsDashboard(
  {
    analytics,
    totalVisits,
    shortCode = "qr",
    lang,
  }: AnalyticsDashboardProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [hasPass, setHasPass] = useState(false);
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const isModalOpen = pricingModalOpen.value;

  useEffect(() => {
    const syncPass = () => setHasPass(checkHasPassport());
    syncPass();
    globalThis.addEventListener("qrb-passport-changed", syncPass);
    globalThis.addEventListener("qrb-passport-synced", syncPass);
    return () => {
      globalThis.removeEventListener("qrb-passport-changed", syncPass);
      globalThis.removeEventListener("qrb-passport-synced", syncPass);
    };
  }, [isModalOpen]);

  if (!analytics) return null;

  if (analytics.available === false) {
    return (
      <section
        class="bg-white border-4 border-black rounded-3xl p-4 sm:p-6 shadow-chunky"
        role="status"
        aria-label="Analytics status"
      >
        <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
          Analytics
        </h2>
        <p class="mt-2 text-sm font-bold text-neutral-700">
          Stats are temporarily unavailable. Reload to retry; your QR settings
          still work.
        </p>
      </section>
    );
  }

  const bars7 = buildSevenDayActivity(analytics.sparkline);
  const bars30 = buildThirtyDayActivity(
    analytics.sparkline_30d,
    analytics.sparkline,
  );
  const activeBars = windowDays === 30 && hasPass ? bars30 : bars7;
  const weekTotal = bars7.reduce((sum, b) => sum + b.count, 0);
  const monthTotal = typeof analytics.total_30d === "number"
    ? analytics.total_30d
    : bars30.reduce((sum, b) => sum + b.count, 0);
  const activeTotal = windowDays === 30 && hasPass ? monthTotal : weekTotal;
  const lastVisit = formatRelativeVisit(analytics.last_scan);
  const summaryText = bars7
    .map((b) =>
      `${b.dayShort} (${b.dateShort}): ${b.count} ${
        b.count === 1 ? "visit" : "visits"
      }`
    )
    .join(", ");

  const peakWindow = findPeakHourWindow(analytics.hours);
  const hours24 = Array.from(
    { length: 24 },
    (_, i) => Math.max(0, Number(analytics.hours?.[i] ?? 0)),
  );
  const maxHourCount = Math.max(1, ...hours24);
  const topCities = analytics.top_cities ?? [];
  const topCountries = analytics.top_countries ?? [];
  const browserSummary = formatBrowserSplit(analytics.browsers);

  const handleSelect30Days = () => {
    haptics.light();
    if (!hasPass) {
      openPricingModal();
      return;
    }
    setWindowDays(30);
  };

  const handleExportCsv = () => {
    const csv = buildAnalyticsCsv(shortCode, analytics);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrbuddy-${shortCode}-stats.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    haptics.success();
  };

  return (
    <section
      class="bg-white border-4 border-black rounded-3xl p-4 sm:p-6 space-y-4 shadow-chunky"
      aria-label={windowDays === 30 && hasPass
        ? "30-Day Analytics"
        : "7-Day Analytics"}
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
            Analytics
          </h2>
          <span class="text-xs font-black bg-amber-200 text-black border-2 border-black px-3 py-1 rounded-full">
            Last {windowDays === 30 && hasPass ? "30" : "7"} Days ·{" "}
            {activeTotal} {activeTotal === 1 ? "visit" : "visits"}
          </span>
        </div>

        {/* 7 Days / 30 Days Toggle */}
        <div
          class="inline-flex items-center rounded-full bg-amber-50 p-1 border-2 border-black"
          role="group"
          aria-label="Analytics range"
        >
          <button
            type="button"
            aria-pressed={windowDays === 7 || !hasPass}
            onClick={() => {
              haptics.light();
              setWindowDays(7);
            }}
            class={`min-h-[44px] px-3 rounded-full text-xs font-black transition-all ${
              windowDays === 7 || !hasPass
                ? "bg-black text-white"
                : "text-neutral-700 hover:bg-amber-100"
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            aria-pressed={windowDays === 30 && hasPass}
            onClick={handleSelect30Days}
            class={`min-h-[44px] px-3 rounded-full text-xs font-black transition-all ${
              windowDays === 30 && hasPass
                ? "bg-black text-white"
                : "text-neutral-700 hover:bg-amber-100"
            }`}
          >
            30 Days{!hasPass ? " 🛂" : ""}
          </button>
        </div>
      </div>

      {/* Screen-reader full breakdown */}
      <p class="sr-only">
        Last {windowDays === 30 && hasPass ? "30" : "7"} days total:{" "}
        {activeTotal} recorded visits. Daily breakdown:{" "}
        {summaryText}. Last recorded visit: {lastVisit.relative}
        {lastVisit.localDateTime ? ` (${lastVisit.localDateTime})` : ""}.
      </p>

      {/* Activity Chart & Last Visit */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Activity Bar Chart */}
        <div class="sm:col-span-2 bg-qr-cream rounded-2xl p-3.5 border-2 border-black flex flex-col justify-between min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p class="text-xs text-black font-black uppercase tracking-wider">
              {windowDays === 30 && hasPass
                ? "30-Day Activity"
                : "7-Day Activity"}
            </p>
            <span class="text-[11px] font-bold text-neutral-600">
              Hover or tap bars for counts
            </span>
          </div>

          {windowDays === 30 && hasPass
            ? (
              <div
                class="flex items-end justify-between gap-[2px] pt-4 pb-1 h-20"
                role="group"
                aria-label={`Last 30 days: ${monthTotal} recorded visits`}
              >
                {activeBars.map((bar) => (
                  <div
                    key={bar.index}
                    tabIndex={0}
                    role="img"
                    title={`${bar.dateShort}: ${bar.count}`}
                    aria-label={`${bar.dayShort} ${bar.dateShort}: ${bar.count} recorded ${
                      bar.count === 1 ? "visit" : "visits"
                    }`}
                    class="group flex-1 h-14 flex items-end justify-center focus:outline-none"
                  >
                    <div
                      class={`w-full rounded-t-sm border border-black/70 transition-all ${
                        bar.count > 0
                          ? "bg-qr-pop group-hover:bg-amber-300 group-focus-visible:bg-amber-300"
                          : "bg-black/10"
                      }`}
                      style={{ height: `${bar.heightPx}px` }}
                    />
                  </div>
                ))}
              </div>
            )
            : (
              <div
                class="flex items-end justify-between gap-1.5 pt-6 pb-1"
                role="group"
                aria-label={`Last 7 days: ${weekTotal} recorded visits`}
              >
                {bars7.map((bar) => (
                  <div
                    key={bar.index}
                    tabIndex={0}
                    role="img"
                    aria-label={`${bar.dayShort} ${bar.dateShort}: ${bar.count} recorded ${
                      bar.count === 1 ? "visit" : "visits"
                    }`}
                    class="group relative flex-1 flex flex-col items-center gap-1.5 focus:outline-none min-w-0"
                  >
                    {/* Count badge (always subtly legible, high-contrast pill on hover/focus) */}
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black leading-none border border-transparent text-neutral-700 group-hover:bg-amber-200 group-hover:text-black group-hover:border-black group-focus-visible:bg-amber-200 group-focus-visible:text-black group-focus-visible:border-black transition-all">
                      {bar.count}
                    </span>

                    {/* Bar track */}
                    <div class="w-full h-14 flex items-end justify-center">
                      <div
                        class={`w-full max-w-[28px] rounded-t-lg border-2 border-black transition-all ${
                          bar.count > 0
                            ? "bg-qr-pop group-hover:bg-amber-300 group-focus-visible:bg-amber-300"
                            : "bg-black/10"
                        }`}
                        style={{ height: `${bar.heightPx}px` }}
                      />
                    </div>

                    {/* Day-of-week label */}
                    <span
                      class="text-[11px] font-black text-black leading-none"
                      title={`${bar.dayShort}, ${bar.dateShort}`}
                    >
                      {bar.dayInitial}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Last Visit KPI Tile */}
        <div class="bg-qr-cream rounded-2xl p-3.5 border-2 border-black flex flex-col justify-between min-w-0">
          <div>
            <p class="text-xs text-black font-black uppercase tracking-wider">
              Last Visit
            </p>
            <p class="text-lg sm:text-xl font-black text-black mt-1.5 leading-tight">
              {lastVisit.relative}
            </p>
            {lastVisit.localDateTime && (
              <p class="text-xs font-bold text-neutral-700 mt-1">
                {lastVisit.localDateTime}
              </p>
            )}
          </div>
          {typeof totalVisits === "number" && (
            <p class="mt-3 pt-2 border-t border-black/15 text-xs font-black text-neutral-700">
              All-time total: <span class="font-mono">{totalVisits}</span>
            </p>
          )}
        </div>
      </div>

      {/* Device Breakdown Pills */}
      <div class="flex flex-wrap items-center gap-2 text-xs font-black text-black">
        <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
          📱 iOS: {analytics.devices?.ios ?? 0}
        </span>
        <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
          🤖 Android: {analytics.devices?.android ?? 0}
        </span>
        <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
          💻 Desktop: {analytics.devices?.desktop ?? 0}
        </span>
        {(analytics.devices?.other ?? 0) > 0 && (
          <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
            🌐 Other: {analytics.devices?.other ?? 0}
          </span>
        )}
      </div>

      {/* Passport Field Report */}
      {hasPass
        ? (
          <div class="bg-qr-cream border-2 border-black rounded-2xl p-3.5 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-black bg-amber-200 text-[11px] font-black uppercase tracking-wide text-black shadow-sm">
                🛂 PASSPORT FIELD REPORT
              </span>
              {typeof analytics.total_90d === "number" && (
                <span class="text-xs font-black text-neutral-700">
                  90-day scans:{" "}
                  <span class="font-mono">{analytics.total_90d}</span>
                </span>
              )}
            </div>

            {/* 🌍 Top Cities & Countries */}
            <div class="space-y-1.5">
              <p class="text-xs font-black uppercase tracking-wider text-black">
                🌍 Top Cities & Countries
              </p>
              {topCities.length === 0 && topCountries.length === 0
                ? (
                  <p class="text-xs font-bold text-neutral-600">
                    Collecting city stamps as scans arrive…
                  </p>
                )
                : (
                  <div class="flex flex-wrap gap-1.5">
                    {topCities.map((city) => (
                      <span
                        key={`city-${city.name}`}
                        class="bg-white border-2 border-black px-2.5 py-1 rounded-full text-xs font-black text-black"
                      >
                        📍 {city.name} · {city.count}
                      </span>
                    ))}
                    {topCountries.map((country) => (
                      <span
                        key={`country-${country.code}`}
                        class="bg-amber-100 border-2 border-black px-2.5 py-1 rounded-full text-xs font-black text-black"
                      >
                        🏳️ {country.code} · {country.count}
                      </span>
                    ))}
                  </div>
                )}
            </div>

            {/* ⏰ Peak Rush Hour & 🌐 Browser Split */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div class="bg-white border-2 border-black rounded-xl p-2.5 space-y-1.5 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-black uppercase tracking-wider text-neutral-700">
                    ⏰ Peak Rush Hour
                  </span>
                  <span class="text-xs font-black text-black">
                    {peakWindow ?? "—"}
                  </span>
                </div>
                <div
                  class="flex items-end gap-[2px] h-6"
                  aria-label="24-hour scan distribution"
                >
                  {hours24.map((count, h) => (
                    <span
                      key={h}
                      title={`${formatHour12(h)}: ${count}`}
                      class={`flex-1 rounded-sm ${
                        count > 0 ? "bg-qr-pop" : "bg-black/15"
                      }`}
                      style={{
                        height: `${
                          count > 0
                            ? Math.max(
                              20,
                              Math.round((count / maxHourCount) * 100),
                            )
                            : 12
                        }%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div class="bg-white border-2 border-black rounded-xl p-2.5 flex flex-col justify-between min-w-0">
                <span class="text-[11px] font-black uppercase tracking-wider text-neutral-700">
                  🌐 Browser Split
                </span>
                <p class="mt-1 text-xs font-black text-black break-words">
                  {browserSummary}
                </p>
              </div>
            </div>

            {/* 📥 Export CSV */}
            <div class="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleExportCsv}
                class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border-2 border-black bg-white hover:bg-amber-200 text-xs font-black text-black shadow-chunky transition-all hover:scale-105 active:scale-95"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        )
        : (
          <div class="pt-1">
            <button
              type="button"
              onClick={() => {
                haptics.light();
                openPricingModal();
              }}
              class="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl border-2 border-black bg-amber-100 hover:bg-amber-200 text-black text-xs font-black text-left sm:text-center leading-snug shadow-chunky transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSpanish
                ? "🛂 Desbloquea historial de 90 días, ciudades top, hora pico y ranking completo con el Pasaporte QRBuddy →"
                : "🛂 Unlock 30/90-day history, top cities, rush hour & CSV export →"}
            </button>
          </div>
        )}

      <p class="text-xs font-semibold text-neutral-600">
        Visits include direct link opens and your own scans. Activity and
        devices cover 7 days; the last visit uses retained logs (up to 90 days).
      </p>
    </section>
  );
}

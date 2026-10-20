import { QRData } from "../../hooks/useQRData.ts";

interface AnalyticsDashboardProps {
  analytics: QRData["analytics"];
  totalVisits?: number;
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

export function buildSevenDayActivity(
  sparkline: number[],
  nowMs = Date.now(),
): DayActivityBar[] {
  const normalized = Array.from(
    { length: 7 },
    (_, i) => Math.max(0, Number(sparkline[i] ?? 0)),
  );
  const peak = Math.max(1, ...normalized);

  return normalized.map((count, index) => {
    const daysAgo = 6 - index;
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

export default function AnalyticsDashboard(
  { analytics, totalVisits }: AnalyticsDashboardProps,
) {
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

  const bars = buildSevenDayActivity(analytics.sparkline);
  const weekTotal = bars.reduce((sum, b) => sum + b.count, 0);
  const lastVisit = formatRelativeVisit(analytics.last_scan);
  const summaryText = bars
    .map((b) =>
      `${b.dayShort} (${b.dateShort}): ${b.count} ${
        b.count === 1 ? "visit" : "visits"
      }`
    )
    .join(", ");

  return (
    <section
      class="bg-white border-4 border-black rounded-3xl p-4 sm:p-6 space-y-4 shadow-chunky"
      aria-label="7-Day Analytics"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
          Analytics
        </h2>
        <span class="text-xs font-black bg-amber-200 text-black border-2 border-black px-3 py-1 rounded-full">
          Last 7 Days · {weekTotal} {weekTotal === 1 ? "visit" : "visits"}
        </span>
      </div>

      {/* Screen-reader full breakdown */}
      <p class="sr-only">
        Last 7 days total: {weekTotal} recorded visits. Daily breakdown:{" "}
        {summaryText}. Last recorded visit: {lastVisit.relative}
        {lastVisit.localDateTime ? ` (${lastVisit.localDateTime})` : ""}.
      </p>

      {/* Activity Chart & Last Visit */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 7-Day Activity Bar Chart */}
        <div class="sm:col-span-2 bg-qr-cream rounded-2xl p-3.5 border-2 border-black flex flex-col justify-between">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-xs text-black font-black uppercase tracking-wider">
              7-Day Activity
            </p>
            <span class="text-[11px] font-bold text-neutral-600">
              Hover or tap bars for counts
            </span>
          </div>

          <div
            class="flex items-end justify-between gap-1.5 pt-6 pb-1"
            role="group"
            aria-label={`Last 7 days: ${weekTotal} recorded visits`}
          >
            {bars.map((bar) => (
              <div
                key={bar.index}
                tabIndex={0}
                role="img"
                aria-label={`${bar.dayShort} ${bar.dateShort}: ${bar.count} recorded ${
                  bar.count === 1 ? "visit" : "visits"
                }`}
                class="group relative flex-1 flex flex-col items-center gap-1.5 focus:outline-none"
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
        </div>

        {/* Last Visit KPI Tile */}
        <div class="bg-qr-cream rounded-2xl p-3.5 border-2 border-black flex flex-col justify-between">
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
          📱 iOS: {analytics.devices.ios}
        </span>
        <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
          🤖 Android: {analytics.devices.android}
        </span>
        <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
          💻 Desktop: {analytics.devices.desktop}
        </span>
        {analytics.devices.other > 0 && (
          <span class="bg-qr-cream border-2 border-black px-3 py-1.5 rounded-full">
            🌐 Other: {analytics.devices.other}
          </span>
        )}
      </div>

      <p class="text-xs font-semibold text-neutral-600">
        Visits include direct link opens and your own scans. Activity and
        devices cover 7 days; the last visit uses retained logs (up to 90 days).
      </p>
    </section>
  );
}

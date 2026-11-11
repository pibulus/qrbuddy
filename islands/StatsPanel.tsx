// Stats island — the month-two screen: what did the shelf do, and which code
// is carrying the load.
//
// No chart library: bars are divs, because a hundred kilobytes of chart
// JS to draw thirty rectangles is the sort of thing a business pays for
// twice (bundle size, then load time on a warehouse phone).

import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../utils/api-request.ts";
import { getApiUrl } from "../utils/api.ts";
import { getStoredPassport } from "../utils/passport.ts";

interface DayPoint {
  day: string;
  scans: number;
}

interface LibraryStats {
  days: number;
  total_scans: number;
  codes_tracked: number;
  last_scan: string | null;
  series: DayPoint[];
  top_codes: { short_code: string; label: string; scans: number }[];
  devices: { ios: number; android: number; desktop: number; other: number };
  countries: { country: string; scans: number }[];
}

const WINDOWS = [7, 30, 90];

export default function StatsPanel() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasPassport, setHasPassport] = useState(false);

  useEffect(() => {
    setHasPassport(Boolean(getStoredPassport()));
  }, []);

  useEffect(() => {
    if (!hasPassport) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest<LibraryStats & { success: boolean }>(
      `${getApiUrl()}/library-stats?days=${days}`,
      { method: "GET", useUserAuth: true },
      "Could not load stats",
    )
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError("");
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not load stats",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, hasPassport]);

  const peak = Math.max(
    1,
    ...(stats?.series ?? []).map((point) => point.scans),
  );
  const deviceTotal = stats
    ? stats.devices.ios + stats.devices.android + stats.devices.desktop +
      stats.devices.other
    : 0;

  function exportSeriesCsv() {
    if (!stats) return;
    const rows = [
      "day,scans",
      ...stats.series.map((point) => `${point.day},${point.scans}`),
      "",
      "short_code,label,scans",
      ...stats.top_codes.map((code) =>
        `${code.short_code},"${code.label.replaceAll('"', '""')}",${code.scans}`
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qrbuddy-stats-${stats.days}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!hasPassport) {
    return (
      <section class="rounded-3xl border-2 border-stone-900 bg-[#fffef7] p-6">
        <h2 class="text-lg font-black">No Passport yet</h2>
        <p class="mt-2 text-sm text-stone-600">
          Create an editable code first. A Passport pairs automatically, and
          scan activity fills in here over time.
        </p>
      </section>
    );
  }

  return (
    <section class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        {WINDOWS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setDays(value)}
            aria-pressed={days === value}
            class={`rounded-full border-2 border-stone-900 px-4 py-2 text-xs font-black transition ${
              days === value
                ? "bg-amber-300 shadow-[3px_3px_0_#1e1714]"
                : "bg-white hover:bg-stone-100"
            }`}
          >
            {value} days
          </button>
        ))}
        <button
          type="button"
          onClick={exportSeriesCsv}
          disabled={!stats}
          class="ml-auto rounded-full border-2 border-stone-900 bg-white px-4 py-2 text-xs font-black disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {error && <p class="text-xs font-bold text-pink-700">{error}</p>}
      {loading && <p class="text-sm text-stone-500">Reading the shelf…</p>}

      {stats && !loading && (
        <>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Scans", String(stats.total_scans)],
              ["Codes", String(stats.codes_tracked)],
              [
                "Last scan",
                stats.last_scan
                  ? new Date(stats.last_scan).toLocaleDateString()
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4"
              >
                <p class="text-[11px] font-black uppercase tracking-wider text-stone-500">
                  {label}
                </p>
                <p class="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <div class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
            <p class="text-[11px] font-black uppercase tracking-wider text-stone-500">
              Per day
            </p>
            <div
              class="mt-3 flex h-24 items-end gap-[2px]"
              role="img"
              aria-label={`Scans per day over the last ${stats.days} days`}
            >
              {stats.series.map((point) => (
                <div
                  key={point.day}
                  title={`${point.day}: ${point.scans}`}
                  class="flex-1 rounded-t bg-pink-400"
                  style={{
                    height: `${Math.max(2, (point.scans / peak) * 100)}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
              <p class="text-[11px] font-black uppercase tracking-wider text-stone-500">
                Busiest codes
              </p>
              <ul class="mt-2 space-y-1.5 text-sm">
                {stats.top_codes.length === 0 && (
                  <li class="text-stone-500">No codes yet.</li>
                )}
                {stats.top_codes.map((code) => (
                  <li key={code.short_code} class="flex justify-between gap-3">
                    <span class="min-w-0 truncate">{code.label}</span>
                    <span class="shrink-0 font-black">{code.scans}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
              <p class="text-[11px] font-black uppercase tracking-wider text-stone-500">
                Devices
              </p>
              <ul class="mt-2 space-y-2 text-sm">
                {(["ios", "android", "desktop", "other"] as const).map(
                  (key) => {
                    const share = deviceTotal
                      ? stats.devices[key] / deviceTotal
                      : 0;
                    return (
                      <li key={key}>
                        <div class="flex justify-between text-xs">
                          <span>{key}</span>
                          <span class="font-black">{stats.devices[key]}</span>
                        </div>
                        <div class="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
                          <div
                            class="h-full rounded-full bg-emerald-400"
                            style={{ width: `${Math.round(share * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>
          </div>

          {stats.countries.length > 0 && (
            <div class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
              <p class="text-[11px] font-black uppercase tracking-wider text-stone-500">
                Where
              </p>
              <ul class="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                {stats.countries.map((country) => (
                  <li
                    key={country.country}
                    class="rounded-full border-2 border-stone-300 px-2.5 py-1"
                  >
                    {country.country} {country.scans}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

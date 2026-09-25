/**
 * share-stats.ts — turn tallies into the trading card.
 *
 * The server hands the owner two things: lifetime `stats` (one JSONB of
 * tallies) and a `ledger` (one row per day, 90 days). This folds either into
 * the same shape and writes the lines a person actually wants to read:
 * "47 scans · 31 people · 6 came back", "Busiest Fri 6–8pm", "Track 3 is
 * the hit". Numbers only ever come from tallies — nothing per-visitor.
 */

export interface LedgerRow {
  day: string;
  views: number;
  people: number;
  returns: number;
  countries: Record<string, number>;
  cities: Record<string, number>;
  devices: Record<string, number>;
  hours: number[];
  items: Record<string, number>;
  dwell_s: number;
  dwell_n: number;
  completions: number;
  shares: number;
  downloads: number;
  referred: number;
  languages?: Record<string, number>;
  apps?: Record<string, number>;
  farthest_km?: number;
  farthest_place?: string | null;
}

export interface LifetimeStats {
  views?: number;
  referred?: number;
  countries?: Record<string, number>;
  cities?: Record<string, number>;
  devices?: Record<string, number>;
  os?: Record<string, number>;
  languages?: Record<string, number>;
  apps?: Record<string, number>;
  farthest_km?: number;
  farthest_place?: string | null;
  hours?: Record<string, number>;
  days?: Record<string, number>;
  items?: Record<string, number>;
  dwell_s?: number;
  dwell_n?: number;
  completions?: number;
  shares?: number;
  downloads?: number;
}

export type StatsRange = "today" | "week" | "all";

export interface StatsCard {
  range: StatsRange;
  views: number;
  /** null when not honestly knowable (lifetime). */
  people: number | null;
  returns: number | null;
  scans: number; // views that arrived with no referrer
  shared: number; // views that arrived via a link
  topPlace: string | null;
  countries: number;
  busiest: string | null;
  phoneShare: number | null; // 0..1
  topItem: { id: string; plays: number } | null;
  avgDwellSeconds: number | null;
  completionRate: number | null; // 0..1
  shares: number;
  downloads: number;
  /** Daily views for a sparkline, oldest → newest (week: 7, all: up to 90). */
  spark: number[];
  /** Week over previous week, as a ratio delta (0.4 = +40%). null if no base. */
  trend: number | null;
  /** Which app carried the link, top one + share of referred views. */
  topApp: { name: string; share: number } | null;
  languages: number;
  topLang: string | null;
  farthest: { km: number; place: string } | null;
  /** Share of views after 9pm / before 6am local-ish (UTC-shifted). */
  nightShare: number | null;
  weekendShare: number | null;
  /** iOS share of views with a known OS (lifetime only). */
  iosShare: number | null;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function top(map: Record<string, number> | undefined): [string, number] | null {
  if (!map) return null;
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(map)) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best;
}

function sumMaps(
  rows: Record<string, number>[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r ?? {})) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoUtc(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** Label a peak: hour bucket → "Fri 6–8pm" style (2-hour band, UTC → local
 * offset applied by the browser). */
function busiestLabel(
  hours: number[],
  dayOfWeek: string | null,
): string | null {
  const total = hours.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  // Best 2-hour window.
  let bestStart = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const s = hours[h] + hours[(h + 1) % 24];
    if (s > bestSum) {
      bestSum = s;
      bestStart = h;
    }
  }
  // Shift UTC hour to the viewer's local clock.
  const offset = -new Date().getTimezoneOffset() / 60;
  const local = (h: number) => (((h + offset) % 24) + 24) % 24;
  const fmt = (h: number) => {
    const l = Math.round(local(h));
    const suffix = l >= 12 ? "pm" : "am";
    const twelve = l % 12 === 0 ? 12 : l % 12;
    return `${twelve}${suffix}`;
  };
  const band = `${fmt(bestStart)}–${fmt(bestStart + 2)}`;
  return dayOfWeek ? `${dayOfWeek} ${band}` : band;
}

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  tr: "Turkish",
  nl: "Dutch",
  ru: "Russian",
  pl: "Polish",
  sv: "Swedish",
  el: "Greek",
};

function nightShareOf(hours: number[]): number | null {
  const total = hours.reduce((a, b) => a + b, 0);
  if (total < 3) return null;
  const offset = -new Date().getTimezoneOffset() / 60;
  let night = 0;
  hours.forEach((v, h) => {
    const local = (((h + offset) % 24) + 24) % 24;
    if (local >= 21 || local < 6) night += v;
  });
  return night / total;
}

function weekendShareOf(dow: Record<string, number>): number | null {
  const total = Object.values(dow).reduce((a, b) => a + b, 0);
  if (total < 3) return null;
  return ((dow.Sat ?? 0) + (dow.Sun ?? 0)) / total;
}

function appOf(
  apps: Record<string, number>,
  referred: number,
): StatsCard["topApp"] {
  const t = top(apps);
  if (!t || referred === 0) return null;
  return { name: t[0], share: t[1] / referred };
}

function cardFromRows(range: StatsRange, rows: LedgerRow[]): StatsCard {
  const views = rows.reduce((a, r) => a + (r.views ?? 0), 0);
  const people = rows.reduce((a, r) => a + (r.people ?? 0), 0);
  const returns = rows.reduce((a, r) => a + (r.returns ?? 0), 0);
  const referred = rows.reduce((a, r) => a + (r.referred ?? 0), 0);
  const hours = new Array(24).fill(0);
  for (const r of rows) (r.hours ?? []).forEach((v, i) => hours[i] += v ?? 0);
  const dowTally: Record<string, number> = {};
  for (const r of rows) {
    const d = DOW[new Date(r.day + "T00:00:00Z").getUTCDay()];
    dowTally[d] = (dowTally[d] ?? 0) + (r.views ?? 0);
  }
  const countries = sumMaps(rows.map((r) => r.countries));
  const cities = sumMaps(rows.map((r) => r.cities));
  const devices = sumMaps(rows.map((r) => r.devices));
  const items = sumMaps(rows.map((r) => r.items));
  const languages = sumMaps(rows.map((r) => r.languages ?? {}));
  const apps = sumMaps(rows.map((r) => r.apps ?? {}));
  let farthest: StatsCard["farthest"] = null;
  for (const r of rows) {
    if ((r.farthest_km ?? 0) > (farthest?.km ?? 0) && r.farthest_place) {
      farthest = { km: r.farthest_km!, place: r.farthest_place };
    }
  }
  const dwellS = rows.reduce((a, r) => a + (r.dwell_s ?? 0), 0);
  const dwellN = rows.reduce((a, r) => a + (r.dwell_n ?? 0), 0);
  const completions = rows.reduce((a, r) => a + (r.completions ?? 0), 0);
  const topCity = top(cities);
  const topCountry = top(countries);
  const topItem = top(items);
  const phones = (devices.mobile ?? 0) + (devices.tablet ?? 0);
  const deviceTotal = Object.values(devices).reduce((a, b) => a + b, 0);

  return {
    range,
    views,
    people: range === "all" ? null : people,
    returns: range === "all" ? null : returns,
    scans: views - referred,
    shared: referred,
    topPlace: topCity?.[0] ?? topCountry?.[0] ?? null,
    countries: Object.keys(countries).length,
    busiest: busiestLabel(
      hours,
      range === "today" ? null : top(dowTally)?.[0] ?? null,
    ),
    phoneShare: deviceTotal > 0 ? phones / deviceTotal : null,
    topItem: topItem ? { id: topItem[0], plays: topItem[1] } : null,
    avgDwellSeconds: dwellN > 0 ? Math.round(dwellS / dwellN) : null,
    completionRate: views > 0 ? Math.min(completions / views, 1) : null,
    shares: rows.reduce((a, r) => a + (r.shares ?? 0), 0),
    downloads: rows.reduce((a, r) => a + (r.downloads ?? 0), 0),
    spark: rows.map((r) => r.views ?? 0),
    trend: null,
    topApp: appOf(apps, referred),
    languages: Object.keys(languages).length,
    topLang: top(languages)?.[0] ?? null,
    farthest,
    nightShare: nightShareOf(hours),
    weekendShare: range === "week" ? weekendShareOf(dowTally) : null,
    iosShare: null,
  };
}

/** Build the three cards. Lifetime uses the stats JSONB (so it survives the
 * 90-day ledger prune); today/week come from the ledger. */
export function buildCards(
  lifetime: LifetimeStats,
  ledger: LedgerRow[],
): Record<StatsRange, StatsCard> {
  const byDay = new Map(ledger.map((r) => [r.day, r]));
  const today = todayUtc();
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgoUtc(6 - i));
  const prev7 = Array.from({ length: 7 }, (_, i) => daysAgoUtc(13 - i));
  const rowOrBlank = (d: string): LedgerRow =>
    byDay.get(d) ?? {
      day: d,
      views: 0,
      people: 0,
      returns: 0,
      countries: {},
      cities: {},
      devices: {},
      hours: [],
      items: {},
      dwell_s: 0,
      dwell_n: 0,
      completions: 0,
      shares: 0,
      downloads: 0,
      referred: 0,
    };

  const todayCard = cardFromRows("today", [rowOrBlank(today)]);
  const weekRows = last7.map(rowOrBlank);
  const weekCard = cardFromRows("week", weekRows);
  const prevViews = prev7.map(rowOrBlank).reduce((a, r) => a + r.views, 0);
  weekCard.trend = prevViews > 0
    ? (weekCard.views - prevViews) / prevViews
    : null;

  // Lifetime: tallies from the share row; sparkline from whatever ledger
  // survives (up to 90 days).
  const hours = new Array(24).fill(0);
  for (const [h, v] of Object.entries(lifetime.hours ?? {})) {
    hours[Number(h)] = v;
  }
  const dowTally: Record<string, number> = {};
  for (const [d, v] of Object.entries(lifetime.days ?? {})) {
    dowTally[DOW[Number(d)]] = v;
  }
  const devices = lifetime.devices ?? {};
  const phones = (devices.mobile ?? 0) + (devices.tablet ?? 0);
  const deviceTotal = Object.values(devices).reduce((a, b) => a + b, 0);
  const topItem = top(lifetime.items);
  const views = lifetime.views ?? 0;
  const allCard: StatsCard = {
    range: "all",
    views,
    people: null,
    returns: null,
    scans: views - (lifetime.referred ?? 0),
    shared: lifetime.referred ?? 0,
    topPlace: top(lifetime.cities)?.[0] ?? top(lifetime.countries)?.[0] ??
      null,
    countries: Object.keys(lifetime.countries ?? {}).length,
    busiest: busiestLabel(hours, top(dowTally)?.[0] ?? null),
    phoneShare: deviceTotal > 0 ? phones / deviceTotal : null,
    topItem: topItem ? { id: topItem[0], plays: topItem[1] } : null,
    avgDwellSeconds: (lifetime.dwell_n ?? 0) > 0
      ? Math.round((lifetime.dwell_s ?? 0) / (lifetime.dwell_n ?? 1))
      : null,
    completionRate: views > 0
      ? Math.min((lifetime.completions ?? 0) / views, 1)
      : null,
    shares: lifetime.shares ?? 0,
    downloads: lifetime.downloads ?? 0,
    spark: ledger.map((r) => r.views ?? 0),
    trend: null,
    topApp: appOf(lifetime.apps ?? {}, lifetime.referred ?? 0),
    languages: Object.keys(lifetime.languages ?? {}).length,
    topLang: top(lifetime.languages)?.[0] ?? null,
    farthest: (lifetime.farthest_km ?? 0) > 0 && lifetime.farthest_place
      ? { km: lifetime.farthest_km!, place: lifetime.farthest_place }
      : null,
    nightShare: nightShareOf(hours),
    weekendShare: weekendShareOf(dowTally),
    iosShare: (() => {
      const os = lifetime.os ?? {};
      const known = (os.ios ?? 0) + (os.android ?? 0);
      return known >= 3 ? (os.ios ?? 0) / known : null;
    })(),
  };

  return { today: todayCard, week: weekCard, all: allCard };
}

/** The lines on the card, in the voice. Empty when there's nothing to say. */
export function cardLines(
  card: StatsCard,
  itemName: (id: string) => string,
  kind: "slideshow" | "playlist" | "file",
  createdAt?: string,
): string[] {
  const lines: string[] = [];
  if (card.views === 0) return lines;

  const parts = [`${card.views} ${card.views === 1 ? "scan" : "scans"}`];
  if (card.people !== null && card.people > 0) {
    parts.push(`${card.people} ${card.people === 1 ? "person" : "people"}`);
  }
  if (card.returns !== null && card.returns > 0) {
    parts.push(`${card.returns} came back`);
  }
  if (card.trend !== null && Math.abs(card.trend) >= 0.1) {
    parts.push(
      `${card.trend > 0 ? "↑" : "↓"} ${
        Math.round(Math.abs(card.trend) * 100)
      }% vs last week`,
    );
  }
  lines.push(parts.join(" · "));

  if (card.topPlace) {
    lines.push(
      card.countries > 1
        ? `${card.topPlace} mostly · ${card.countries} countries 🌏`
        : `${card.topPlace} mostly`,
    );
  }
  if (card.busiest && card.views >= 3) lines.push(`Busiest ${card.busiest}`);
  if (card.phoneShare !== null && card.views >= 3) {
    lines.push(`${Math.round(card.phoneShare * 100)}% on phones`);
  }
  if (card.topItem && kind !== "file") {
    const verb = kind === "playlist" ? "played" : "looked at";
    lines.push(
      `${
        itemName(card.topItem.id)
      } is the hit · ${verb} ${card.topItem.plays}×`,
    );
  }
  if (card.avgDwellSeconds !== null && card.avgDwellSeconds >= 5) {
    const m = Math.floor(card.avgDwellSeconds / 60);
    const s = card.avgDwellSeconds % 60;
    const stay = m > 0 ? `${m}m ${s}s` : `${s}s`;
    const finish = card.completionRate !== null && kind !== "file"
      ? ` · ${Math.round(card.completionRate * 100)}% ${
        kind === "playlist" ? "hear the whole thing" : "see every photo"
      }`
      : "";
    lines.push(`People stay ~${stay}${finish}`);
  }
  if (card.shares > 0 || card.downloads > 0) {
    const bits = [];
    if (card.shared > 0) bits.push(`${card.shared} via shared links`);
    if (card.shares > 0) bits.push(`shared onward ${card.shares}×`);
    if (card.downloads > 0) bits.push(`downloaded ${card.downloads}×`);
    lines.push(bits.join(" · "));
  } else if (card.shared > 0) {
    lines.push(`${card.scans} from scans · ${card.shared} from links`);
  }

  // The ones people actually enjoy: where it travelled, who carried it,
  // when it lives, which phones. Each only speaks when there's a real read.
  if (card.topApp && card.shared >= 3) {
    lines.push(
      `Travels mostly by ${card.topApp.name} · ${
        Math.round(card.topApp.share * 100)
      }% of shared links`,
    );
  }
  if (card.farthest && card.farthest.km >= 50) {
    const km = card.farthest.km >= 1000
      ? `${(card.farthest.km / 1000).toFixed(1).replace(/\.0$/, "")}k km`
      : `${card.farthest.km} km`;
    lines.push(`Farthest scan: ${card.farthest.place}, ${km} away 🌏`);
  }
  if (card.languages >= 2 && card.topLang) {
    const name = LANG_NAMES[card.topLang] ?? card.topLang.toUpperCase();
    lines.push(`Scanned in ${card.languages} languages · ${name} mostly`);
  }
  if (card.nightShare !== null && card.nightShare >= 0.5) {
    lines.push(
      `A night-time ${kind === "playlist" ? "mixtape" : "thing"} · ${
        Math.round(card.nightShare * 100)
      }% of scans after 9pm 🦉`,
    );
  } else if (card.nightShare !== null && card.nightShare <= 0.1) {
    lines.push("Strictly daytime ☀️");
  }
  if (card.weekendShare !== null && card.weekendShare >= 0.6) {
    lines.push(
      `A weekend thing · ${Math.round(card.weekendShare * 100)}% Sat–Sun`,
    );
  }
  if (card.iosShare !== null) {
    const ios = Math.round(card.iosShare * 100);
    lines.push(`iPhone ${ios}% · Android ${100 - ios}%`);
  }
  if (card.range === "all" && createdAt) {
    const ageDays = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 86400000,
    );
    const milestone = [1000, 500, 100, 50, 10].find((m) => card.views >= m);
    const age = ageDays < 1
      ? "made today"
      : ageDays === 1
      ? "1 day old"
      : ageDays < 60
      ? `${ageDays} days old`
      : `${Math.floor(ageDays / 30)} months old`;
    lines.push(
      milestone ? `${age} · past ${milestone} scans 🎉` : age,
    );
  }
  return lines;
}

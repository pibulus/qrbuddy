// conditions.ts — what the world was like at a scan: weather, temperature,
// time of day (local to the scanner), moon. Weather comes from Open-Meteo
// (free, keyless), cached per ~10 km cell per UTC day in weather_days, with a
// week of backfill so the owner's baseline covers days nobody scanned.
//
// Keys are flat strings so they tally like everything else:
//   wx:rain  temp:hot  slot:morning  moon:full  temp:hot+slot:morning
// The client compares observed keys against the baseline (how often it was
// actually raining where the scanners are) and only speaks on real lift.

// deno-lint-ignore no-explicit-any
type Supabase = any;

type Wx = "clear" | "cloud" | "rain" | "snow" | "storm";
type Temp = "cold" | "mild" | "warm" | "hot";
type Slot = "morning" | "afternoon" | "evening" | "night";
type Hour = [Wx, Temp, Slot];

const FETCH_TIMEOUT_MS = 2000;

export function cellOf(lat: number | null, lon: number | null): string | null {
  if (lat === null || lon === null) return null;
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

function wxOf(code: number): Wx {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code <= 1) return "clear";
  return "cloud"; // 2, 3, fog 45/48
}

function tempOf(c: number): Temp {
  if (c < 12) return "cold";
  if (c < 20) return "mild";
  if (c < 27) return "warm";
  return "hot";
}

function slotOf(localHour: number): Slot {
  if (localHour >= 5 && localHour < 11) return "morning";
  if (localHour >= 11 && localHour < 17) return "afternoon";
  if (localHour >= 17 && localHour < 22) return "evening";
  return "night";
}

/** Moon phase bucket from a timestamp. Pure math, no API. */
export function moonOf(t: Date): "new" | "waxing" | "full" | "waning" {
  const SYNODIC = 29.530588853;
  const REF = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
  const age = (((t.getTime() - REF) / 86400000) % SYNODIC + SYNODIC) %
    SYNODIC;
  if (age < 1.85 || age > 27.68) return "new";
  if (age >= 12.91 && age <= 16.61) return "full";
  return age < 12.91 ? "waxing" : "waning";
}

/** The keys one hour contributes — singles plus the two combos people
 * actually say out loud ("hot mornings", "rainy nights"). */
export function keysOf([wx, temp, slot]: Hour): string[] {
  return [
    `wx:${wx}`,
    `temp:${temp}`,
    `slot:${slot}`,
    `temp:${temp}+slot:${slot}`,
    `wx:${wx}+slot:${slot}`,
  ];
}

/** Fetch 7 days back + today/tomorrow for a cell, store every fully covered
 * UTC day. One outbound call per cell per day at most. */
async function fillCell(
  supabase: Supabase,
  cell: string,
): Promise<void> {
  const [lat, lon] = cell.split(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
    `&longitude=${lon}&hourly=weather_code,temperature_2m` +
    `&timezone=auto&past_days=7&forecast_days=2`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  let data: {
    utc_offset_seconds?: number;
    hourly?: {
      time: string[];
      weather_code: number[];
      temperature_2m: number[];
    };
  };
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return; // slow or down — this scan just goes without weather
  } finally {
    clearTimeout(timer);
  }
  const hourly = data.hourly;
  if (!hourly?.time?.length) return;
  const offsetMs = (data.utc_offset_seconds ?? 0) * 1000;

  // Group local-time hours into UTC days.
  const byDay = new Map<string, (Hour | null)[]>();
  hourly.time.forEach((localIso, i) => {
    const localMs = Date.parse(`${localIso}:00Z`);
    if (!Number.isFinite(localMs)) return;
    const utc = new Date(localMs - offsetMs);
    const day = utc.toISOString().slice(0, 10);
    const hour = utc.getUTCHours();
    const code = hourly.weather_code[i];
    const temp = hourly.temperature_2m[i];
    if (code === null || temp === null) return;
    if (!byDay.has(day)) byDay.set(day, new Array(24).fill(null));
    const localHour = new Date(localMs).getUTCHours();
    byDay.get(day)![hour] = [wxOf(code), tempOf(temp), slotOf(localHour)];
  });

  const rows = [];
  for (const [day, hours] of byDay) {
    if (hours.some((h) => h === null)) continue; // partial edge day
    const counts: Record<string, number> = {};
    for (const h of hours as Hour[]) {
      for (const k of keysOf(h)) counts[k] = (counts[k] ?? 0) + 1;
    }
    rows.push({ cell, day, hours, counts });
  }
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("weather_days")
    .upsert(rows, { onConflict: "cell,day", ignoreDuplicates: true });
  if (error) console.error("weather_days upsert:", error.message);
}

/** The condition keys for a scan happening now in `cell`. Moon is always
 * there; weather keys need a cell and a reachable forecast. */
export async function conditionsNow(
  supabase: Supabase,
  cell: string | null,
  now = new Date(),
): Promise<string[]> {
  const keys = [`moon:${moonOf(now)}`];
  if (!cell) return keys;

  const day = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  const read = async () => {
    const { data } = await supabase
      .from("weather_days")
      .select("hours")
      .eq("cell", cell)
      .eq("day", day)
      .maybeSingle();
    return data?.hours as Hour[] | undefined;
  };

  let hours = await read();
  if (!hours) {
    await fillCell(supabase, cell);
    hours = await read();
  }
  const h = hours?.[hour];
  return h ? [...keys, ...keysOf(h)] : keys;
}

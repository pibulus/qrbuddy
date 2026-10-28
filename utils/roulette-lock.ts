export interface DailySpinRecord {
  count: number;
  lastIndex: number | null;
  lastValue: string | null;
}

export interface DailySpinStatus {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  lockedIndex: number | null;
  lockedValue: string | null;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function normalizeDailySpinLimit(
  value: unknown,
): number | null {
  if (value === null || value === undefined || value === "" || value === 0) {
    return null;
  }
  const parsed = typeof value === "number"
    ? value
    : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return Math.min(99, parsed);
}

export function getTodayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildSpinStorageKey(
  scopeKey: string,
  now: Date = new Date(),
): string {
  const cleanScope = scopeKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `qrb_spin_${cleanScope}_${getTodayKey(now)}`;
}

export function readDailySpinState(
  scopeKey: string,
  now: Date = new Date(),
  storage: Pick<Storage, "getItem"> | null = getDefaultStorage(),
): DailySpinRecord {
  if (!storage) {
    return { count: 0, lastIndex: null, lastValue: null };
  }
  try {
    const raw = storage.getItem(buildSpinStorageKey(scopeKey, now));
    if (!raw) return { count: 0, lastIndex: null, lastValue: null };
    const parsed = JSON.parse(raw);
    const count = Number.isInteger(parsed?.count) && parsed.count >= 0
      ? parsed.count
      : 0;
    const lastIndex =
      Number.isInteger(parsed?.lastIndex) && parsed.lastIndex >= 0
        ? parsed.lastIndex
        : null;
    const lastValue = typeof parsed?.lastValue === "string"
      ? parsed.lastValue
      : null;
    return { count, lastIndex, lastValue };
  } catch {
    return { count: 0, lastIndex: null, lastValue: null };
  }
}

export function canSpinToday(
  scopeKey: string,
  dailyLimit: number | null | undefined,
  now: Date = new Date(),
  storage: Pick<Storage, "getItem"> | null = getDefaultStorage(),
): DailySpinStatus {
  const limit = normalizeDailySpinLimit(dailyLimit);
  const state = readDailySpinState(scopeKey, now, storage);
  if (limit === null) {
    return {
      allowed: true,
      used: state.count,
      limit: null,
      remaining: null,
      lockedIndex: state.lastIndex,
      lockedValue: state.lastValue,
    };
  }
  const remaining = Math.max(0, limit - state.count);
  return {
    allowed: state.count < limit,
    used: state.count,
    limit,
    remaining,
    lockedIndex: state.lastIndex,
    lockedValue: state.lastValue,
  };
}

export function recordDailySpin(
  scopeKey: string,
  chosenIndex: number,
  chosenValue: string | null = null,
  dailyLimit: number | null | undefined = null,
  now: Date = new Date(),
  storage: StorageLike | null = getDefaultStorage(),
): DailySpinStatus {
  const current = readDailySpinState(scopeKey, now, storage);
  const nextCount = current.count + 1;
  const nextState: DailySpinRecord = {
    count: nextCount,
    lastIndex: chosenIndex,
    lastValue: chosenValue,
  };

  if (storage) {
    try {
      storage.setItem(
        buildSpinStorageKey(scopeKey, now),
        JSON.stringify(nextState),
      );
    } catch {
      // Ignore quota/private-browsing storage errors gracefully.
    }
  }

  const limit = normalizeDailySpinLimit(dailyLimit);
  return {
    allowed: limit === null ? true : nextCount < limit,
    used: nextCount,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - nextCount),
    lockedIndex: chosenIndex,
    lockedValue: chosenValue,
  };
}

export function pickRouletteIndex(
  totalItems: number,
  avoidIndex?: number | null,
  rng: () => number = Math.random,
): number {
  if (totalItems <= 1) return 0;
  const clampedRng = () => {
    const v = rng();
    return Number.isFinite(v) ? Math.min(0.999999, Math.max(0, v)) : 0;
  };
  if (
    avoidIndex === undefined ||
    avoidIndex === null ||
    avoidIndex < 0 ||
    avoidIndex >= totalItems
  ) {
    return Math.floor(clampedRng() * totalItems);
  }
  // Pick among the other (totalItems - 1) slots so a spin always moves.
  const offset = 1 + Math.floor(clampedRng() * (totalItems - 1));
  return (avoidIndex + offset) % totalItems;
}

export function parseRouletteParams(
  search: string,
): { roulette: boolean; dailySpins: number | null } {
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const rawRoulette = params.get("roulette");
    const roulette = rawRoulette === "1" || rawRoulette === "true";
    const dailySpins = normalizeDailySpinLimit(params.get("spins"));
    return { roulette, dailySpins };
  } catch {
    return { roulette: false, dailySpins: null };
  }
}

export function buildRouletteShareUrl(
  baseUrl: string,
  roulette: boolean,
  dailySpins: number | null,
): string {
  if (!baseUrl) return baseUrl;
  try {
    const parsed = new URL(baseUrl, "https://qrbuddy.app");
    if (roulette) {
      parsed.searchParams.set("roulette", "1");
      const normalizedLimit = normalizeDailySpinLimit(dailySpins);
      if (normalizedLimit !== null) {
        parsed.searchParams.set("spins", String(normalizedLimit));
      } else {
        parsed.searchParams.delete("spins");
      }
    } else {
      parsed.searchParams.delete("roulette");
      parsed.searchParams.delete("spins");
    }
    return baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return baseUrl;
  }
}

import { IS_BROWSER } from "$fresh/runtime.ts";

export interface HistoryItem {
  id: string;
  type:
    | "text"
    | "url"
    | "wifi"
    | "email"
    | "phone"
    | "vcard"
    | "file"
    | "dynamic"
    | "sms"
    | "social"
    | "media";
  content: string; // The main text/url or a summary
  timestamp: number;
  metadata?: {
    title?: string; // User-friendly title (e.g. filename)
    bucketCode?: string;
    ownerToken?: string;
    shortCode?: string;
    [key: string]: unknown;
  };
}

const HISTORY_KEY = "qrbuddy_time_machine";
const MAX_ITEMS = 50; // Keep it clean, don't hoard
const HISTORY_TYPES: HistoryItem["type"][] = [
  "text",
  "url",
  "wifi",
  "email",
  "phone",
  "vcard",
  "file",
  "dynamic",
  "sms",
  "social",
  "media",
];

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HistoryItem>;
  return typeof item.id === "string" &&
    typeof item.type === "string" &&
    HISTORY_TYPES.includes(item.type as HistoryItem["type"]) &&
    typeof item.content === "string" &&
    typeof item.timestamp === "number" &&
    Number.isFinite(item.timestamp) &&
    (item.metadata === undefined || (
      Boolean(item.metadata) && typeof item.metadata === "object" &&
      !Array.isArray(item.metadata)
    ));
}

function persistHistory(history: HistoryItem[]): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
    globalThis.dispatchEvent(new CustomEvent("history-updated"));
    return true;
  } catch (error) {
    console.error("History: local save failed", error);
    return false;
  }
}

export function getHistory(): HistoryItem[] {
  if (!IS_BROWSER) return [];
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isHistoryItem).slice(0, MAX_ITEMS)
      : [];
  } catch (error) {
    console.error("History: local read failed", error);
    return [];
  }
}

export function addToHistory(
  item: Omit<HistoryItem, "id" | "timestamp">,
): boolean {
  if (!IS_BROWSER) return false;

  const history = getHistory();

  // Create new item
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Add to top, remove duplicates (by content/type) if they exist to bump them up
  const filtered = history.filter((h) =>
    !(h.type === newItem.type && h.content === newItem.content &&
      h.metadata?.bucketCode === newItem.metadata?.bucketCode)
  );

  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);

  return persistHistory(updated);
}

/** Merge a synced history into this device and persist it using the canonical key. */
export function mergeHistory(
  items: HistoryItem[],
): { mergedCount: number; saved: boolean } {
  if (!IS_BROWSER) return { mergedCount: 0, saved: false };

  const current = getHistory();
  const currentIds = new Set(current.map((item) => item.id));
  const seenIds = new Set(currentIds);
  const additions: HistoryItem[] = [];

  for (const item of items.filter(isHistoryItem)) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      additions.push(item);
    }
  }

  const incomingIds = new Set(additions.map((item) => item.id));
  const updated = [...current, ...additions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ITEMS);

  if (!persistHistory(updated)) return { mergedCount: 0, saved: false };

  return {
    mergedCount: updated.filter((item) => incomingIds.has(item.id)).length,
    saved: true,
  };
}

export function removeFromHistory(id: string) {
  if (!IS_BROWSER) return;
  const history = getHistory();
  const updated = history.filter((h) => h.id !== id);
  persistHistory(updated);
}

export function clearHistory() {
  if (!IS_BROWSER) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
    globalThis.dispatchEvent(new CustomEvent("history-updated"));
  } catch (error) {
    console.error("History: local clear failed", error);
  }
}

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

export function getHistory(): HistoryItem[] {
  if (!IS_BROWSER) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<HistoryItem, "id" | "timestamp">) {
  if (!IS_BROWSER) return;

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

  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  // Dispatch event for UI updates
  globalThis.dispatchEvent(new CustomEvent("history-updated"));
}

/** Merge a synced history into this device and persist it using the canonical key. */
export function mergeHistory(items: HistoryItem[]): number {
  if (!IS_BROWSER) return 0;

  const current = getHistory();
  const currentIds = new Set(current.map((item) => item.id));
  const seenIds = new Set(currentIds);
  const additions: HistoryItem[] = [];

  for (const item of items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      additions.push(item);
    }
  }

  const incomingIds = new Set(additions.map((item) => item.id));
  const updated = [...current, ...additions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ITEMS);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  globalThis.dispatchEvent(new CustomEvent("history-updated"));

  return updated.filter((item) => incomingIds.has(item.id)).length;
}

export function removeFromHistory(id: string) {
  if (!IS_BROWSER) return;
  const history = getHistory();
  const updated = history.filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  globalThis.dispatchEvent(new CustomEvent("history-updated"));
}

export function clearHistory() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(HISTORY_KEY);
  globalThis.dispatchEvent(new CustomEvent("history-updated"));
}

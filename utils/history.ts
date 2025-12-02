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

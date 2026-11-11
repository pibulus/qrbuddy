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
    editUrl?: string;
    [key: string]: unknown;
  };
}

const HISTORY_KEY = "qrbuddy_time_machine";
export const MAX_HISTORY_ITEMS = 200;
const MAX_ITEMS = MAX_HISTORY_ITEMS; // Supports up to a 200-code batch without self-eviction
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

function getStorage(storageOverride?: Storage): Storage | null {
  if (storageOverride) return storageOverride;
  if (!IS_BROWSER) return null;
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

function persistHistory(
  history: HistoryItem[],
  storageOverride?: Storage,
): boolean {
  const storage = getStorage(storageOverride);
  if (!storage) return false;

  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
    globalThis.dispatchEvent?.(new CustomEvent("history-updated"));
    return true;
  } catch (error) {
    console.error("History: local save failed", error);
    return false;
  }
}

export function getHistory(storageOverride?: Storage): HistoryItem[] {
  const storage = getStorage(storageOverride);
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
  storageOverride?: Storage,
): boolean {
  const storage = getStorage(storageOverride);
  if (!storage) return false;

  const history = getHistory(storageOverride);

  // Create new item
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Add to top, remove duplicates (by content/type/codes) if they exist to bump them up
  const filtered = history.filter((h) =>
    !(h.type === newItem.type && h.content === newItem.content &&
      h.metadata?.bucketCode === newItem.metadata?.bucketCode &&
      h.metadata?.shortCode === newItem.metadata?.shortCode)
  );

  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);

  return persistHistory(updated, storageOverride);
}

export interface DynamicHistoryInput {
  url: string;
  redirectUrl?: string;
  isDynamic?: boolean;
  shortCode: string;
  editUrl?: string;
  label?: string;
  ownerScope?: "qr";
}

/** Record a minted dynamic QR (single or batch) in Time Machine history. */
export function addDynamicToHistory(
  input: DynamicHistoryInput,
  storageOverride?: Storage,
): boolean {
  const cleanLabel = input.label?.trim() || "";
  const cleanUrl = input.url.trim();
  const content = input.redirectUrl?.trim() || cleanUrl;
  if (!content || !input.shortCode) return false;

  return addToHistory(
    {
      type: "dynamic",
      content,
      metadata: {
        title: cleanLabel || cleanUrl,
        url: cleanUrl,
        destinationUrl: cleanUrl,
        isDynamic: input.isDynamic ?? true,
        shortCode: input.shortCode,
        ...(input.editUrl ? { editUrl: input.editUrl } : {}),
        ...(cleanLabel ? { label: cleanLabel } : {}),
        ...(input.ownerScope ? { ownerScope: input.ownerScope } : {}),
      },
    },
    storageOverride,
  );
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

/**
 * Turn a raw QR payload into something a person can read in the Time Machine.
 *
 * Templates write their encoded payloads (`WIFI:T:WPA;S:...`, `BEGIN:VCARD`,
 * `mailto:`, `tel:`, `SMSTO:`) straight into the shared `url` signal, so the
 * history row used to show the raw string twice — once as the title, once as
 * the subtitle. Detect the format, pull the useful bit out, and hand back a
 * type the drawer can pick an icon for.
 */
export function summarizeQrPayload(content: string): {
  type: HistoryItem["type"];
  title: string;
  subtitle: string;
} {
  const raw = (content || "").trim();
  const shorten = (value: string, max = 42) =>
    value.length > max ? `${value.slice(0, max - 1)}…` : value;

  // Wi-Fi: WIFI:T:WPA;S:Network;P:secret;H:true;;
  if (/^WIFI:/i.test(raw)) {
    const readField = (key: string) => {
      // The first field follows "WIFI:", not a semicolon — strip the prefix
      // so the same regex finds T:, S:, and P:.
      const body = raw.replace(/^WIFI:/i, "");
      const match = body.match(
        new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, "i"),
      );
      if (!match) return "";
      // Undo the backslash escaping applied by formatWiFi().
      return match[1].replace(/\\(.)/g, "$1").trim();
    };
    const ssid = readField("S");
    const security = readField("T");
    const securityLabel = !security || security.toLowerCase() === "nopass"
      ? "Open network"
      : security.toUpperCase();
    return {
      type: "wifi",
      title: ssid ? `Wi-Fi: ${shorten(ssid)}` : "Wi-Fi network",
      subtitle: securityLabel,
    };
  }

  // Contact card: multi-line vCard.
  if (/^BEGIN:VCARD/i.test(raw)) {
    const line = raw.match(/^FN:(.+)$/im)?.[1] ??
      [raw.match(/^N:(.+)$/im)?.[1], raw.match(/^ORG:(.+)$/im)?.[1]]
        .filter(Boolean)
        .join(" ");
    const title = line?.replace(/\\(.)/g, "$1").replace(/;+$/, "").trim();
    const org = raw.match(/^ORG:(.+)$/im)?.[1]?.replace(/\\(.)/g, "$1")
      .trim();
    return {
      type: "vcard",
      title: title ? `Contact: ${shorten(title)}` : "Contact card",
      subtitle: org && org !== title ? org : "Contact card",
    };
  }

  if (/^mailto:/i.test(raw)) {
    const address = raw.slice(7).split("?")[0];
    const subject = new URLSearchParams(raw.split("?")[1] ?? "").get("subject");
    return {
      type: "email",
      title: address ? `Email: ${shorten(address)}` : "Email",
      subtitle: subject?.trim() || "Email draft",
    };
  }

  if (/^tel:/i.test(raw)) {
    const number = raw.slice(4).replace(/[^\d+]/g, "");
    return {
      type: "phone",
      title: number ? `Call: ${shorten(number)}` : "Phone call",
      subtitle: "Phone call",
    };
  }

  if (/^SMSTO:/i.test(raw)) {
    const [number, ...message] = raw.slice(6).split(":");
    return {
      type: "sms",
      title: number ? `Text: ${shorten(number)}` : "Text message",
      subtitle: shorten(message.join(":").trim() || "Text message", 60),
    };
  }

  if (/^https?:\/\//i.test(raw)) {
    let host = "";
    let path = "";
    try {
      const parsed = new URL(raw);
      host = parsed.hostname.replace(/^www\./, "");
      path = parsed.pathname === "/" ? "" : parsed.pathname;
    } catch { /* leave host empty for malformed URLs */ }
    const label = `${host}${path}`;
    return {
      type: "url",
      title: shorten(label || raw),
      subtitle: shorten(raw, 60),
    };
  }

  // Plain text: first line is the gist.
  const firstLine = raw.split("\n")[0].trim();
  return {
    type: "text",
    title: shorten(firstLine || "Text"),
    subtitle: raw.includes("\n") ? "Multi-line text" : "Text",
  };
}

/** Update matching history items locally and emit a change event. */
export function updateHistoryItem(
  matcher: (item: HistoryItem) => boolean,
  updater: (item: HistoryItem) => HistoryItem,
): boolean {
  if (!IS_BROWSER) return false;
  const history = getHistory();
  let changed = false;
  const updated = history.map((item) => {
    if (matcher(item)) {
      changed = true;
      return updater(item);
    }
    return item;
  });
  if (changed) {
    return persistHistory(updated);
  }
  return false;
}

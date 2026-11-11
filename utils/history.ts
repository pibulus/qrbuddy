import { IS_BROWSER } from "$fresh/runtime.ts";
import {
  parseEmail,
  parsePhone,
  parseSMS,
  parseVCard,
  parseWiFi,
} from "../types/qr-templates.ts";
import type { QRStyle } from "../types/qr-types.ts";
import type { Locale } from "./i18n.ts";

export interface SavedQrDesign {
  style: string;
  customStyle?: QRStyle | null;
  frameConfig?: {
    enabled: boolean;
    caption?: string;
    theme?: "ink" | "paper" | "accent";
  } | null;
  logoUrl?: string;
}

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
    design?: SavedQrDesign;
    tags?: string[];
    batchId?: string;
    [key: string]: unknown;
  };
}

export type VaultFilter = "all" | "editable" | "static" | "files";

export interface FilterHistoryOptions {
  query?: string;
  filter?: VaultFilter;
}

export interface VaultBackup {
  version: 1;
  app: "qrbuddy";
  exportedAt: string;
  items: HistoryItem[];
}

export type StructuredQrTemplate =
  | "wifi"
  | "vcard"
  | "email"
  | "sms"
  | "phone";

export interface StructuredStageSummary {
  template: StructuredQrTemplate;
  label: string;
  detail?: string;
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
  design?: SavedQrDesign;
  tags?: string[];
  batchId?: string;
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
        ...(input.design ? { design: input.design } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
        ...(input.batchId ? { batchId: input.batchId } : {}),
      },
    },
    storageOverride,
  );
}

function historyIdentityKey(item: HistoryItem): string {
  const shortCode = typeof item.metadata?.shortCode === "string"
    ? item.metadata.shortCode.trim()
    : "";
  if (shortCode) return `sc:${shortCode}`;
  const bucketCode = typeof item.metadata?.bucketCode === "string"
    ? item.metadata.bucketCode.trim()
    : "";
  if (bucketCode) return `bk:${bucketCode}`;
  return `${item.type}::${item.content}`;
}

function mergeMetadata(
  existing: HistoryItem["metadata"],
  incoming: HistoryItem["metadata"],
): HistoryItem["metadata"] {
  if (!existing && !incoming) return undefined;
  return {
    ...(incoming ?? {}),
    ...(existing ?? {}),
    ...(existing?.design ?? incoming?.design
      ? { design: existing?.design ?? incoming?.design }
      : {}),
    ...(existing?.tags ?? incoming?.tags
      ? { tags: existing?.tags ?? incoming?.tags }
      : {}),
    ...(existing?.batchId ?? incoming?.batchId
      ? { batchId: existing?.batchId ?? incoming?.batchId }
      : {}),
    ...(existing?.editUrl ?? incoming?.editUrl
      ? { editUrl: existing?.editUrl ?? incoming?.editUrl }
      : {}),
    ...(existing?.shortCode ?? incoming?.shortCode
      ? { shortCode: existing?.shortCode ?? incoming?.shortCode }
      : {}),
  };
}

/** Merge a synced history into this device and persist it using the canonical key. */
export function mergeHistory(
  items: HistoryItem[],
  storageOverride?: Storage,
): { mergedCount: number; saved: boolean } {
  const storage = getStorage(storageOverride);
  if (!storage) return { mergedCount: 0, saved: false };

  const current = getHistory(storageOverride).map((item) => ({ ...item }));
  const seenIds = new Set(current.map((item) => item.id));
  const indexByIdentity = new Map<string, number>();
  current.forEach((item, idx) => {
    indexByIdentity.set(historyIdentityKey(item), idx);
  });

  const additions: HistoryItem[] = [];

  for (const item of items.filter(isHistoryItem)) {
    const ident = historyIdentityKey(item);
    if (seenIds.has(item.id) || indexByIdentity.has(ident)) {
      const existingIdx = indexByIdentity.get(ident) ??
        current.findIndex((c) => c.id === item.id);
      if (existingIdx !== -1 && existingIdx < current.length) {
        current[existingIdx] = {
          ...current[existingIdx],
          metadata: mergeMetadata(current[existingIdx].metadata, item.metadata),
        };
      }
      continue;
    }
    seenIds.add(item.id);
    indexByIdentity.set(ident, current.length + additions.length);
    additions.push(item);
  }

  const incomingIds = new Set(additions.map((item) => item.id));
  const updated = [...current, ...additions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ITEMS);

  if (!persistHistory(updated, storageOverride)) {
    return { mergedCount: 0, saved: false };
  }

  return {
    mergedCount: updated.filter((item) => incomingIds.has(item.id)).length,
    saved: true,
  };
}

export function isFileHistoryItem(item: HistoryItem): boolean {
  return (
    item.type === "file" ||
    item.type === "media" ||
    Boolean(item.metadata?.bucketCode) ||
    item.metadata?.ownerScope === "file"
  );
}

export function isEditableHistoryItem(item: HistoryItem): boolean {
  if (isFileHistoryItem(item)) return false;
  return (
    item.type === "dynamic" ||
    Boolean(item.metadata?.shortCode) ||
    Boolean(item.metadata?.editUrl) ||
    Boolean(item.metadata?.ownerToken) ||
    item.metadata?.isDynamic === true ||
    item.metadata?.ownerScope === "qr"
  );
}

/**
 * Filter local vault items by free-text query and category pill.
 * Searches across content, metadata.title, metadata.subtitle, metadata.label,
 * metadata.shortCode, and metadata.tags.
 */
export function filterHistoryItems(
  items: HistoryItem[],
  options: FilterHistoryOptions = {},
): HistoryItem[] {
  const filter = options.filter ?? "all";
  const q = (options.query ?? "").trim().toLowerCase();

  return items.filter((item) => {
    if (filter === "files" && !isFileHistoryItem(item)) return false;
    if (filter === "editable" && !isEditableHistoryItem(item)) return false;
    if (
      filter === "static" &&
      (isFileHistoryItem(item) || isEditableHistoryItem(item))
    ) {
      return false;
    }

    if (!q) return true;

    const meta = item.metadata;
    const tags = Array.isArray(meta?.tags)
      ? meta.tags.filter((t): t is string => typeof t === "string")
      : [];
    const summary = summarizeQrPayload(item.content);
    const haystacks = [
      item.content,
      typeof meta?.title === "string" ? meta.title : "",
      typeof meta?.subtitle === "string" ? meta.subtitle : "",
      typeof meta?.label === "string" ? meta.label : "",
      typeof meta?.shortCode === "string" ? meta.shortCode : "",
      typeof meta?.destinationUrl === "string" ? meta.destinationUrl : "",
      typeof meta?.bucketCode === "string" ? meta.bucketCode : "",
      summary.title,
      summary.subtitle,
      ...tags,
    ];

    return haystacks.some((h) => h.toLowerCase().includes(q));
  });
}

/**
 * Export saved vault items as a human-portable JSON archive.
 */
export function exportVaultJson(
  items?: HistoryItem[],
  storageOverride?: Storage,
): string {
  const source = items
    ? items.filter(isHistoryItem)
    : getHistory(storageOverride);
  const archive: VaultBackup = {
    version: 1,
    app: "qrbuddy",
    exportedAt: new Date().toISOString(),
    items: source,
  };
  return JSON.stringify(archive, null, 2);
}

/**
 * Import and deduplicate a portable JSON vault archive into local storage.
 */
export function importVaultJson(
  rawJson: string,
  storageOverride?: Storage,
): { imported: number; total: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Invalid vault JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid vault archive format");
  }

  const record = parsed as Record<string, unknown>;
  if (
    record.version !== 1 ||
    (record.app !== undefined && record.app !== "qrbuddy") ||
    !Array.isArray(record.items)
  ) {
    throw new Error("Unsupported vault archive version");
  }

  const validItems = record.items.filter(isHistoryItem);
  const result = mergeHistory(validItems, storageOverride);
  if (!result.saved) {
    throw new Error("Vault storage unavailable");
  }

  return {
    imported: result.mergedCount,
    total: getHistory(storageOverride).length,
  };
}

/**
 * Detect structured non-URL QR schemas (Wi-Fi, vCard, Email, SMS, Phone) so
 * the home stage can render a crisp tactile summary chip instead of raw
 * protocol strings like `WIFI:T:WPA;S:...` or `BEGIN:VCARD`.
 */
export function detectStructuredStagePayload(
  payload: string,
  locale: Locale = "en",
): StructuredStageSummary | null {
  const raw = (payload || "").trim();
  if (!raw) return null;

  const isEs = locale === "es";
  const shorten = (value: string, max = 34) =>
    value.length > max ? `${value.slice(0, max - 1)}…` : value;

  if (/^WIFI:/i.test(raw)) {
    const wifi = parseWiFi(raw);
    if (wifi) {
      const sec = wifi.encryption === "nopass"
        ? (isEs ? "Abierta" : "Open")
        : wifi.encryption;
      return {
        template: "wifi",
        label: `Wi-Fi · ${shorten(wifi.ssid)} (${sec})`,
        detail: sec,
      };
    }
    const fallback = summarizeQrPayload(raw);
    const cleanSsid = fallback.title.replace(/^Wi-Fi:\s*/i, "").trim();
    return {
      template: "wifi",
      label: cleanSsid && cleanSsid !== "Wi-Fi network"
        ? `Wi-Fi · ${cleanSsid} (${fallback.subtitle})`
        : (isEs ? "Wi-Fi · Red" : "Wi-Fi · Network"),
      detail: fallback.subtitle,
    };
  }

  if (/^BEGIN:VCARD/i.test(raw)) {
    const vcard = parseVCard(raw);
    const prefix = isEs ? "Contacto" : "Contact";
    if (vcard) {
      const fullName = [vcard.firstName, vcard.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
        vcard.organization.trim() ||
        vcard.email.trim() ||
        vcard.phone.trim();
      return {
        template: "vcard",
        label: fullName ? `${prefix} · ${shorten(fullName)}` : prefix,
        detail: vcard.organization && vcard.organization !== fullName
          ? shorten(vcard.organization, 28)
          : undefined,
      };
    }
    const fallback = summarizeQrPayload(raw);
    const cleanContact = fallback.title.replace(/^Contact:\s*/i, "").trim();
    return {
      template: "vcard",
      label: cleanContact && cleanContact !== "Contact card"
        ? `${prefix} · ${cleanContact}`
        : prefix,
    };
  }

  if (/^mailto:/i.test(raw)) {
    const email = parseEmail(raw);
    const prefix = isEs ? "Correo" : "Email";
    if (email) {
      return {
        template: "email",
        label: `${prefix} · ${shorten(email.email)}`,
        detail: email.subject.trim()
          ? shorten(email.subject.trim(), 28)
          : undefined,
      };
    }
    return null;
  }

  if (/^(?:smsto|sms):/i.test(raw)) {
    const sms = parseSMS(raw);
    if (sms) {
      return {
        template: "sms",
        label: `SMS · ${shorten(sms.phone)}`,
        detail: sms.message.trim()
          ? shorten(sms.message.trim(), 28)
          : undefined,
      };
    }
    return null;
  }

  if (/^tel:/i.test(raw)) {
    const phone = parsePhone(raw);
    const prefix = isEs ? "Llamada" : "Call";
    if (phone) {
      return {
        template: "phone",
        label: `${prefix} · ${shorten(phone.phone)}`,
      };
    }
    return null;
  }

  return null;
}

export function removeFromHistory(id: string, storageOverride?: Storage) {
  const storage = getStorage(storageOverride);
  if (!storage) return;
  const history = getHistory(storageOverride);
  const updated = history.filter((h) => h.id !== id);
  persistHistory(updated, storageOverride);
}

export function clearHistory(storageOverride?: Storage) {
  const storage = getStorage(storageOverride);
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
    globalThis.dispatchEvent?.(new CustomEvent("history-updated"));
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

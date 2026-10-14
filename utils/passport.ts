// ═══════════════════════════════════════════════════════════════════════════
// 🎫 QRBuddy Passport — Sovereign device sync & library identity
// ═══════════════════════════════════════════════════════════════════════════
// Zero passwords, zero email walls. A holographic tactile passport card that
// syncs across phones and laptops by scanning its own QR code.

import { generateSyncPhrase } from "./sync-phrase.ts";
import qrcode from "qrcode-generator";

export function renderPassportQrSvg(text: string, cellSize = 4): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag(cellSize, 0).replace(
    /width="\d+px"\s+height="\d+px"/,
    'width="100%" height="100%" class="w-full h-full object-contain"',
  );
}

export interface QRBuddyPassport {
  id: string; // UUID v4 (maps to server library user_id)
  secret: string; // 32-char hex secret for authenticating API requests
  name: string; // Procedural moniker (e.g. "Velvet Axolotl")
  avatarEmoji: string; // Tactile spirit emoji (e.g. "🦎", "🌸", "🦦")
  phrase: string; // 4-word sovereign backup phrase
  tier: "free" | "plus";
  createdAt: string;
}

const PASSPORT_STORAGE_KEY = "qrbuddy_passport";

const PASSPORT_ADJECTIVES = [
  "Velvet",
  "Neon",
  "Cosmic",
  "Pastel",
  "Plucky",
  "Golden",
  "Electric",
  "Sunset",
  "Midnight",
  "Breezy",
  "Sparkly",
  "Retro",
  "Mellow",
  "Dapper",
  "Lucky",
  "Hyper",
  "Glitchy",
  "Cherry",
  "Minty",
  "Sunny",
  "Funky",
  "Atomic",
  "Chunky",
  "Zesty",
];

const PASSPORT_CREATURES = [
  "Axolotl",
  "Gecko",
  "Otter",
  "Capybara",
  "Ocelot",
  "Quokka",
  "Chameleon",
  "Pangolin",
  "Puffin",
  "Lemur",
  "Falcon",
  "Firefly",
  "Tanuki",
  "Badger",
  "Koala",
  "Narwhal",
  "Toucan",
  "Fennec",
  "Penguin",
  "Dolphin",
];

const PASSPORT_EMOJIS = [
  "🦎",
  "🌸",
  "🦦",
  "✨",
  "🦭",
  "🦊",
  "🐬",
  "🦜",
  "🦔",
  "🍄",
  "🦥",
  "🐙",
  "⚡",
  "🌙",
  "🦩",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSecretHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generatePassportIdentity(): QRBuddyPassport {
  const id = crypto.randomUUID();
  const secret = generateSecretHex(16);
  const adjective = getRandomItem(PASSPORT_ADJECTIVES);
  const creature = getRandomItem(PASSPORT_CREATURES);
  const name = `${adjective} ${creature}`;
  const avatarEmoji = getRandomItem(PASSPORT_EMOJIS);
  const phrase = generateSyncPhrase();

  return {
    id,
    secret,
    name,
    avatarEmoji,
    phrase,
    tier: "free",
    createdAt: new Date().toISOString(),
  };
}

export function getStoredPassport(): QRBuddyPassport | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PASSPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed.id === "string" &&
      typeof parsed.secret === "string"
    ) {
      return parsed as QRBuddyPassport;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePassport(passport: QRBuddyPassport): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(passport));
    if (typeof globalThis.dispatchEvent === "function") {
      globalThis.dispatchEvent(
        new CustomEvent("qrb-passport-changed", { detail: passport }),
      );
    }
  } catch {
    // LocalStorage full or blocked
  }
}

export function getOrCreatePassport(): QRBuddyPassport {
  const existing = getStoredPassport();
  if (existing) return existing;
  const created = generatePassportIdentity();
  savePassport(created);
  return created;
}

export function clearPassport(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PASSPORT_STORAGE_KEY);
    if (typeof globalThis.dispatchEvent === "function") {
      globalThis.dispatchEvent(
        new CustomEvent("qrb-passport-changed", { detail: null }),
      );
    }
  } catch {
    // Ignore
  }
}

/**
 * Builds the cross-device sync URL. Encodes passport ID, secret, and phrase
 * in the URL fragment (#) so it NEVER touches server access or proxy logs.
 */
export function buildPassportSyncUrl(
  passport: QRBuddyPassport,
  origin?: string,
): string {
  const base = origin ||
    (typeof window !== "undefined"
      ? globalThis.location.origin
      : "https://qrbuddy.app");
  const params = new URLSearchParams();
  params.set("passport", passport.id);
  params.set("secret", passport.secret);
  params.set("name", passport.name);
  params.set("emoji", passport.avatarEmoji);
  params.set("phrase", passport.phrase);
  if (passport.tier === "plus") {
    params.set("tier", "plus");
  }

  return `${base}/#${params.toString()}`;
}

/**
 * Checks the URL hash on page load for incoming passport sync credentials.
 * If found: writes to localStorage, cleans the hash, and triggers the sync event.
 */
export function parsePassportFromUrl(): QRBuddyPassport | null {
  if (typeof globalThis.location === "undefined" || !globalThis.location.hash) {
    return null;
  }

  try {
    const hash = globalThis.location.hash.startsWith("#")
      ? globalThis.location.hash.slice(1)
      : globalThis.location.hash;
    if (!hash.includes("passport=") || !hash.includes("secret=")) return null;

    const params = new URLSearchParams(hash);
    const id = params.get("passport")?.trim();
    const secret = params.get("secret")?.trim();
    if (!id || !secret) return null;

    const name = params.get("name")?.trim() || "Synced Passport";
    const avatarEmoji = params.get("emoji")?.trim() || "🦎";
    const phrase = params.get("phrase")?.trim() || generateSyncPhrase();
    const tier = params.get("tier") === "plus" ? "plus" : "free";

    const passport: QRBuddyPassport = {
      id,
      secret,
      name,
      avatarEmoji,
      phrase,
      tier,
      createdAt: new Date().toISOString(),
    };

    savePassport(passport);

    // Remove secrets from URL bar cleanly without refreshing
    const cleanUrl = (globalThis.location.pathname || "/") +
      (globalThis.location.search || "");
    if (globalThis.history?.replaceState) {
      globalThis.history.replaceState(null, "", cleanUrl);
    }

    if (typeof globalThis.dispatchEvent === "function") {
      globalThis.dispatchEvent(
        new CustomEvent("qrb-passport-synced", { detail: passport }),
      );
    }

    return passport;
  } catch {
    return null;
  }
}

/**
 * Generates API request headers identifying this passport.
 */
export function getPassportAuthHeaders(
  passport?: QRBuddyPassport | null,
): Record<string, string> {
  const p = passport ?? getStoredPassport();
  if (!p) return {};
  return {
    "x-passport-id": p.id,
    "Authorization": `Bearer ${p.secret}`,
  };
}

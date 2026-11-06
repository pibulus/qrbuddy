// ═══════════════════════════════════════════════════════════════════════════
// 🎫 QRBuddy Passport — Sovereign device sync & library identity
// ═══════════════════════════════════════════════════════════════════════════
// Zero passwords, zero email walls. A holographic tactile passport card that
// syncs across phones and laptops by scanning its own QR code.

import {
  getSupporterClaims,
  getSupporterPass,
  setSupporterPass,
} from "./supporter-pass.ts";
import { generateSyncPhrase, normalizeSyncPhrase } from "./sync-phrase.ts";
import {
  getSyncRoomId,
  parseFourWordPasskey,
} from "./softstack-passport/index.js";
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
  id: string; // Internal UUID (maps to server library user_id)
  code?: string; // SoftStack passport code (SS-XXXX-XXXX-XXXX)
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

function applySupporterClaims(passport: QRBuddyPassport): boolean {
  let dirty = false;
  const claims = getSupporterClaims();
  if (claims) {
    if (
      typeof claims.code === "string" &&
      claims.code.trim() &&
      passport.code !== claims.code.trim()
    ) {
      passport.code = claims.code.trim();
      dirty = true;
    }
    if (
      typeof claims.phrase === "string" &&
      claims.phrase.trim() &&
      passport.phrase !== claims.phrase.trim()
    ) {
      passport.phrase = claims.phrase.trim();
      dirty = true;
    }
    if (
      typeof claims.name === "string" &&
      claims.name.trim() &&
      passport.name !== claims.name.trim()
    ) {
      passport.name = claims.name.trim();
      dirty = true;
    }
  }
  return dirty;
}

function deriveCredentialsFromPhrase(phrase: string): {
  id: string;
  secret: string;
  name: string;
} {
  const normalized = normalizeSyncPhrase(phrase);
  const parsed = parseFourWordPasskey(normalized);
  const hex = getSyncRoomId(`qrbuddy-passport:${normalized}`);
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${
    hex.slice(17, 20)
  }-${hex.slice(20, 32)}`;
  const secret = hex.slice(32, 64);
  return {
    id,
    secret,
    name: parsed?.name || "Synced Passport",
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
      const passport = parsed as QRBuddyPassport;
      let dirty = false;
      if (typeof passport.phrase === "string") {
        const words = passport.phrase.split(/[-_\s]+/).filter(Boolean);
        if (words.length > 4 || passport.phrase.includes("_")) {
          passport.phrase = words.slice(0, 4).join("-").toLowerCase();
          dirty = true;
        }
      }
      if (passport.tier !== "plus" && getSupporterPass() !== null) {
        passport.tier = "plus";
        dirty = true;
      }
      if (applySupporterClaims(passport)) {
        dirty = true;
      }
      if (dirty) {
        savePassport(passport);
      }
      return passport;
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
  if (existing) {
    let dirty = false;
    if (existing.tier !== "plus" && getSupporterPass() !== null) {
      existing.tier = "plus";
      dirty = true;
    }
    if (applySupporterClaims(existing)) {
      dirty = true;
    }
    if (dirty) {
      savePassport(existing);
    }
    return existing;
  }
  const created = generatePassportIdentity();
  if (getSupporterPass() !== null) {
    created.tier = "plus";
    applySupporterClaims(created);
  }
  savePassport(created);
  return created;
}

export function rerollPassportIdentity(
  current?: QRBuddyPassport | null,
): QRBuddyPassport {
  const base = current ?? getOrCreatePassport();
  let fresh = generatePassportIdentity();
  for (
    let i = 0;
    i < 10 &&
    (fresh.name === base.name || fresh.avatarEmoji === base.avatarEmoji);
    i++
  ) {
    fresh = generatePassportIdentity();
  }
  const updated: QRBuddyPassport = {
    ...base,
    name: fresh.name,
    avatarEmoji: fresh.avatarEmoji,
    tier: getSupporterPass() !== null ? "plus" : base.tier,
  };
  savePassport(updated);
  return updated;
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
  const activePass = getSupporterPass();
  if (activePass || passport.tier === "plus") {
    params.set("tier", "plus");
  }
  if (activePass) {
    params.set("pass", activePass);
  }

  return `${base}/#${params.toString()}`;
}

/**
 * Compact phrase-only URL for the Passport card QR and recovery email.
 * Encodes only `#phrase=<4-words>` so the QR is Version 3/4 (~29 modules,
 * ~2.5px/module) and never carries bearer JWTs or raw hex secrets.
 */
export function buildPassportPhraseUrl(
  phraseOrPassport: string | QRBuddyPassport,
  origin?: string,
): string {
  const base = origin ||
    (typeof window !== "undefined"
      ? globalThis.location.origin
      : "https://qrbuddy.app");
  const phrase = typeof phraseOrPassport === "string"
    ? phraseOrPassport.trim()
    : phraseOrPassport.phrase?.trim() || "";
  if (!phrase) return `${base}/`;
  const params = new URLSearchParams();
  params.set("phrase", phrase);
  return `${base}/#${params.toString()}`;
}

/**
 * Checks the URL hash on page load for incoming passport sync credentials.
 * Supports both `#phrase=<4-words>` (passphrase-root) and legacy
 * `#passport=<id>&secret=<secret>`.
 */
export function parsePassportFromUrl(): QRBuddyPassport | null {
  if (typeof globalThis.location === "undefined" || !globalThis.location.hash) {
    return null;
  }

  try {
    const hash = globalThis.location.hash.startsWith("#")
      ? globalThis.location.hash.slice(1)
      : globalThis.location.hash;
    const params = new URLSearchParams(hash);
    const rawPhrase = (params.get("phrase") || params.get("unlock") || "")
      .trim();
    const hasLegacyCreds = hash.includes("passport=") &&
      hash.includes("secret=");

    if (!hasLegacyCreds && !rawPhrase) return null;

    let id = params.get("passport")?.trim() || "";
    let secret = params.get("secret")?.trim() || "";
    let name = params.get("name")?.trim() || "";
    const avatarEmoji = params.get("emoji")?.trim() || "🦎";
    let phrase = rawPhrase || "";

    if (!id || !secret) {
      const parsed = parseFourWordPasskey(rawPhrase);
      if (!parsed) return null;
      const derived = deriveCredentialsFromPhrase(parsed.phrase);
      id = derived.id;
      secret = derived.secret;
      name = name || derived.name;
      phrase = parsed.phrase;
    } else {
      name = name || "Synced Passport";
      phrase = phrase || generateSyncPhrase();
    }

    const incomingPass = params.get("pass")?.trim();
    const passRestored = incomingPass ? setSupporterPass(incomingPass) : false;
    const tier = passRestored || params.get("tier") === "plus" ||
        getSupporterPass() !== null
      ? "plus"
      : "free";

    const passport: QRBuddyPassport = {
      id,
      secret,
      name,
      avatarEmoji,
      phrase,
      tier,
      createdAt: new Date().toISOString(),
    };
    applySupporterClaims(passport);

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

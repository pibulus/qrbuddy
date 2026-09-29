// ═══════════════════════════════════════════════════════════════════════════
// 🔑 sync-phrase — sovereign device sync for QRBuddy
// ═══════════════════════════════════════════════════════════════════════════
// No accounts, no email, no passwords. A memorable phrase syncs Time Machine
// history, edit tokens, and supporter passes across devices.

import { decryptText, encryptText } from "./crypto.ts";
import { getHistory, HistoryItem, mergeHistory } from "./history.ts";
import { getSupporterPass, setSupporterPass } from "./supporter-pass.ts";
import {
  exportOwnerTokens,
  importOwnerTokens,
  OwnerTokenRecord,
} from "./token-vault.ts";

const ADJECTIVES = [
  "neon",
  "funky",
  "silent",
  "sneaky",
  "cosmic",
  "retro",
  "atomic",
  "chunky",
  "dapper",
  "spry",
  "loopy",
  "vibrant",
  "fuzzy",
  "gloomy",
  "slick",
  "brave",
  "wild",
  "gentle",
  "sleepy",
  "peppy",
  "glossy",
  "rowdy",
  "humble",
  "zesty",
  "mellow",
  "crispy",
  "plucky",
  "swanky",
  "jolly",
  "nimble",
  "quiet",
  "sunny",
  "bouncy",
  "velvet",
  "copper",
  "wobbly",
  "breezy",
  "toasty",
  "salty",
  "lucky",
];

const NOUNS = [
  "turtle",
  "lantern",
  "pickle",
  "comet",
  "walrus",
  "muffin",
  "cactus",
  "otter",
  "kettle",
  "puffin",
  "noodle",
  "badger",
  "pebble",
  "raccoon",
  "mango",
  "wombat",
  "satchel",
  "gecko",
  "pancake",
  "ferret",
  "thistle",
  "marble",
  "donkey",
  "waffle",
  "hedgehog",
  "biscuit",
  "lobster",
  "acorn",
  "penguin",
  "teapot",
  "magpie",
  "pumpkin",
  "anchor",
  "sparrow",
  "domino",
  "weasel",
  "kazoo",
  "parsnip",
  "yak",
  "bagel",
];

const VERBS = [
  "drifts",
  "hums",
  "naps",
  "wanders",
  "juggles",
  "tumbles",
  "skips",
  "hoards",
  "whistles",
  "shuffles",
  "ponders",
  "orbits",
  "gallops",
  "dozes",
  "giggles",
  "sneezes",
  "waltzes",
  "blooms",
  "rattles",
  "paddles",
  "wiggles",
  "salutes",
  "yodels",
  "sulks",
  "bounces",
  "grumbles",
  "twirls",
  "snoozes",
  "hoots",
  "scuttles",
  "flops",
  "sighs",
];

const PLACES = [
  "uptown",
  "sideways",
  "downstairs",
  "offshore",
  "backwards",
  "nearby",
  "overboard",
  "homeward",
  "onstage",
  "outback",
  "seaside",
  "midair",
  "underfoot",
  "roadside",
  "skyward",
  "indoors",
  "poolside",
  "upstream",
  "yonder",
  "aloft",
  "ashore",
  "afield",
  "abroad",
  "inland",
  "lakeside",
  "treetop",
  "rooftop",
  "streetwise",
  "campside",
  "harbourside",
  "trackside",
  "hillside",
];

const LEGACY_SYNC_WORDS = 4;
const CURRENT_SYNC_WORDS = 12;

function pick(bank: string[]): string {
  const max = Math.floor(0xffffffff / bank.length) * bank.length;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= max);
  return bank[value % bank.length];
}

function compound(first: string, second: string, third: string): string {
  return `${first}_${second}_${third}`;
}

export function generateSyncPhrase(): string {
  // Each hyphenated part contains three independently chosen words. Four
  // parts preserve the easy-to-share shape while raising the search space
  // from about 21 bits to about 62 bits for offline bundle attacks.
  return [
    compound(pick(ADJECTIVES), pick(NOUNS), pick(VERBS)),
    compound(pick(NOUNS), pick(VERBS), pick(PLACES)),
    compound(pick(VERBS), pick(PLACES), pick(ADJECTIVES)),
    compound(pick(PLACES), pick(ADJECTIVES), pick(NOUNS)),
  ].join("-");
}

export function normalizeSyncPhrase(value: string): string {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
}

export function isValidSyncPhrase(
  value: string,
  numWords?: number,
): boolean {
  const words = normalizeSyncPhrase(value).split("-").filter(Boolean);
  return numWords === undefined
    ? words.length === LEGACY_SYNC_WORDS || words.length === CURRENT_SYNC_WORDS
    : words.length === numWords;
}

export interface SyncBundle {
  version: 1 | 2;
  timestamp: number;
  history: HistoryItem[];
  supporterPass: string | null;
  ownerTokens?: OwnerTokenRecord[];
}

/**
 * Pack the current device state into an encrypted sync bundle string.
 */
export async function exportSyncBundle(phrase: string): Promise<string> {
  const bundle: SyncBundle = {
    version: 2,
    timestamp: Date.now(),
    history: getHistory(),
    supporterPass: getSupporterPass(),
    ownerTokens: await exportOwnerTokens(),
  };

  const json = JSON.stringify(bundle);
  const encrypted = await encryptText(json, normalizeSyncPhrase(phrase));
  return JSON.stringify(encrypted);
}

/**
 * Import and merge an encrypted sync bundle into this device.
 */
export async function importSyncBundle(
  encryptedJson: string,
  phrase: string,
): Promise<{
  mergedHistoryCount: number;
  historySaved: boolean;
  supporterPassRestored: boolean;
  ownerTokensRestored: number;
}> {
  const payload = JSON.parse(encryptedJson);
  const decryptedJson = await decryptText(payload, normalizeSyncPhrase(phrase));
  const bundle: SyncBundle = JSON.parse(decryptedJson);

  if (
    (bundle.version !== 1 && bundle.version !== 2) ||
    !Array.isArray(bundle.history)
  ) {
    throw new Error("Invalid sync bundle format");
  }

  const historyMerge = mergeHistory(bundle.history);
  const ownerTokensRestored = await importOwnerTokens(bundle.ownerTokens);

  // Restore supporter pass if available
  let supporterPassRestored = false;
  if (bundle.supporterPass && !getSupporterPass()) {
    setSupporterPass(bundle.supporterPass);
    supporterPassRestored = true;
  }

  return {
    mergedHistoryCount: historyMerge.mergedCount,
    historySaved: historyMerge.saved,
    supporterPassRestored,
    ownerTokensRestored,
  };
}

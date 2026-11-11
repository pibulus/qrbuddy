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
import {
  generatePassphrase,
  normalizePassphrase,
  WORDS,
} from "./softstack-passport/index.js";

export { WORDS };

const LEGACY_SYNC_WORDS = 4;
const CURRENT_SYNC_WORDS = 12;

export function generateSyncPhrase(): string {
  // Four independently chosen words from the 4,096-word SoftStack bank
  // (4096^4 = 281,474,976,710,656 combinations, 48.0 bits of entropy).
  return generatePassphrase();
}

export function normalizeSyncPhrase(value: string): string {
  return normalizePassphrase(value ?? "");
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
 * Full HistoryItem metadata (including design recipes, tags, batchId, editUrl,
 * and shortCode) is preserved verbatim.
 */
export async function exportSyncBundle(
  phrase: string,
  storageOverride?: Storage,
): Promise<string> {
  const bundle: SyncBundle = {
    version: 2,
    timestamp: Date.now(),
    history: getHistory(storageOverride),
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
  storageOverride?: Storage,
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

  const historyMerge = mergeHistory(bundle.history, storageOverride);
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

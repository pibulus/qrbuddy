// TokenVault: encrypts and stores sensitive owner tokens in localStorage.
// Falls back to plain storage if Web Crypto or localStorage isn't available.

const STORAGE_PREFIX = "qrbuddy_token";
const SECRET_KEY_ITEM = "qrbuddy_token_secret";
const ENCRYPTED_PREFIX = "enc.";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type TokenScope = "qr" | "bucket" | "file";

export interface OwnerTokenRecord {
  scope: TokenScope;
  identifier: string;
  token: string;
}

function getStorage(): Storage | null {
  const scope = globalThis as typeof globalThis & { localStorage?: Storage };
  if (!scope || !scope.localStorage) return null;
  try {
    return scope.localStorage;
  } catch {
    return null;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getCryptoKey(): Promise<CryptoKey | null> {
  const storage = getStorage();
  if (!storage || typeof crypto === "undefined" || !crypto.subtle) {
    return null;
  }

  let secret = storage.getItem(SECRET_KEY_ITEM);
  if (!secret) {
    const secretBytes = crypto.getRandomValues(new Uint8Array(32));
    secret = bufferToBase64(secretBytes.buffer);
    storage.setItem(SECRET_KEY_ITEM, secret);
  }

  try {
    const rawKey = base64ToBuffer(secret);
    return await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    console.error("TokenVault: failed to import key", error);
    return null;
  }
}

async function encryptToken(plain: string): Promise<string | null> {
  const key = await getCryptoKey();
  if (!key || !crypto.subtle) return null;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  try {
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plain),
    );
    const ivPart = bufferToBase64(iv.buffer);
    const cipherPart = bufferToBase64(cipher);
    return `${ENCRYPTED_PREFIX}${ivPart}.${cipherPart}`;
  } catch (error) {
    console.error("TokenVault: encryption failed", error);
    return null;
  }
}

async function decryptToken(payload: string): Promise<string | null> {
  const key = await getCryptoKey();
  if (!key || !crypto.subtle) return null;

  const trimmed = payload.slice(ENCRYPTED_PREFIX.length);
  const [ivPart, cipherPart] = trimmed.split(".");
  if (!ivPart || !cipherPart) return null;

  try {
    const iv = new Uint8Array(base64ToBuffer(ivPart));
    const data = base64ToBuffer(cipherPart);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("TokenVault: decryption failed", error);
    return null;
  }
}

function storageKey(scope: TokenScope, identifier: string): string {
  return `${STORAGE_PREFIX}:${scope}:${identifier}`;
}

export async function saveOwnerToken(
  scope: TokenScope,
  identifier: string,
  token: string,
): Promise<void> {
  const storage = getStorage();
  if (!storage) return;

  try {
    const encrypted = await encryptToken(token);
    if (encrypted) {
      storage.setItem(storageKey(scope, identifier), encrypted);
      return;
    }
  } catch (error) {
    console.error(
      "TokenVault: save failed, falling back to plain storage",
      error,
    );
  }

  storage.setItem(storageKey(scope, identifier), token);
}

export async function getOwnerToken(
  scope: TokenScope,
  identifier: string,
): Promise<string | null> {
  const storage = getStorage();
  if (!storage) return null;

  const value = storage.getItem(storageKey(scope, identifier));
  if (!value) return null;

  if (value.startsWith(ENCRYPTED_PREFIX)) {
    const decrypted = await decryptToken(value);
    if (decrypted) return decrypted;
  }

  return value;
}

export function removeOwnerToken(scope: TokenScope, identifier: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(storageKey(scope, identifier));
}

/** Read owner tokens for inclusion in the encrypted cross-device sync bundle. */
export async function exportOwnerTokens(): Promise<OwnerTokenRecord[]> {
  const storage = getStorage();
  if (!storage) return [];

  const prefix = STORAGE_PREFIX + ":";
  const records: OwnerTokenRecord[] = [];

  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key || !key.startsWith(prefix)) continue;

      const separator = key.indexOf(":", prefix.length);
      if (separator < 0) continue;

      const scope = key.slice(prefix.length, separator);
      const identifier = key.slice(separator + 1);
      if (
        (scope !== "qr" && scope !== "bucket" && scope !== "file") ||
        !identifier
      ) continue;

      const token = await getOwnerToken(scope, identifier);
      if (token) records.push({ scope, identifier, token });
    }
  } catch (error) {
    console.error("TokenVault: export failed", error);
  }

  return records;
}

/** Restore missing owner tokens, encrypting them with this device's vault key. */
export async function importOwnerTokens(records: unknown): Promise<number> {
  if (!Array.isArray(records)) return 0;

  let restored = 0;
  for (const value of records) {
    if (!value || typeof value !== "object") continue;
    const record = value as Partial<OwnerTokenRecord>;
    const { scope, identifier, token } = record;
    if (
      (scope !== "qr" && scope !== "bucket" && scope !== "file") ||
      typeof identifier !== "string" || !identifier ||
      typeof token !== "string" || !token
    ) continue;

    try {
      if (await getOwnerToken(scope, identifier)) continue;
      await saveOwnerToken(scope, identifier, token);
      if (await getOwnerToken(scope, identifier) === token) restored++;
    } catch (error) {
      console.error("TokenVault: import failed", error);
    }
  }

  return restored;
}

// ===================================================================
// ZERO-KNOWLEDGE CLIENT-SIDE ENCRYPTION (Web Crypto API)
// ===================================================================
// Encrypts notes & sync payloads in-browser. Keys live ONLY in URL hash
// fragments (#key=...) or 4-word phrases, never sent to backend servers.

const PBKDF2_ITERATIONS = 100_000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64ToBuffer(base64: string): Uint8Array {
  const padded = base64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically strong random passkey string.
 */
export function generateRandomPasskey(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return bufferToBase64(bytes);
}

/**
 * Derive an AES-GCM 256-bit key from a passkey string + salt.
 */
async function deriveKey(
  passkey: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(passkey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  isEncrypted: true;
}

/**
 * Encrypt a text message with AES-GCM-256.
 */
export async function encryptText(
  plaintext: string,
  passkey: string,
): Promise<EncryptedPayload> {
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveKey(passkey, salt);
  const encoded = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    encoded,
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    isEncrypted: true,
  };
}

/**
 * Decrypt a ciphertext string using AES-GCM-256.
 */
export async function decryptText(
  payload: { ciphertext: string; iv: string; salt: string },
  passkey: string,
): Promise<string> {
  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  const key = await deriveKey(passkey, salt);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// Bucket owner-token + PIN/password verification, shared by functions that
// authorize locker writes. Same logic as the inline copies in
// upload-to-bucket / download-from-bucket (left in place to avoid churning
// deployed functions) — new functions import from here.

export async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(value),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyOwnerToken(
  storedToken: string,
  incomingToken: string,
): Promise<boolean> {
  if (storedToken.length === 64) {
    return (await sha256Hex(incomingToken)) === storedToken;
  }

  return storedToken === incomingToken;
}

export async function verifyPassword(
  storedHash: string | null,
  incomingPassword: string | null,
): Promise<boolean> {
  if (!storedHash || !incomingPassword) return false;

  if (storedHash.includes(":")) {
    const [saltHex, hashHex] = storedHash.split(":");
    return (await sha256Hex(saltHex + incomingPassword)) === hashHex;
  }

  return (await sha256Hex(incomingPassword)) === storedHash;
}

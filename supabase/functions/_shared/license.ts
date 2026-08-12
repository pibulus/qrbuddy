// Supporter pass: self-verifying HMAC-SHA256 token (JWT-shaped), ported from
// TalkType's licenseCrypto to web crypto. Stateless — gates verify the
// signature + expiry without a DB lookup, so no accounts and no extra latency
// on the hot upload/create paths.

const TOKEN_VERSION = 1;
// PRICING says "a year, paid up front" — the token enforces it.
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

const encoder = new TextEncoder();

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

function base64urlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function textToBase64url(value: string): string {
  return bytesToBase64url(encoder.encode(value));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function getLicenseSecret(): string {
  const secret = Deno.env.get("LICENSE_SIGNING_KEY")?.trim() ?? "";
  if (secret.length < 16) {
    throw new Error("LICENSE_SIGNING_KEY is not configured");
  }
  return secret;
}

export interface SupporterPayload {
  tier: "supporter";
  v: number;
  iat: number;
  exp: number;
}

export async function issueSupporterToken(
  secret = getLicenseSecret(),
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const body: SupporterPayload = {
    tier: "supporter",
    v: TOKEN_VERSION,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };
  const signingInput = `${
    textToBase64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  }.${textToBase64url(JSON.stringify(body))}`;
  const key = await importHmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput)),
  );
  return `${signingInput}.${bytesToBase64url(signature)}`;
}

export async function verifySupporterToken(
  token: string | null | undefined,
  secret = getLicenseSecret(),
): Promise<SupporterPayload | null> {
  const [encodedHeader, encodedBody, encodedSignature] = token?.split(".") ??
    [];
  if (!encodedHeader || !encodedBody || !encodedSignature) return null;

  const signature = base64urlToBytes(encodedSignature);
  if (!signature) return null;

  const key = await importHmacKey(secret);
  // crypto.subtle.verify is constant-time — no manual compare needed.
  // (.buffer is safe: base64urlToBytes builds a fresh, offset-0 array.)
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature.buffer as ArrayBuffer,
    encoder.encode(`${encodedHeader}.${encodedBody}`),
  );
  if (!valid) return null;

  try {
    const bodyBytes = base64urlToBytes(encodedBody);
    if (!bodyBytes) return null;
    const body = JSON.parse(new TextDecoder().decode(bodyBytes));
    // Greenfield tokens all carry exp — expired or malformed both fail closed.
    if (
      body?.tier !== "supporter" ||
      !Number.isFinite(body?.exp) ||
      body.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return body as SupporterPayload;
  } catch {
    return null;
  }
}

/** Gate helper: does this request carry a valid supporter pass? Never throws —
 * an unconfigured secret or garbage header just means "no pass". */
export async function requestHasValidPass(req: Request): Promise<boolean> {
  const pass = req.headers.get("x-qrb-pass");
  if (!pass) return false;
  try {
    return (await verifySupporterToken(pass)) !== null;
  } catch {
    return false;
  }
}

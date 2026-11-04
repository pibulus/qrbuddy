// Supporter pass: self-verifying HMAC-SHA256 token (JWT-shaped), ported from
// TalkType's licenseCrypto to web crypto. Stateless — gates verify the
// signature + expiry without a DB lookup, so no accounts and no extra latency
// on the hot upload/create paths.

const TOKEN_VERSION = 1;
// PRICING says "a year, paid up front" — the token enforces it.
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;
// This app's stamp on a SoftStack passport. Verification only accepts it.
const PASSPORT_STAMP = "qrbuddy";

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
  // The passport token is signed by the same secret in all three apps.
  const secret = Deno.env.get("SOFTSTACK_PASSPORT_SECRET")?.trim() ||
    Deno.env.get("LICENSE_SIGNING_KEY")?.trim() || "";
  if (secret.length < 16) {
    throw new Error("LICENSE_SIGNING_KEY is not configured");
  }
  return secret;
}

export interface SupporterPayload {
  tier: "supporter";
  /** Which apps this passport carries. QRBuddy's own stamp is "qrbuddy". */
  stamps?: string[];
  sub?: string;
  code?: string;
  name?: string;
  phrase?: string;
  app?: string;
  v: number;
  iat: number;
  exp: number;
}

export async function issueSupporterToken(
  claimsOrSecret: Record<string, unknown> | string = {},
  maybeSecret?: string,
): Promise<string> {
  // Back-compat: older callers passed the signing secret first.
  const claims = typeof claimsOrSecret === "string" ? {} : claimsOrSecret;
  const secret = typeof claimsOrSecret === "string"
    ? claimsOrSecret
    : (maybeSecret ?? getLicenseSecret());
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = {
    ...claims,
    tier: "supporter",
    stamps: ["qrbuddy"],
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
    // Every app signs with the same shared passport secret, so the signature
    // alone would let one app's token open all four gates. A stamped token must
    // name this app; tokens minted before stamps existed have none and stay valid.
    if (
      Array.isArray(body?.stamps) &&
      body.stamps.length > 0 &&
      !body.stamps.includes(PASSPORT_STAMP)
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

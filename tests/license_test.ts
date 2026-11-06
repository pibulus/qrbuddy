// Offline checks for the supporter pass crypto — the money path gets a test.
import {
  getLicenseSecret,
  issueSupporterToken,
  verifySupporterToken,
} from "../supabase/functions/_shared/license.ts";
import {
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.216.0/assert/mod.ts";

const SECRET = "test-secret-at-least-32-characters!!";

Deno.test("supporter token round-trips", async () => {
  const token = await issueSupporterToken(SECRET);
  const payload = await verifySupporterToken(token, SECRET);
  assertNotEquals(payload, null);
  assertEquals(payload?.tier, "supporter");
  const yearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  assertEquals(Math.abs((payload?.exp ?? 0) - yearFromNow) < 5, true);
});

Deno.test("tampered token fails", async () => {
  const token = await issueSupporterToken(SECRET);
  const [header, body, sig] = token.split(".");
  // Forge a body with a different expiry — signature no longer matches.
  const forgedBody = body.slice(0, -2) + "AA";
  assertEquals(
    await verifySupporterToken(`${header}.${forgedBody}.${sig}`, SECRET),
    null,
  );
});

Deno.test("wrong secret fails", async () => {
  const token = await issueSupporterToken(SECRET);
  assertEquals(
    await verifySupporterToken(token, "some-other-secret-16ch"),
    null,
  );
});

Deno.test("garbage and empty tokens fail", async () => {
  assertEquals(await verifySupporterToken("", SECRET), null);
  assertEquals(await verifySupporterToken("not.a.token", SECRET), null);
  assertEquals(await verifySupporterToken(null, SECRET), null);
});

// All four apps sign with the same shared passport secret, so a TalkType token
// has a genuinely valid QRBuddy signature. Only the stamp claim separates them.
const STAMP_SECRET = "softstack-test-secret-32-chars-min!!";

function base64url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(body: Record<string, unknown>): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(body));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(STAMP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  );
  let binary = "";
  for (const b of sig) binary += String.fromCharCode(b);
  return `${header}.${payload}.${base64url(binary)}`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

Deno.test("rejects a token stamped for another app", async () => {
  const token = await signToken({
    sub: "talktype-license",
    tier: "supporter",
    stamps: ["talktype"],
    v: 1,
    iat: nowSec(),
    exp: nowSec() + 3600,
  });
  assertEquals(await verifySupporterToken(token, STAMP_SECRET), null);
});

Deno.test("accepts a token carrying its own stamp", async () => {
  const token = await signToken({
    sub: "qrbuddy-license",
    tier: "supporter",
    stamps: ["qrbuddy"],
    v: 1,
    iat: nowSec(),
    exp: nowSec() + 3600,
  });
  const payload = await verifySupporterToken(token, STAMP_SECRET);
  assertEquals(payload?.sub, "qrbuddy-license");
  assertEquals(payload?.stamps, ["qrbuddy"]);
});

Deno.test("accepts a legacy token with no stamps claim", async () => {
  const token = await signToken({
    sub: "legacy-license",
    tier: "supporter",
    v: 1,
    iat: nowSec(),
    exp: nowSec() + 3600,
  });
  assertEquals(
    (await verifySupporterToken(token, STAMP_SECRET))?.sub,
    "legacy-license",
  );
});

Deno.test("rejects an expired token even with its own stamp", async () => {
  const token = await signToken({
    sub: "expired-license",
    tier: "supporter",
    stamps: ["qrbuddy"],
    v: 1,
    iat: nowSec() - 3600,
    exp: nowSec() - 10,
  });
  assertEquals(await verifySupporterToken(token, STAMP_SECRET), null);
});

Deno.test("rejects empty or non-array stamps claims instead of treating them as legacy", async () => {
  for (const badStamps of [[], "qrbuddy", {}, null]) {
    const token = await signToken({
      sub: "malformed-stamps",
      tier: "supporter",
      stamps: badStamps,
      v: 1,
      iat: nowSec(),
      exp: nowSec() + 3600,
    });
    assertEquals(await verifySupporterToken(token, STAMP_SECRET), null);
  }
});

Deno.test("getLicenseSecret fails closed when secret is missing or under 32 chars", () => {
  const prevPassport = Deno.env.get("SOFTSTACK_PASSPORT_SECRET");
  const prevLegacy = Deno.env.get("LICENSE_SIGNING_KEY");
  try {
    Deno.env.delete("SOFTSTACK_PASSPORT_SECRET");
    Deno.env.set("LICENSE_SIGNING_KEY", "too-short-16-chr");
    assertThrows(() => getLicenseSecret());
    Deno.env.set("SOFTSTACK_PASSPORT_SECRET", SECRET);
    assertEquals(getLicenseSecret(), SECRET);
  } finally {
    if (prevPassport !== undefined) {
      Deno.env.set("SOFTSTACK_PASSPORT_SECRET", prevPassport);
    } else {
      Deno.env.delete("SOFTSTACK_PASSPORT_SECRET");
    }
    if (prevLegacy !== undefined) {
      Deno.env.set("LICENSE_SIGNING_KEY", prevLegacy);
    } else {
      Deno.env.delete("LICENSE_SIGNING_KEY");
    }
  }
});

import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  buildPassportPhraseUrl,
  buildPassportSyncUrl,
  clearPassport,
  generatePassportIdentity,
  getOrCreatePassport,
  getPassportAuthHeaders,
  getStoredPassport,
  parsePassportFromUrl,
  rerollPassportIdentity,
  savePassport,
  uuidFromPassportSecret,
} from "../utils/passport.ts";
import {
  hashPassportPhrase,
  isPasskeyPhraseLockedOut,
  mintPassportCode,
  mintPassportPhrase,
  recordPasskeyPhraseMiss,
  resetPasskeyPhraseMisses,
} from "../supabase/functions/_shared/passport.ts";
import { getAuthenticatedUser } from "../supabase/functions/_shared/auth.ts";
import { createRateLimitResponse } from "../supabase/functions/_shared/rate-limit.ts";
import {
  clearSupporterPass,
  getSupporterPass,
  setSupporterPass,
} from "../utils/supporter-pass.ts";
import { issueSupporterToken } from "../supabase/functions/_shared/license.ts";

Deno.test("passport - identity generation has required sovereign fields", () => {
  const p = generatePassportIdentity();
  assert(typeof p.id === "string" && p.id.length >= 32);
  assert(typeof p.secret === "string" && p.secret.length === 32);
  assertEquals(p.id, uuidFromPassportSecret(p.secret));
  assert(typeof p.name === "string" && p.name.includes(" "));
  assert(typeof p.avatarEmoji === "string" && p.avatarEmoji.length > 0);
  assert(typeof p.phrase === "string" && p.phrase.split("-").length === 4);
  assertEquals(p.tier, "free");
});

Deno.test("passport - sync url encodes only compact #phrase= in fragment (#) to avoid leaking secrets or server logs", () => {
  const p = generatePassportIdentity();
  const syncUrl = buildPassportSyncUrl(p, "https://qrbuddy.app");

  const url = new URL(syncUrl);
  assertEquals(url.origin, "https://qrbuddy.app");
  assertEquals(url.pathname, "/");
  assertEquals(url.search, ""); // Query string MUST BE EMPTY
  assert(url.hash.startsWith("#"), "Must encode into URL fragment");

  const params = new URLSearchParams(url.hash.slice(1));
  assertEquals(params.get("phrase"), p.phrase);
  assertEquals(params.get("secret"), null);
  assertEquals(params.get("pass"), null);
});

Deno.test("passport - localStorage save, retrieve, and clear lifecycle", () => {
  const p = generatePassportIdentity();
  savePassport(p);

  const stored = getStoredPassport();
  assertEquals(stored?.id, p.id);
  assertEquals(stored?.secret, p.secret);
  assertEquals(stored?.name, p.name);

  clearPassport();
  assertEquals(getStoredPassport(), null);
});

Deno.test("passport - getOrCreatePassport returns existing or mints fresh", () => {
  clearPassport();
  const p1 = getOrCreatePassport();
  assert(p1.id);

  const p2 = getOrCreatePassport();
  assertEquals(p1.id, p2.id);
  assertEquals(p1.secret, p2.secret);

  clearPassport();
});

Deno.test("passport - auth headers format for API requests", () => {
  const p = generatePassportIdentity();
  const headers = getPassportAuthHeaders(p);

  assertEquals(headers["x-passport-id"], p.id);
  assertEquals(headers["Authorization"], `Bearer ${p.secret}`);
});

Deno.test("passport - parsePassportFromUrl extracts from fragment and saves", () => {
  clearPassport();
  const originalLocation = globalThis.location;
  const originalHistory = globalThis.history;

  try {
    const testHash =
      "#passport=11111111-2222-3333-4444-555555555555&secret=aabbccddeeff00112233445566778899&name=Neon%20Axolotl&emoji=%F0%9F%A6%8E&phrase=velvet-cactus-moon-taco";

    // Mock location and history
    // deno-lint-ignore no-explicit-any
    (globalThis as any).location = {
      hash: testHash,
      pathname: "/",
      search: "",
    };
    // deno-lint-ignore no-explicit-any
    (globalThis as any).history = {
      replaceState: () => {},
    };

    const parsed = parsePassportFromUrl();
    assert(parsed);
    assertEquals(parsed.id, "11111111-2222-3333-4444-555555555555");
    assertEquals(parsed.secret, "aabbccddeeff00112233445566778899");
    assertEquals(parsed.name, "Neon Axolotl");

    const stored = getStoredPassport();
    assertEquals(stored?.id, "11111111-2222-3333-4444-555555555555");
  } finally {
    // Restore
    globalThis.location = originalLocation;
    globalThis.history = originalHistory;
    clearPassport();
  }
});

Deno.test("passport - buildPassportSyncUrl emits compact #phrase= and parsePassportFromUrl restores deterministic identity + legacy #pass=", async () => {
  clearPassport();
  clearSupporterPass();
  const originalLocation = globalThis.location;
  const originalHistory = globalThis.history;

  try {
    const token = await issueSupporterToken("test-secret-at-least-16-chars");
    assertEquals(setSupporterPass(token), true);

    const sourcePassport = generatePassportIdentity();
    const syncUrl = buildPassportSyncUrl(sourcePassport, "https://qrbuddy.app");
    const parsedUrl = new URL(syncUrl);

    assertEquals(parsedUrl.search, "");
    const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
    assertEquals(hashParams.get("phrase"), sourcePassport.phrase);
    assertEquals(hashParams.get("secret"), null);
    assertEquals(hashParams.get("pass"), null);

    // Simulate scanning / opening the compact #phrase= URL on a second device
    clearPassport();
    clearSupporterPass();
    assertEquals(getSupporterPass(), null);

    // deno-lint-ignore no-explicit-any
    (globalThis as any).location = {
      hash: parsedUrl.hash,
      pathname: "/",
      search: "",
    };
    // deno-lint-ignore no-explicit-any
    (globalThis as any).history = {
      replaceState: () => {},
    };

    const synced = parsePassportFromUrl();
    assert(synced);
    assertEquals(synced.id, sourcePassport.id);
    assertEquals(synced.secret, sourcePassport.secret);
    assertEquals(synced.phrase, sourcePassport.phrase);

    // Legacy #passport=...&secret=...&pass=... fragment still restores token & plus tier
    clearPassport();
    clearSupporterPass();
    // deno-lint-ignore no-explicit-any
    (globalThis as any).location = {
      hash:
        `#passport=${sourcePassport.id}&secret=${sourcePassport.secret}&phrase=${sourcePassport.phrase}&pass=${
          encodeURIComponent(token)
        }&tier=plus`,
      pathname: "/",
      search: "",
    };
    const legacySynced = parsePassportFromUrl();
    assert(legacySynced);
    assertEquals(legacySynced.id, sourcePassport.id);
    assertEquals(legacySynced.tier, "plus");
    assertEquals(getSupporterPass(), token);
    assertEquals(getStoredPassport()?.tier, "plus");
  } finally {
    globalThis.location = originalLocation;
    globalThis.history = originalHistory;
    clearPassport();
    clearSupporterPass();
  }
});

Deno.test("passport - rerollPassportIdentity updates name and avatarEmoji while preserving id, secret, and phrase", () => {
  clearPassport();
  clearSupporterPass();

  try {
    const original = getOrCreatePassport();
    const rerolled = rerollPassportIdentity(original);

    assertEquals(rerolled.id, original.id);
    assertEquals(rerolled.secret, original.secret);
    assertEquals(rerolled.phrase, original.phrase);
    assertEquals(rerolled.createdAt, original.createdAt);
    assertNotEquals(rerolled.name, original.name);
    assertNotEquals(rerolled.avatarEmoji, original.avatarEmoji);
    assertEquals(getStoredPassport()?.name, rerolled.name);
  } finally {
    clearPassport();
    clearSupporterPass();
  }
});

Deno.test("passport - phrase-root derivation, compact QR URL, and #phrase= restore", async () => {
  clearPassport();
  const originalLocation = globalThis.location;
  const originalHistory = globalThis.history;
  const prevSecret = Deno.env.get("SOFTSTACK_PASSPORT_SECRET");

  try {
    Deno.env.set(
      "SOFTSTACK_PASSPORT_SECRET",
      "softstack-test-secret-32-chars-min!!",
    );
    const phrase = await mintPassportPhrase("checkout-test-001");
    assertEquals(phrase, "umbra-scanner-amplify-cosmos");
    const code = await mintPassportCode(phrase);
    assertEquals(code, "SS-FA39-DE19-4608");
    const codeFromSeed = await mintPassportCode("checkout-test-001");
    assertEquals(codeFromSeed, code);
    const phraseFromCode = await mintPassportPhrase(code);
    assertNotEquals(
      phraseFromCode,
      phrase,
      "SS- code must be one-way and never reverse-derive the phrase",
    );
    const kdfHash = await hashPassportPhrase(phrase);
    assertEquals(
      kdfHash,
      "c3faeae1f885bac6a4ea3624a832247328d641c25004f072f733229fe44e3128",
    );

    const qrUrl = buildPassportPhraseUrl(phrase, "https://qrbuddy.app");
    assertEquals(
      qrUrl,
      "https://qrbuddy.app/#phrase=umbra-scanner-amplify-cosmos",
    );

    // deno-lint-ignore no-explicit-any
    (globalThis as any).location = {
      hash: "#phrase=umbra-scanner-amplify-cosmos",
      pathname: "/",
      search: "",
    };
    // deno-lint-ignore no-explicit-any
    (globalThis as any).history = {
      replaceState: () => {},
    };

    const synced = parsePassportFromUrl();
    assert(synced);
    assertEquals(synced.phrase, "umbra-scanner-amplify-cosmos");
    assertEquals(synced.name, "Misty Ibis");
    assert(synced.id.length === 36);
    assert(synced.secret.length === 32);
    assertEquals(synced.id, uuidFromPassportSecret(synced.secret));
  } finally {
    globalThis.location = originalLocation;
    globalThis.history = originalHistory;
    if (prevSecret !== undefined) {
      Deno.env.set("SOFTSTACK_PASSPORT_SECRET", prevSecret);
    } else {
      Deno.env.delete("SOFTSTACK_PASSPORT_SECRET");
    }
    clearPassport();
  }
});

Deno.test("passport - B3 getAuthenticatedUser rejects bare x-passport-id and requires matching Bearer secret", async () => {
  const p = generatePassportIdentity();

  const bareReq = new Request("https://qrbuddy.app/functions/v1/api-keys", {
    headers: { "x-passport-id": p.id },
  });
  const bareRes = await getAuthenticatedUser(bareReq);
  assertEquals(bareRes.user, null);
  assert(bareRes.error?.includes("Passport secret"));

  const wrongSecretReq = new Request(
    "https://qrbuddy.app/functions/v1/api-keys",
    {
      headers: {
        "x-passport-id": p.id,
        "Authorization": "Bearer 00000000000000000000000000000000",
      },
    },
  );
  const wrongRes = await getAuthenticatedUser(wrongSecretReq);
  assertEquals(wrongRes.user, null);
  assert(wrongRes.error?.includes("Passport secret"));

  const validReq = new Request("https://qrbuddy.app/functions/v1/api-keys", {
    headers: getPassportAuthHeaders(p),
  });
  const validRes = await getAuthenticatedUser(validReq);
  assert(validRes.user);
  assertEquals(validRes.user.id, p.id);
  assertEquals(validRes.error, null);
});

Deno.test("passport - 5-miss passkey lockout returns 429 on 6th miss", () => {
  const phraseKey = "test-lockout-key";
  resetPasskeyPhraseMisses(phraseKey);
  const now = 1_700_000_000_000;

  for (let i = 1; i <= 5; i++) {
    const miss = recordPasskeyPhraseMiss(phraseKey, now);
    assertEquals(
      miss.isLimited,
      false,
      `miss #${i} should return 404, not 429`,
    );
  }

  assertEquals(isPasskeyPhraseLockedOut(phraseKey, now).isLimited, true);
  const sixthMiss = recordPasskeyPhraseMiss(phraseKey, now);
  assertEquals(sixthMiss.isLimited, true);
  const rateResp = createRateLimitResponse(sixthMiss, {});
  assertEquals(rateResp.status, 429);
  resetPasskeyPhraseMisses(phraseKey);
});

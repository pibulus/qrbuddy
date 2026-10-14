import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  buildPassportSyncUrl,
  clearPassport,
  generatePassportIdentity,
  getOrCreatePassport,
  getPassportAuthHeaders,
  getStoredPassport,
  parsePassportFromUrl,
  savePassport,
} from "../utils/passport.ts";

Deno.test("passport - identity generation has required sovereign fields", () => {
  const p = generatePassportIdentity();
  assert(typeof p.id === "string" && p.id.length >= 32);
  assert(typeof p.secret === "string" && p.secret.length === 32);
  assert(typeof p.name === "string" && p.name.includes(" "));
  assert(typeof p.avatarEmoji === "string" && p.avatarEmoji.length > 0);
  assert(typeof p.phrase === "string" && p.phrase.split("-").length === 4);
  assertEquals(p.tier, "free");
});

Deno.test("passport - sync url places all credentials in fragment (#) to avoid server access logs", () => {
  const p = generatePassportIdentity();
  const syncUrl = buildPassportSyncUrl(p, "https://qrbuddy.app");

  const url = new URL(syncUrl);
  assertEquals(url.origin, "https://qrbuddy.app");
  assertEquals(url.pathname, "/");
  assertEquals(url.search, ""); // Query string MUST BE EMPTY
  assert(url.hash.startsWith("#"), "Must encode into URL fragment");

  const params = new URLSearchParams(url.hash.slice(1));
  assertEquals(params.get("passport"), p.id);
  assertEquals(params.get("secret"), p.secret);
  assertEquals(params.get("name"), p.name);
  assertEquals(params.get("emoji"), p.avatarEmoji);
  assertEquals(params.get("phrase"), p.phrase);
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

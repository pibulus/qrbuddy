import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  codeInput,
  deriveLegacyPhrase,
  formatCode,
  generateMemberIdentity,
  getSyncRoomId,
  idInput,
  normalizeCode,
  parseFourWordPasskey,
  PASSPHRASE_ENTROPY_BITS,
  phraseFromHash,
  phraseInput,
  renderMembershipCard,
  selectSkin,
  WORDS,
} from "../utils/softstack-passport/index.js";
import {
  issueSupporterToken,
  verifySupporterToken,
} from "../supabase/functions/_shared/license.ts";

const EXPECTED_MANIFEST_SHA256 =
  "c4169f1c7bc0cfe2a455533f7194e6ee67760a2af2159920114b707c05259ced";

const vector = JSON.parse(
  await Deno.readTextFile(
    new URL("../utils/softstack-passport/test-vectors.json", import.meta.url),
  ),
);

const enc = new TextEncoder();
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(value)),
    ),
  );
}

async function sha256(value: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
  );
}

Deno.test("Passport: bank entropy >= 44 bits (4,096 curated words = 48 bits)", () => {
  assertEquals(WORDS.length, 4096);
  assertEquals(new Set(WORDS).size, 4096);
  assert(PASSPHRASE_ENTROPY_BITS >= 44);
  assertEquals(PASSPHRASE_ENTROPY_BITS, 48);
});

Deno.test("Passport: the shared vector derives phrase -> SS code -> identity", async () => {
  const phraseDigest = await hmacHex(phraseInput(vector.seed), vector.secret);
  const phrase = phraseFromHash(phraseDigest);
  assertEquals(phrase, vector.phrase);

  const digest = await hmacHex(codeInput(phrase), vector.secret);
  const code = formatCode(digest.slice(0, 12));
  assertEquals(code, vector.code);
  assertEquals(normalizeCode(`  ${code.toLowerCase()}  `), vector.code);

  const identity = generateMemberIdentity(
    await sha256(idInput(code)),
    code,
    { phrase },
  );
  assertEquals(identity.name, vector.identity.name);
  assertEquals(identity.phrase, vector.identity.phrase);
  assertEquals(identity.memberId, vector.code);
  assertEquals(getSyncRoomId(phrase), vector.syncRoomId);

  // Legacy holder keeps stored name and legacy phrase
  const legacyIdentity = generateMemberIdentity(
    vector.legacy.vaultHash,
    vector.legacy.code,
  );
  assertEquals(legacyIdentity.name, vector.legacy.name);
  assertEquals(
    deriveLegacyPhrase(vector.legacy.vaultHash),
    vector.legacy.phrase,
  );

  // Phrase with one wrong word fails cleanly in < 50ms
  const t0 = performance.now();
  assertEquals(parseFourWordPasskey(vector.phrase)?.phrase, vector.phrase);
  assertEquals(
    parseFourWordPasskey("umbra-scanner-amplify-notawordinbank"),
    null,
  );
  assert(performance.now() - t0 < 50);
});

Deno.test("Passport: the vector resolves the shared card skin and palette", async () => {
  const hash = await sha256(idInput(vector.code));
  const skin = selectSkin(hash);
  assertEquals(skin.name, vector.card.skin);
  assertEquals(skin.palette.name, vector.card.palette);
  assertEquals(skin.choices, vector.card.choices);
});

Deno.test("Passport: resting card masks words and omits QR; reveals on demand", async () => {
  const hash = await sha256(idInput(vector.code));
  const identity = generateMemberIdentity(hash, vector.code, {
    phrase: vector.phrase,
  });
  const skin = selectSkin(hash);
  const resting = renderMembershipCard({
    identity,
    skin,
    appName: "QRBuddy",
    qrUrl: "https://qrbuddy.app/#sync=test",
    qrImageUrl: "data:image/png;base64,AAAA",
  });

  assert(resting.includes('data-passport-name="Quiet Tapir"'));
  assert(resting.includes('data-passport-masked="true"'));
  assert(!resting.includes(vector.phrase));
  assert(!resting.includes("data:image/png;base64,AAAA"));
  assert(resting.includes(">••••• ••••• ••••• •••••</p>"));

  const html = renderMembershipCard({
    identity,
    skin,
    appName: "QRBuddy",
    revealed: true,
    showQr: true,
    qrUrl: "https://qrbuddy.app/#sync=test",
    qrImageUrl: "data:image/png;base64,AAAA",
  });
  assert(html.includes(`data-passport-phrase="${vector.phrase}"`));
  assert(html.includes('data-member-id="SS-FA39-DE19-4608"'));
  assert(html.includes(">Quiet Tapir</p>"));
  assert(html.includes(`>${vector.phrase}</p>`));
});

Deno.test("Passport: vendored files, pinned manifest hash, and static card.css match", async () => {
  const manifestBytes = await Deno.readFile(
    new URL("../utils/softstack-passport/manifest.json", import.meta.url),
  );
  const actualManifestHash = hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", manifestBytes)),
  );
  assertEquals(actualManifestHash, EXPECTED_MANIFEST_SHA256);

  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  for (const [file, expected] of Object.entries(manifest.files)) {
    const bytes = await Deno.readFile(
      new URL(`../utils/softstack-passport/${file}`, import.meta.url),
    );
    const actual = hex(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    );
    assertEquals(actual, expected, `${file} drifted from canonical module`);
  }

  const vendoredCss = await Deno.readFile(
    new URL("../utils/softstack-passport/card.css", import.meta.url),
  );
  const servedCss = await Deno.readFile(
    new URL("../static/passport-card.css", import.meta.url),
  );
  assertEquals(
    hex(new Uint8Array(await crypto.subtle.digest("SHA-256", servedCss))),
    hex(new Uint8Array(await crypto.subtle.digest("SHA-256", vendoredCss))),
  );
});

Deno.test("Passport: the token carries code and a qrbuddy stamp", async () => {
  Deno.env.set("LICENSE_SIGNING_KEY", "test-license-signing-key-32-chars!!");
  const token = await issueSupporterToken({
    sub: vector.code,
    code: vector.code,
    name: vector.identity.name,
    phrase: vector.identity.phrase,
  });
  const payload = await verifySupporterToken(token);
  assert(payload);
  assertEquals(payload.code, vector.code);
  assertEquals(payload.name, vector.identity.name);
  assertEquals(payload.stamps, ["qrbuddy"]);
  assertEquals(payload.sub, vector.code);
});

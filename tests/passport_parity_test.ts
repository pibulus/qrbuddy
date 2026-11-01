import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  codeInput,
  formatCode,
  generateMemberIdentity,
  idInput,
  normalizeCode,
} from "../utils/softstack-passport/index.js";
import {
  issueSupporterToken,
  verifySupporterToken,
} from "../supabase/functions/_shared/license.ts";

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

Deno.test("Passport: the shared vector mints SS code and identity", async () => {
  const digest = await hmacHex(codeInput(vector.seed), vector.secret);
  const code = formatCode(digest.slice(0, 12));
  assertEquals(code, vector.code);
  assertEquals(normalizeCode(`  ${code.toLowerCase()}  `), vector.code);

  const identity = generateMemberIdentity(
    await sha256(idInput(code)),
    code,
  );
  assertEquals(identity.name, vector.identity.name);
  assertEquals(identity.phrase, vector.identity.phrase);
  assertEquals(identity.memberId, vector.code);
});

Deno.test("Passport: vendored files match the canonical manifest", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(
      new URL("../utils/softstack-passport/manifest.json", import.meta.url),
    ),
  );
  for (const [file, expected] of Object.entries(manifest.files)) {
    const bytes = await Deno.readFile(
      new URL(`../utils/softstack-passport/${file}`, import.meta.url),
    );
    const actual = hex(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    );
    assertEquals(actual, expected, `${file} drifted from canonical module`);
  }
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

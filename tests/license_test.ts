// Offline checks for the supporter pass crypto — the money path gets a test.
import {
  issueSupporterToken,
  verifySupporterToken,
} from "../supabase/functions/_shared/license.ts";
import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";

const SECRET = "test-secret-at-least-16-chars";

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

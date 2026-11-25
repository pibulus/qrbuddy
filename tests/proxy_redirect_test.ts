import { assert, assertEquals } from "$std/assert/mod.ts";
import { buildRedirectUpstreamHeaders } from "../utils/proxy-context.ts";
import { handler as redirectHandler } from "../routes/r.tsx";
import { resolveScannerContext } from "../supabase/functions/_shared/proxy-trust.ts";

const TEST_SECRET = "qrbuddy-test-proxy-secret-32-chars!!";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
) {
  const prev = new Map(
    Object.keys(vars).map((k) => [k, Deno.env.get(k)]),
  );
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }
  return fn().finally(() => {
    for (const [k, v] of prev) {
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  });
}

Deno.test("proxy-context: strips all cf-* headers and signs sanitized x-qrb-* metadata", async () => {
  const req = new Request("https://qrbuddy.app/r?code=abc123", {
    headers: {
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      "accept-language": "es-MX,es;q=0.9",
      "cf-connecting-ip": "203.0.113.42",
      "cf-ipcountry": "au",
      "cf-ipcity": "Melbourne",
      "cf-timezone": "Australia/Melbourne",
      "x-forwarded-for": "198.51.100.9",
    },
  });

  const headers = await buildRedirectUpstreamHeaders(
    req,
    { apikey: "anon-key" },
    {},
    TEST_SECRET,
  );

  for (const key of Object.keys(headers)) {
    assert(
      !key.toLowerCase().startsWith("cf-"),
      `upstream header must not include ${key}`,
    );
  }
  assertEquals(headers["x-qrb-client-ip"], "203.0.113.42");
  assertEquals(headers["x-qrb-country"], "AU");
  assertEquals(headers["x-qrb-city"], "Melbourne");
  assertEquals(headers["x-qrb-timezone"], "Australia/Melbourne");
  assertEquals(typeof headers["x-qrb-proxy-sig"], "string");
  assertEquals(headers["x-qrb-proxy-sig"].length, 64);

  // Spoofed/IP-literal city values must be dropped
  const ipCityReq = new Request("https://qrbuddy.app/r?code=abc123", {
    headers: {
      "cf-connecting-ip": "1.2.3.4",
      "cf-ipcity": "1.2.3.4",
      "cf-ipcountry": "XX",
    },
  });
  const sanitized = await buildRedirectUpstreamHeaders(
    ipCityReq,
    {},
    {},
    TEST_SECRET,
  );
  assertEquals(sanitized["x-qrb-city"], undefined);
  assertEquals(sanitized["x-qrb-country"], undefined);

  await withEnv({ SOFTSTACK_PASSPORT_SECRET: TEST_SECRET }, async () => {
    const trusted = await resolveScannerContext(
      new Request("https://edge.test/redirect-qr?code=abc123", {
        headers,
      }),
    );
    assertEquals(trusted.trustedProxy, true);
    assertEquals(trusted.ip, "203.0.113.42");
    assertEquals(trusted.country, "AU");
    assertEquals(trusted.city, "Melbourne");
    assertEquals(trusted.timezone, "Australia/Melbourne");

    // Unsigned direct calls cannot spoof x-qrb-* or inject IP literals into city
    const spoofed = await resolveScannerContext(
      new Request("https://edge.test/redirect-qr?code=abc123", {
        headers: {
          "x-qrb-client-ip": "198.51.100.77",
          "x-qrb-city": "Fakeville",
          "cf-ipcity": "1.2.3.4",
          "cf-ipcountry": "XX",
        },
      }),
    );
    assertEquals(spoofed.trustedProxy, false);
    assertEquals(spoofed.ip, "unknown");
    assertEquals(spoofed.city, "Unknown");
    assertEquals(spoofed.country, "Unknown");
  });
});

Deno.test("routes/r.tsx: strips cf-*, passes 302 through, and fails closed 503 on gateway 403", () =>
  withEnv({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon-key",
    SOFTSTACK_PASSPORT_SECRET: TEST_SECRET,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let seenHeaders: Headers | null = null;
    try {
      // 1. Upstream 302 passes through cleanly without cf-* headers
      globalThis.fetch = (_input, init) => {
        seenHeaders = new Headers(init?.headers);
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: "https://example.org/moved" },
          }),
        );
      };
      const okRes = await redirectHandler.GET!(
        new Request("https://qrbuddy.app/r?code=ey027p", {
          headers: {
            "cf-connecting-ip": "203.0.113.5",
            "cf-ipcity": "Melbourne",
            "cf-ipcountry": "AU",
          },
        }),
        {} as never,
      );
      assertEquals(okRes.status, 302);
      assertEquals(okRes.headers.get("Location"), "https://example.org/moved");
      assertEquals(seenHeaders!.get("cf-connecting-ip"), null);
      assertEquals(seenHeaders!.get("x-qrb-client-ip"), "203.0.113.5");
      assertEquals(seenHeaders!.get("x-qrb-city"), "Melbourne");

      // 2. Upstream 403 must return 503 routingUnavailable, NEVER 302 "/"
      globalThis.fetch = () =>
        Promise.resolve(new Response("Forbidden", { status: 403 }));
      const blockedRes = await redirectHandler.GET!(
        new Request("https://qrbuddy.app/r?code=ey027p"),
        {} as never,
      );
      assertEquals(blockedRes.status, 503);
      assertEquals(blockedRes.headers.get("Location"), null);

      // 3. Upstream 404/410 -> /boom; POST unlock -> 200 Splash sets unlock cookie
      globalThis.fetch = () =>
        Promise.resolve(new Response(null, { status: 410 }));
      const boomRes = await redirectHandler.GET!(
        new Request("https://qrbuddy.app/r?code=dead"),
        {} as never,
      );
      assertEquals(boomRes.status, 302);
      assertEquals(boomRes.headers.get("Location"), "/boom");

      globalThis.fetch = () =>
        Promise.resolve(
          new Response("<!doctype html><html><body>Splash</body></html>", {
            status: 200,
            headers: { "X-QR-Unlock": "tok123" },
          }),
        );
      const form = new FormData();
      form.set("pin", "4417");
      const postRes = await redirectHandler.POST!(
        new Request("https://qrbuddy.app/r?code=locked1", {
          method: "POST",
          body: form,
        }),
        {} as never,
      );
      assertEquals(postRes.status, 200);
      assertEquals(
        postRes.headers.get("Set-Cookie")?.includes("qru_locked1=tok123"),
        true,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }));

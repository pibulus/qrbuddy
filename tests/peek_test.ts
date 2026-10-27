import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  buildScreenshotUrl,
  extractMeta,
  handler,
  isPrivateHost,
} from "../routes/api/peek.ts";
import type { FreshContext } from "$fresh/server.ts";

const mockContext = {} as unknown as FreshContext;

Deno.test("api/peek - blocks missing or invalid url", async () => {
  const req = new Request("http://localhost/api/peek");
  const res = await handler.GET!(req, mockContext);
  assertEquals(res.status, 400);

  const invalidReq = new Request("http://localhost/api/peek?url=not-a-url");
  const invalidRes = await handler.GET!(invalidReq, mockContext);
  assertEquals(invalidRes.status, 400);
});

Deno.test("api/peek - blocks internal and private addresses", async () => {
  const localReq = new Request(
    "http://localhost/api/peek?url=http://localhost:8000",
  );
  const localRes = await handler.GET!(localReq, mockContext);
  assertEquals(localRes.status, 403);

  const ipReq = new Request("http://localhost/api/peek?url=http://192.168.1.1");
  const ipRes = await handler.GET!(ipReq, mockContext);
  assertEquals(ipRes.status, 403);

  const loopbackReq = new Request(
    "http://localhost/api/peek?url=http://127.0.0.1:3000",
  );
  const loopbackRes = await handler.GET!(loopbackReq, mockContext);
  assertEquals(loopbackRes.status, 403);

  assertEquals(isPrivateHost("169.254.169.254"), true);
  assertEquals(isPrivateHost("10.0.0.1"), true);
  assertEquals(isPrivateHost("172.16.0.5"), true);
  assertEquals(isPrivateHost("[::1]"), true);
  assertEquals(
    isPrivateHost(new URL("http://[::ffff:127.0.0.1]/").hostname),
    true,
  );
  assertEquals(
    isPrivateHost(new URL("http://[::ffff:169.254.169.254]/").hostname),
    true,
  );
  assertEquals(isPrivateHost("localhost."), true);
  assertEquals(isPrivateHost("qrbuddy.app"), false);

  // Never leak URL #hash fragments to mshots screenshot URLs
  assertEquals(
    buildScreenshotUrl("https://qrbuddy.app/#passport=123&secret=abc"),
    "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fqrbuddy.app%2F?w=640&h=400",
  );
});

Deno.test("api/peek - blocks SSRF via open redirect hop to private host", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (url === "https://short.example/abc") {
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: "https://tracker.example/hop" },
        }),
      );
    }
    if (url === "https://tracker.example/hop") {
      return Promise.resolve(
        new Response(null, {
          status: 301,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
      );
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }) as typeof fetch;

  try {
    const req = new Request(
      "http://localhost/api/peek?url=" +
        encodeURIComponent("https://short.example/abc"),
    );
    const res = await handler.GET!(req, mockContext);
    assertEquals(res.status, 403);
    const body = await res.json();
    assertEquals(body.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("api/peek - unrolls multi-hop redirect chain and returns screenshotUrl, isHttps, statusCode", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (url === "http://qr.example/1") {
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: "https://mid.example/2" },
        }),
      );
    }
    if (url === "https://mid.example/2") {
      return Promise.resolve(
        new Response(null, {
          status: 301,
          headers: { location: "https://final.example/landing" },
        }),
      );
    }
    if (url === "https://final.example/landing") {
      const html = `<!doctype html><html><head>
        <title>Final Destination</title>
        <meta name="description" content="Safe street scan preview" />
        <meta name="twitter:image" content="/assets/preview-card.png" />
      </head><body></body></html>`;
      return Promise.resolve(
        new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }) as typeof fetch;

  try {
    const req = new Request(
      "http://localhost/api/peek?url=" +
        encodeURIComponent("http://qr.example/1"),
    );
    const res = await handler.GET!(req, mockContext);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.ok, true);
    assertEquals(data.isRedirected, true);
    assertEquals(data.redirectChain, [
      "http://qr.example/1",
      "https://mid.example/2",
      "https://final.example/landing",
    ]);
    assertEquals(data.finalUrl, "https://final.example/landing");
    assertEquals(data.domain, "final.example");
    assertEquals(data.isHttps, true);
    assertEquals(data.statusCode, 200);
    assertEquals(data.title, "Final Destination");
    assertEquals(data.description, "Safe street scan preview");
    assertEquals(data.image, "https://final.example/assets/preview-card.png");
    assertEquals(
      data.screenshotUrl,
      buildScreenshotUrl("https://final.example/landing"),
    );
    assert(data.screenshotUrl.includes("s.wordpress.com/mshots/v1/"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("extractMeta - falls back from og:image to twitter:image and apple-touch-icon", () => {
  const twitterHtml =
    `<head><title>T</title><meta name="twitter:image" content="/tw.jpg"></head>`;
  assertEquals(
    extractMeta(twitterHtml, "https://example.com/page").image,
    "https://example.com/tw.jpg",
  );

  const iconHtml =
    `<head><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></head>`;
  assertEquals(
    extractMeta(iconHtml, "https://example.com/page").image,
    "https://example.com/apple-touch-icon.png",
  );

  // Blocks private-host image URLs
  const privateImgHtml =
    `<head><meta property="og:image" content="http://127.0.0.1/secret.png"></head>`;
  assertEquals(
    extractMeta(privateImgHtml, "https://example.com/page").image,
    null,
  );
});

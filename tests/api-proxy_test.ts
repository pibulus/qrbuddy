import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../routes/api/[...path].ts";

/** The proxy must never forward a path that could reach another host. */
function ctx(path: string) {
  return { params: { path } } as unknown as Parameters<
    NonNullable<typeof handler.GET>
  >[1];
}

Deno.test("api proxy rejects path traversal", async () => {
  for (const path of ["../admin", "a/b", "..", "a b", "UPPER"]) {
    const response = await handler.GET!(
      new Request("https://qrbuddy.app/api/x"),
      ctx(path),
    );
    assertEquals(response.status, 404, `path "${path}" should be rejected`);
  }
});

Deno.test("api proxy answers CORS preflight", async () => {
  const response = await handler.OPTIONS!(
    new Request("https://qrbuddy.app/api/create-dynamic-qr", {
      method: "OPTIONS",
      headers: { origin: "https://qrbuddy.app" },
    }),
    ctx("create-dynamic-qr"),
  );
  assertEquals(response.status, 204);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://qrbuddy.app",
  );
  assertEquals(
    response.headers.get("Access-Control-Allow-Headers")?.includes("x-api-key"),
    true,
  );
});

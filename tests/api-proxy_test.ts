import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../routes/v1/[fn].ts";

function ctx(name = "health") {
  return { params: { fn: name } } as unknown as Parameters<
    NonNullable<typeof handler.GET>
  >[1];
}

Deno.test("api proxy reports a missing backend plainly", async () => {
  // The test environment has no SUPABASE_URL: the proxy must say so instead of
  // throwing a 500 or pretending it worked.
  const response = await handler.GET!(
    new Request("https://qrbuddy.app/api/health"),
    ctx(),
  );
  assertEquals(response.status, 503);
  const body = await response.json();
  assertEquals(body.error, "API is not configured on this deployment.");
});

Deno.test("api proxy answers CORS preflight with the API headers", async () => {
  const response = await handler.OPTIONS!(
    new Request("https://qrbuddy.app/api/health", {
      method: "OPTIONS",
      headers: { origin: "https://qrbuddy.app" },
    }),
    ctx(),
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

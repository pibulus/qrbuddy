import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../routes/v1/api-keys.ts";

function ctx() {
  return { params: {} } as unknown as Parameters<
    NonNullable<typeof handler.GET>
  >[1];
}

Deno.test("api route reports a missing backend plainly", async () => {
  // No SUPABASE_URL in the test env: the proxy must say so rather than throw.
  const response = await handler.GET!(
    new Request("https://qrbuddy.app/v1/api-keys"),
    ctx(),
  );
  assertEquals(response.status, 503);
  const body = await response.json();
  assertEquals(body.error, "API is not configured on this deployment.");
});

Deno.test("api route answers CORS preflight with the API headers", async () => {
  const response = await handler.OPTIONS!(
    new Request("https://qrbuddy.app/v1/api-keys", {
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

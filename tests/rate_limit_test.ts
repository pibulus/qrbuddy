import { assert, assertEquals, assertMatch } from "$std/assert/mod.ts";
import {
  checkRateLimitWithRpc,
  createRateLimitResponse,
} from "../supabase/functions/_shared/rate-limit.ts";

const now = Date.parse("2026-10-13T12:00:00.000Z");
const config = {
  scope: "test-create-bucket",
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
};

Deno.test("rate limit hashes caller and scope before the RPC", async () => {
  const rpcCalls: Array<{
    p_key_hash: string;
    p_window_seconds: number;
    p_max_requests: number;
  }> = [];
  const result = await checkRateLimitWithRpc(
    "203.0.113.10",
    config,
    "test-service-role-secret",
    (args) => {
      rpcCalls.push(args);
      return Promise.resolve({
        data: {
          request_count: 1,
          reset_at: new Date(now + config.windowMs).toISOString(),
        },
      });
    },
    now,
  );

  assertEquals(result.isLimited, false);
  assertEquals(result.remaining, 9);
  assertEquals(result.limit, 10);
  assertEquals(rpcCalls.length, 1);
  const [rpcArgs] = rpcCalls;
  const keyHash = rpcArgs.p_key_hash;
  assertMatch(keyHash, /^[0-9a-f]{64}$/);
  assertEquals(keyHash.includes("203.0.113.10"), false);
  assertEquals(rpcArgs.p_window_seconds, 3600);
  assertEquals(rpcArgs.p_max_requests, 10);
});

Deno.test("rate limit scopes produce separate durable keys", async () => {
  const hashes: string[] = [];
  for (const scope of ["create-bucket", "upload-file"]) {
    await checkRateLimitWithRpc(
      "same-caller",
      { ...config, scope },
      "test-service-role-secret",
      (args) => {
        hashes.push(String(args.p_key_hash));
        return Promise.resolve({
          data: {
            request_count: 1,
            reset_at: new Date(now + config.windowMs).toISOString(),
          },
        });
      },
      now,
    );
  }
  assertEquals(hashes.length, 2);
  assert(hashes[0] !== hashes[1]);
});

Deno.test("durable limit denies over-cap counts with a 429 response", async () => {
  const result = await checkRateLimitWithRpc(
    "caller",
    { ...config, maxRequests: 2 },
    "test-service-role-secret",
    () =>
      Promise.resolve({
        data: {
          request_count: 3,
          reset_at: new Date(now + 30_000).toISOString(),
        },
      }),
    now,
  );

  assertEquals(result.isLimited, true);
  assertEquals(result.remaining, 0);
  assertEquals(result.retryAfter, 30);
  const response = createRateLimitResponse(result, {});
  assertEquals(response.status, 429);
  assertEquals(response.headers.get("Retry-After"), "30");
});

Deno.test("RPC failure fails closed with 503", async () => {
  const result = await checkRateLimitWithRpc(
    "caller",
    config,
    "test-service-role-secret",
    () => Promise.resolve({ error: new Error("database unavailable") }),
    now,
  );

  assertEquals(result.isLimited, true);
  assertEquals(result.unavailable, true);
  const response = createRateLimitResponse(result, {});
  assertEquals(response.status, 503);
  assertEquals(response.headers.get("Retry-After"), "5");
});

Deno.test("invalid RPC response fails closed", async () => {
  const result = await checkRateLimitWithRpc(
    "caller",
    config,
    "test-service-role-secret",
    () =>
      Promise.resolve({ data: { request_count: "1", reset_at: "bad date" } }),
    now,
  );

  assertEquals(result.isLimited, true);
  assertEquals(result.unavailable, true);
});

const localSupabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const localServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const isLocalSupabase =
  /^(http:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i
    .test(localSupabaseUrl.replace(/^https?:\/\//i, ""));

Deno.test({
  name: "local RPC counts concurrent requests atomically",
  ignore: !isLocalSupabase || !localServiceRoleKey,
  async fn() {
    const supabaseUrl = localSupabaseUrl.replace(/\/+$/, "");
    const burst = 24;
    const maxRequests = 5;
    const identifier = `local-test-${crypto.randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: burst }, () =>
        checkRateLimitWithRpc(
          identifier,
          {
            scope: "local-atomicity-test",
            windowMs: 60_000,
            maxRequests,
          },
          localServiceRoleKey,
          async (args) => {
            const response = await fetch(
              `${supabaseUrl}/rest/v1/rpc/consume_edge_rate_limit`,
              {
                method: "POST",
                headers: {
                  "apikey": localServiceRoleKey,
                  "Authorization": `Bearer ${localServiceRoleKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(args),
              },
            );
            if (!response.ok) return { error: response.status };
            return { data: await response.json() };
          },
        )),
    );

    assertEquals(
      results.filter((result) => !result.isLimited).length,
      maxRequests,
    );
    assertEquals(
      results.filter((result) => result.isLimited).length,
      burst - maxRequests,
    );
  },
});

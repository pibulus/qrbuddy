export interface RateLimitConfig {
  scope: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
  unavailable?: boolean;
}

interface RateLimitRpcArgs {
  p_key_hash: string;
  p_window_seconds: number;
  p_max_requests: number;
}

type RateLimitRpc = (
  args: RateLimitRpcArgs,
) => Promise<{ data?: unknown; error?: unknown }>;

const encoder = new TextEncoder();
const UNAVAILABLE_RETRY_SECONDS = 5;

async function hashRateLimitKey(
  secret: string,
  scope: string,
  identifier: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(JSON.stringify([scope, identifier])),
    ),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function unavailableResult(
  config: RateLimitConfig,
  now: number,
): RateLimitResult {
  return {
    isLimited: true,
    remaining: 0,
    resetTime: now + UNAVAILABLE_RETRY_SECONDS * 1000,
    limit: config.maxRequests,
    retryAfter: UNAVAILABLE_RETRY_SECONDS,
    unavailable: true,
  };
}

/**
 * Apply a durable limit through an injected RPC. Exported so unit tests can
 * exercise hashing, RPC arguments, and fail-closed behavior without a DB.
 */
export async function checkRateLimitWithRpc(
  identifier: string,
  config: RateLimitConfig,
  secret: string,
  rpc: RateLimitRpc,
  now = Date.now(),
): Promise<RateLimitResult> {
  if (
    !secret || !config.scope || config.scope.length > 80 ||
    !identifier || identifier.length > 4096 ||
    !Number.isInteger(config.windowMs) || config.windowMs < 1000 ||
    config.windowMs > 24 * 60 * 60 * 1000 ||
    !Number.isInteger(config.maxRequests) || config.maxRequests < 1 ||
    config.maxRequests > 100_000
  ) {
    return unavailableResult(config, now);
  }

  try {
    const keyHash = await hashRateLimitKey(
      secret,
      config.scope,
      identifier,
    );
    const { data, error } = await rpc({
      p_key_hash: keyHash,
      p_window_seconds: Math.ceil(config.windowMs / 1000),
      p_max_requests: config.maxRequests,
    });
    if (error || !data || typeof data !== "object") {
      return unavailableResult(config, now);
    }

    const result = data as { request_count?: unknown; reset_at?: unknown };
    if (
      !Number.isInteger(result.request_count) ||
      typeof result.reset_at !== "string"
    ) {
      return unavailableResult(config, now);
    }

    const count = result.request_count as number;
    const resetTime = Date.parse(result.reset_at);
    if (!Number.isFinite(resetTime)) {
      return unavailableResult(config, now);
    }

    const isLimited = count > config.maxRequests;
    return {
      isLimited,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
      limit: config.maxRequests,
      ...(isLimited
        ? { retryAfter: Math.max(1, Math.ceil((resetTime - now) / 1000)) }
        : {}),
    };
  } catch {
    return unavailableResult(config, now);
  }
}

/** Check a scoped request limit shared across all edge-function instances. */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return unavailableResult(config, now);
  }

  return await checkRateLimitWithRpc(
    identifier,
    config,
    serviceRoleKey,
    async (args) => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        UNAVAILABLE_RETRY_SECONDS * 1000,
      );
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/rpc/consume_edge_rate_limit`,
          {
            method: "POST",
            headers: {
              "apikey": serviceRoleKey,
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(args),
            signal: controller.signal,
          },
        );
        if (!response.ok) return { error: response.status };
        return { data: await response.json() };
      } finally {
        clearTimeout(timeout);
      }
    },
    now,
  );
}

/** Share PIN attempt counters across download and upload authorization paths. */
export async function checkBucketPinRateLimit(
  bucketCode: string,
  callerIP: string,
): Promise<RateLimitResult | null> {
  // These count every submitted PIN, including a correct one. Keeping both
  // scopes shared across functions prevents a new isolate or endpoint from
  // resetting the allowance.
  const callerLimit = await checkRateLimit(
    JSON.stringify([bucketCode, callerIP]),
    {
      scope: "bucket-pin-caller",
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    },
  );
  if (callerLimit.isLimited) return callerLimit;

  const lockerLimit = await checkRateLimit(bucketCode, {
    scope: "bucket-pin-locker",
    windowMs: 60 * 60 * 1000,
    maxRequests: 30,
  });
  return lockerLimit.isLimited ? lockerLimit : null;
}

/** Get the best client IP header exposed by the edge platform. */
export function getClientIP(req: Request): string {
  const headers = req.headers;
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  return "unknown";
}

/** Create the standard rate-limit response, using 503 if storage is unavailable. */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter) headers["Retry-After"] = String(result.retryAfter);

  const unavailable = result.unavailable === true;
  return new Response(
    JSON.stringify({
      error: unavailable
        ? "Rate limiting is temporarily unavailable. Please retry."
        : "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: unavailable ? 503 : 429,
      headers,
    },
  );
}

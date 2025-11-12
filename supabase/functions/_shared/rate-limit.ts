// Simple in-memory rate limiter for edge functions
// For production with multiple edge function instances, consider using Upstash Redis or Supabase KV

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (resets on function cold start, which is acceptable for basic protection)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and retry info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // No record or window expired - create new record
  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });

    return {
      isLimited: false,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Window still active - check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      isLimited: true,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000), // seconds
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);

  return {
    isLimited: false,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get client IP address from request
 * @param req - Request object
 * @returns IP address or 'unknown'
 */
export function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const headers = req.headers;

  // Cloudflare
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Standard forwarding headers
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  // Fallback
  return "unknown";
}

/**
 * Create rate limit response
 * @param result - Rate limit check result
 * @param corsHeaders - CORS headers to include
 * @returns Response object
 */
export function createRateLimitResponse(
  result: { isLimited: boolean; remaining: number; resetTime: number; retryAfter?: number },
  corsHeaders: Record<string, string>,
): Response {
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "X-RateLimit-Limit": String(result.remaining + (result.isLimited ? 0 : 1)),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    },
  );
}

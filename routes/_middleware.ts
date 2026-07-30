import { FreshContext } from "$fresh/server.ts";

/**
 * Security headers on every response.
 *
 * QRBuddy was serving NONE of these — not even HSTS. Added 2026-07-31.
 *
 * X-Frame-Options is DENY here, unlike ProMapper's SAMEORIGIN. QRBuddy embeds
 * Ko-fi in an iframe (islands/KofiModal.tsx), but that direction is governed by
 * Ko-fi's headers, not ours — this header only controls who may frame QRBuddy,
 * and nothing needs to.
 *
 * No Content-Security-Policy yet, on purpose: the Ko-fi embed and the QR
 * rendering path would each need their origins enumerated, and a CSP that
 * misses one breaks a feature silently. Its own pass, verified against the
 * running app.
 */
export async function handler(_req: Request, ctx: FreshContext) {
  const resp = await ctx.next();

  resp.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("X-Content-Type-Options", "nosniff");

  return resp;
}

import { Handlers } from "$fresh/server.ts";

/**
 * Liveness probe for uptime checks. Deliberately cheap: no DB, no auth, no
 * rate limiter. Never cached, so a monitor sees the current deployment.
 */
export const handler: Handlers = {
  GET() {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "qrbuddy",
        deployment: Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local",
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
        },
      },
    );
  },
};

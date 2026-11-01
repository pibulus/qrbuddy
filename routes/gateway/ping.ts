import type { Handlers } from "$fresh/server.ts";

// Minimal probe route: proves whether a brand-new static route is reachable.
export const handler: Handlers = {
  GET() {
    return new Response(JSON.stringify({ ok: true, route: "gateway/ping" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

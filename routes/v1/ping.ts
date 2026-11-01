import { Handlers } from "$fresh/server.ts";

// Static probe under /v1: proves whether a new *static* route works there.
export const handler: Handlers = {
  GET() {
    return new Response(JSON.stringify({ ok: true, route: "/v1/ping" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

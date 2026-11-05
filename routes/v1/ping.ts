import { Handlers } from "$fresh/server.ts";

// Probe route: proves the /v1 folder is served at all.
export const handler: Handlers = {
  GET() {
    return new Response(JSON.stringify({ ok: true, route: "/v1/ping" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

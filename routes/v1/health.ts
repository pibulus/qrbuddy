// Self-contained probe: same proxy work, zero shared imports. If this answers
// and the imported version does not, the fault is the module import itself.
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    let supabaseUrl = "";
    try {
      supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    } catch (error) {
      return new Response(
        JSON.stringify({ env: "threw", message: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "no supabase url" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const upstream = await fetch(`${supabaseUrl}/functions/v1/health`, {
        signal: AbortSignal.timeout(20_000),
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ fetch: "threw", message: String(error) }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};

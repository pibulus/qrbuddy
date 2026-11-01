// Public API surface: qrbuddy.app/v1/<function>
//
// Not under /api. On Deno Deploy, every route added under /api/ after the two
// original ones (peek, download-file) killed the isolate before any handler
// ran — Cloudflare 520 on the domain, connection reset on the *.deno.net
// preview host, with a correct manifest and a rebuilt snapshot. /v1 is a clean
// prefix, reads like an API version, and leaves room for /v2 later.
import { Handlers } from "$fresh/server.ts";
import { handleApiRequest, preflight } from "../../utils/api-proxy.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    return preflight(req);
  },
  GET(req, ctx) {
    return handleApiRequest(req, ctx.params.fn ?? "");
  },
  POST(req, ctx) {
    return handleApiRequest(req, ctx.params.fn ?? "");
  },
  PATCH(req, ctx) {
    return handleApiRequest(req, ctx.params.fn ?? "");
  },
  PUT(req, ctx) {
    return handleApiRequest(req, ctx.params.fn ?? "");
  },
  DELETE(req, ctx) {
    return handleApiRequest(req, ctx.params.fn ?? "");
  },
};

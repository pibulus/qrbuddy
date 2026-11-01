// Public API surface: qrbuddy.app/gateway/<function>
//
// The same proxy that lives under /api — kept here because /api/* returns 520
// from the edge for routes added after the original two, while /f/[code] and
// other dynamic routes serve normally.
import type { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    return new Response(null, {
      status: 204,
      headers: { Vary: "Origin", "Access-Control-Allow-Origin": "*" },
    });
  },
  GET(req, ctx) {
    return makeApiHandler(ctx.params.fn ?? "").GET!(req, ctx);
  },
  POST(req, ctx) {
    return makeApiHandler(ctx.params.fn ?? "").POST!(req, ctx);
  },
  PATCH(req, ctx) {
    return makeApiHandler(ctx.params.fn ?? "").PATCH!(req, ctx);
  },
  PUT(req, ctx) {
    return makeApiHandler(ctx.params.fn ?? "").PUT!(req, ctx);
  },
  DELETE(req, ctx) {
    return makeApiHandler(ctx.params.fn ?? "").DELETE!(req, ctx);
  },
};

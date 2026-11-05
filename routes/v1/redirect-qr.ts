// Resolve a short code.
// Static route on purpose: on this deployment only *static* files in a new
// folder survive (proved 2026-11-05: /v1/ping 200, /v1/[fn] 500). One file per
// endpoint also makes the public contract readable — the folder is the API.
import { Handlers } from "$fresh/server.ts";
import { handleApiRequest } from "../../utils/api-proxy.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-api-key, x-passport-id, content-type, apikey",
        Vary: "Origin",
      },
    });
  },
  GET(req) {
    return handleApiRequest(req, "redirect-qr");
  },
  POST(req) {
    return handleApiRequest(req, "redirect-qr");
  },
  PATCH(req) {
    return handleApiRequest(req, "redirect-qr");
  },
  PUT(req) {
    return handleApiRequest(req, "redirect-qr");
  },
  DELETE(req) {
    return handleApiRequest(req, "redirect-qr");
  },
};

// Resolve a short code.
// Public route: qrbuddy.app/api/redirect-qr → the "redirect-qr" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("redirect-qr");

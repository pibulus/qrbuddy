// Read one code's settings and 7-day analytics.
// Public route: qrbuddy.app/api/get-dynamic-qr → the "get-dynamic-qr" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("get-dynamic-qr");

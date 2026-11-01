// Re-point, rename, lock, expire or cap a code.
// Public route: qrbuddy.app/api/update-dynamic-qr → the "update-dynamic-qr" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("update-dynamic-qr");

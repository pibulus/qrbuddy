// Create an editable code.
// Public route: qrbuddy.app/api/create-dynamic-qr → the "create-dynamic-qr" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("create-dynamic-qr");

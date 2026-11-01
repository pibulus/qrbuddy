// Mint, list and revoke API keys.
// Public route: qrbuddy.app/api/api-keys → the "api-keys" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("api-keys");

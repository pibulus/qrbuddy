// Every code, with quota usage.
// Public route: qrbuddy.app/api/library → the "library" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("library");

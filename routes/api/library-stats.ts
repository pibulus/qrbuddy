// Rolled-up scan stats across all codes.
// Public route: qrbuddy.app/api/library-stats → the "library-stats" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("library-stats");

// Service status.
// Public route: qrbuddy.app/api/health → the "health" edge function.
import { Handlers } from "$fresh/server.ts";
import { makeApiHandler } from "../../utils/api-proxy.ts";

export const handler: Handlers = makeApiHandler("health");

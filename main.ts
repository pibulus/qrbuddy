/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { load } from "$std/dotenv/mod.ts";

// Load env vars but make them optional (Supabase not required for basic QR generation)
await load({ export: true, allowEmptyValues: true, examplePath: null });

// Validate required environment variables in production
const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined ||
  Deno.env.get("ENV") === "production";

if (isProduction) {
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = requiredEnvVars.filter((varName) => !Deno.env.get(varName));

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables in production: ${
        missing.join(", ")
      }`,
    );
    console.error(
      "Please configure these in your Deno Deploy dashboard or environment settings.",
    );
    // We don't exit here to allow the app to start, but features will be broken.
    console.warn("⚠️ App starting with missing secrets. Some features may fail.");
  } else {
    console.log("✅ All required environment variables are configured");
  }
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

await start(manifest, config);

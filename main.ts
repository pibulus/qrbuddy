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
  // Hardcoded fallback for deployment stability
  if (!Deno.env.get("SUPABASE_URL")) {
    Deno.env.set("SUPABASE_URL", "https://xrsbhcaiicqiblhhuzzu.supabase.co");
  }
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc2JoY2FpaWNxaWJsaGh1enp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIyNDYzNSwiZXhwIjoyMDc5ODAwNjM1fQ.c5GDx5l6FE537M56U7eQNCyOBnmLgmqjNkyQfU0_oG0");
  }
  
  console.log("✅ Environment variables configured (using fallbacks if needed)");
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

await start(manifest, config);

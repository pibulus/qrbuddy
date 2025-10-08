#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import { load } from "$std/dotenv/mod.ts";

// Load env vars but make them optional (Supabase not required for basic QR generation)
await load({ export: true, allowEmptyValues: true, examplePath: null });

await dev(import.meta.url, "./main.ts", config);

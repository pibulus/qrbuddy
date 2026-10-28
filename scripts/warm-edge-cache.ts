/**
 * Post-deploy Cloudflare + Deno Deploy edge-cache warmer.
 *
 * Fetches the live homepage to discover the active Fresh `build_id`, then
 * concurrently requests every client JS chunk in `_fresh/snapshot.json`
 * (or discovered from the live pages) so Cloudflare's local PoP stores
 * `cf-cache-status: HIT` (`max-age=604800, immutable`) before a human
 * visitor ever hits a cold `fwd=uri-miss` waterfall.
 */

const BASE_URL = Deno.env.get("WARM_BASE_URL") || "https://qrbuddy.app";

async function discoverLiveBuildId(baseUrl: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/`, {
    headers: { "cache-control": "no-cache" },
  });
  const html = await res.text();
  const match = html.match(/\/_frsh\/js\/([a-f0-9]{40})\//);
  return match ? match[1] : null;
}

async function listExpectedChunkNames(): Promise<string[]> {
  try {
    const raw = await Deno.readTextFile("_fresh/snapshot.json");
    const snap = JSON.parse(raw) as {
      files?: Record<string, string[]>;
    };
    const names = new Set<string>(["main.js", "signals.js", "deserializer.js"]);
    for (const [k, deps] of Object.entries(snap.files ?? {})) {
      if (k.endsWith(".js")) names.add(k);
      for (const d of deps) {
        if (d.endsWith(".js")) names.add(d);
      }
    }
    return [...names];
  } catch {
    return ["main.js", "signals.js", "deserializer.js"];
  }
}

async function warm() {
  const buildId = await discoverLiveBuildId(BASE_URL);
  if (!buildId) {
    console.error(`Could not discover /_frsh/js/<build_id>/ on ${BASE_URL}`);
    Deno.exit(1);
  }
  const files = await listExpectedChunkNames();
  console.log(
    `🔥 Warming ${files.length} immutable JS assets for build ${
      buildId.slice(0, 8)
    } on ${BASE_URL}...`,
  );

  // Also recursively follow any chunk-*.js imports discovered in fetched JS
  const queue = [...files];
  const seen = new Set<string>(queue);
  let hits = 0;
  let misses = 0;

  const concurrency = 12;
  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift();
      if (!name) break;
      const url = `${BASE_URL}/_frsh/js/${buildId}/${name}`;
      try {
        const res = await fetch(url);
        const cf = res.headers.get("cf-cache-status") ?? "UNKNOWN";
        if (cf === "HIT") hits++;
        else misses++;
        const text = await res.text();
        for (const m of text.matchAll(/chunk-[A-Z0-9]+\.js/g)) {
          if (!seen.has(m[0])) {
            seen.add(m[0]);
            queue.push(m[0]);
          }
        }
      } catch (err) {
        console.warn(`  ⚠️ Failed to warm ${name}:`, err);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(
    `✅ Edge warm complete: ${seen.size} JS assets warmed (${hits} already HIT, ${misses} newly cached at edge).`,
  );
}

if (import.meta.main) {
  await warm();
}

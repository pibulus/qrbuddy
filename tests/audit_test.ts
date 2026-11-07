import { assert, assertEquals } from "$std/assert/mod.ts";
import { LEGACY_REDIRECTS } from "../routes/_middleware.ts";

const read = (p: string) =>
  Deno.readTextFile(new URL(`../${p}`, import.meta.url));

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for await (
    const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))
  ) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) out.push(...await walk(path));
    else if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(path);
  }
  return out;
}

Deno.test("Audit: no red/maroon families in the UI", async () => {
  const files = [
    ...await walk("routes"),
    ...await walk("islands"),
    ...await walk("components"),
  ];
  for (const file of files) {
    const src = await read(file);
    assert(
      !/(?:text|bg|border|from|to|ring|fill|stroke)-(?:red|rose|maroon|crimson)-?\d*/
        .test(
          src,
        ),
      `${file} uses a red/rose family class`,
    );
  }
});

Deno.test("Audit: no absolute white or black hexes in the UI", async () => {
  const files = [
    ...await walk("routes"),
    ...await walk("islands"),
    ...await walk("components"),
  ];
  for (const file of files) {
    const src = await read(file);
    assert(
      !/#(?:fff|ffffff|000|000000)\b/i.test(src),
      `${file} contains an absolute white/black hex`,
    );
  }
  const tw = await read("tailwind.config.ts");
  assert(tw.includes('white: "#fffef7"'), "Tailwind white must be warm paper");
  assert(tw.includes('black: "#1e1714"'), "Tailwind black must be warm ink");
});

Deno.test("Audit: every rendered page declares a canonical/head; redirects stay aliases", async () => {
  const files = await walk("routes");
  for (const file of files) {
    if (/_(?:app|404|500|middleware)|routes\/api\//.test(file)) continue;
    const src = await read(file);
    if (
      src.includes("export const handler") && !src.includes("export default")
    ) {
      continue; // 301 alias — no page to index
    }
    if (/name="robots"[^>]*content="[^"]*noindex/.test(src)) {
      continue; // intentionally unindexed; canonical would be noise
    }
    assert(
      src.includes('rel="canonical"') || src.includes("VerticalLandingHead"),
      `${file} renders without a canonical URL`,
    );
  }
});

Deno.test("Audit: robots, sitemap and security headers stay wired", async () => {
  const robots = await read("static/robots.txt");
  for (const path of ["/api/", "/edit", "/r", "/q"]) {
    assert(
      robots.includes(`Disallow: ${path}`),
      `robots.txt must block ${path}`,
    );
  }
  assert(robots.includes("Sitemap: https://qrbuddy.app/sitemap.xml"));

  const sitemap = await read("static/sitemap.xml");
  assertEquals((sitemap.match(/<url>/g) ?? []).length, 33);
  for (const alias of ["/menus", "/wifi", "/vcard", "/why"]) {
    assert(
      !sitemap.includes(`<loc>https://qrbuddy.app${alias}</loc>`),
      `sitemap must not list the ${alias} redirect`,
    );
    assert(
      alias in LEGACY_REDIRECTS,
      `LEGACY_REDIRECTS in routes/_middleware.ts must map ${alias}`,
    );
  }
  assertEquals(LEGACY_REDIRECTS["/for/restaurants"], "/for/menus");
  assertEquals(LEGACY_REDIRECTS["/es/restaurantes"], "/es/menus");
  assertEquals(LEGACY_REDIRECTS["/es/por-que"], "/es/comparar");

  const middleware = await read("routes/_middleware.ts");
  for (
    const header of [
      "Strict-Transport-Security",
      "Referrer-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Content-Security-Policy",
      "X-Robots-Tag",
    ]
  ) {
    assert(middleware.includes(header), `middleware missing ${header}`);
  }
});

Deno.test("Audit: every edge function that reads or writes has a rate gate", async () => {
  // These are cron/secret or provider-signed calls, not public entry points.
  const exempt = new Set([
    "cleanup-expired", // cron + shared secret
    "health", // cheap liveness probe
    "square-webhook", // provider-signed payment callback
  ]);
  for await (
    const entry of Deno.readDir(
      new URL("../supabase/functions", import.meta.url),
    )
  ) {
    if (
      !entry.isDirectory || entry.name.startsWith("_") || exempt.has(entry.name)
    ) {
      continue;
    }
    const src = await read(`supabase/functions/${entry.name}/index.ts`);
    assert(
      src.includes("checkRateLimit"),
      `${entry.name} has no checkRateLimit`,
    );
  }
});

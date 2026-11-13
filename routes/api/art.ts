/**
 * `POST /api/art` — one AI art QR, generated server-side.
 *
 * This is the only route in the studio that spends money per request, so it is
 * also the only one with a spend cap. Everything else here is deterministic
 * vector work that costs nothing to render; this lane pays a fraction of a cent
 * to a GPU and can come back with a picture that does not scan.
 *
 * The route returns one image and its verdict is decided in the browser, which
 * already has a decoder. A failed read is a retry, not a silent dud.
 */

import { Handlers } from "$fresh/server.ts";
import qrcode from "qrcode-generator";
import { encodeMatrixPng, toDataUrl } from "../../utils/png.ts";
import { ArtError, pollArt, startArt } from "../../utils/replicate-art.ts";

/** A picture has to survive a coarse code, so the payload stays short. */
const MAX_PAYLOAD = 180;
const MAX_PROMPT = 220;

/**
 * Per-isolate buckets. Deno Deploy runs several isolates and recycles them, so
 * this is a speed bump rather than a ledger: enough to stop one tab in a loop,
 * cheap enough to need no storage.
 */
const WINDOW_MS = 60 * 60 * 1000;
const PER_IP = 15;
const PER_DAY = 200;

const hits = new Map<string, number[]>();
let dayStamp = "";
let dayCount = 0;

function take(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  if (day !== dayStamp) {
    dayStamp = day;
    dayCount = 0;
  }
  if (dayCount >= PER_DAY) return { ok: false, retryAfter: 3600 };

  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) {
    return {
      ok: false,
      retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000),
    };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, list] of hits) {
      if (!list.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  dayCount++;
  return { ok: true };
}

function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** A QR raster for the ControlNet: greyscale, 8px a module, 4-module quiet zone. */
async function controlImage(payload: string): Promise<string> {
  const code = qrcode(0, "H");
  code.addData(payload);
  code.make();
  const count = code.getModuleCount();
  const png = await encodeMatrixPng(
    (row, col) => code.isDark(row, col),
    count,
    { scale: 8, quiet: 4 },
  );
  return toDataUrl(png);
}

export const handler: Handlers = {
  async POST(req, ctx) {
    const token = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
    if (!token) {
      return json({ ok: false, error: "art is not configured" }, 503);
    }

    let input: {
      url?: string;
      prompt?: string;
      seed?: number;
      tune?: number;
    };
    try {
      input = await req.json();
    } catch {
      return json({ ok: false, error: "bad json" }, 400);
    }

    const url = (input.url ?? "").trim();
    const prompt = (input.prompt ?? "").trim();
    if (!url || url.length > MAX_PAYLOAD) {
      return json({
        ok: false,
        error: `payload must be 1–${MAX_PAYLOAD} characters`,
      }, 400);
    }
    if (prompt.length < 3 || prompt.length > MAX_PROMPT) {
      return json({
        ok: false,
        error: `prompt must be 3–${MAX_PROMPT} characters`,
      }, 400);
    }

    const ip = ctx.remoteAddr?.hostname ?? "unknown";
    const gate = take(ip);
    if (!gate.ok) {
      return json(
        { ok: false, error: "slow down" },
        429,
        { "Retry-After": String(gate.retryAfter ?? 60) },
      );
    }

    try {
      const control = await controlImage(url);
      const started = await startArt(
        { url, prompt, control, seed: input.seed, tune: input.tune },
        { token },
      );
      // Hand back a handle, not a picture. Holding the request open for the
      // whole generation is what the edge answers with an HTML error page.
      return json({ ok: true, id: started.id, seed: started.seed });
    } catch (error) {
      const status = error instanceof ArtError ? error.status : 502;
      const message = error instanceof Error ? error.message : "art failed";
      console.error("[art]", status, message);
      // A billing wall is ours to own, not the visitor's to read as a stack trace.
      const friendly = status === 402 ? "the press is out of credit" : message;
      return json(
        { ok: false, error: friendly },
        status >= 500 || status === 402 ? 502 : status,
      );
    }
  },

  /** One short read of a running prediction. Cheap, so it is not rate-limited. */
  async GET(req) {
    const token = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
    if (!token) {
      return json({ ok: false, error: "art is not configured" }, 503);
    }
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[a-z0-9]{8,64}$/i.test(id)) {
      return json({ ok: false, error: "bad id" }, 400);
    }
    try {
      const progress = await pollArt(id, { token });
      return json({ ok: true, ...progress });
    } catch (error) {
      const status = error instanceof ArtError ? error.status : 502;
      console.error(
        "[art]",
        status,
        error instanceof Error ? error.message : "",
      );
      return json({ ok: false, error: "the press jammed" }, 502);
    }
  },
};

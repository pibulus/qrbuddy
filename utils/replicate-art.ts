/**
 * Art generation client (`utils/replicate-art.ts`).
 *
 * The studio prints vector codes. This is the one lane that does not: a QR
 * ControlNet repaints the code into a picture, and the result is a raster that
 * either scans or does not. That distinction is why the art lane lives behind
 * its own route, its own spend cap and its own decoder gate instead of sitting
 * in the Look gallery beside looks that are deterministic.
 *
 * Model: `andreasjansson/illusion` — Monster Labs' QR ControlNet on SD 1.5.
 * Roughly $0.003 a run, a few seconds on an L40S.
 */

export const ART_MODEL = "andreasjansson/illusion";

/**
 * Pinned on purpose. The model has not moved since 2023 and a floating version
 * would change the look of every link that ever used it; `POST /v1/predictions`
 * with an explicit version is also the only route that answered — the
 * `/v1/models/<owner>/<name>/predictions` shorthand 404s for this one.
 */
const VERSION =
  "75d51a73fce3c00de31ed9ab4358c73e8fc0f627dc8ce975818e653317cb919b";
const ENDPOINT = "https://api.replicate.com/v1/predictions";

export interface ArtInput {
  /** The payload the code must carry. Kept short on purpose. */
  url: string;
  prompt: string;
  /** Data URI of a greyscale QR raster, used as both init and control image. */
  control: string;
  seed?: number;
  /**
   * Retry rung. Each rung costs a little picture and buys a little read:
   * 0 → 2.6, 1 → 3.0, 2 → 3.4. A prompt that paints mush gets two more tries
   * that lean harder on the code rather than a shrug.
   */
  tune?: number;
}

/**
 * The exact field names are the model's, not ours. They live in one place so a
 * schema change is a one-line fix rather than a hunt through the route.
 *
 * Verified against the model's own OpenAPI: `input` is required and the only
 * accepted keys are the ones below. `strength` does not exist on this version.
 *
 * Two settings were measured rather than guessed (see docs/ART.md):
 *
 * - **Pass the control image.** Handing the model `qr_code_content` and letting
 *   it draw its own code produces pictures that do not scan — its default
 *   `qrcode_background` is grey, and the code it draws is not error-correction
 *   H. Our own raster fixes both.
 * - **Conditioning 2.6.** At 2.2 the picture is prettier and fails the 250px
 *   probe; at 2.6 it still reads as a picture and survives. Below 2.0 nothing
 *   decodes at all.
 */
/** 2.6 is the measured sweet spot; each retry leans harder on the code. */
export function conditioning(tune: number): number {
  const rung = Math.max(0, Math.min(2, Math.round(tune)));
  return Number((2.6 + rung * 0.4).toFixed(2));
}

function body(input: ArtInput, seed: number) {
  return {
    input: {
      prompt: input.prompt,
      qr_code_content: input.url,
      image: input.control,
      width: 1024,
      height: 1024,
      // Three modules of quiet zone. Below that the picture crowds the code and
      // the read rate falls off a cliff.
      border: 3,
      guidance_scale: 7.5,
      controlnet_conditioning_scale: conditioning(input.tune ?? 0),
      num_inference_steps: 50,
      qrcode_background: "white",
      num_outputs: 1,
      seed,
      negative_prompt: "ugly, disfigured, low quality, blurry, nsfw",
    },
  };
}

export class ArtError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface Started {
  id: string;
  seed: number;
}

function auth(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Kicks off a generation and returns immediately.
 *
 * The first version held the request open with `Prefer: wait=60` and returned
 * the finished picture in one go. That works on a laptop and fails on the edge:
 * a cold prediction runs 25–30s, and Deno Deploy's gateway answers with an HTML
 * error page before the handler can. Two short requests instead of one long one.
 */
export async function startArt(
  input: ArtInput,
  options: { token: string; fetch?: typeof fetch },
): Promise<Started> {
  const doFetch = options.fetch ?? fetch;
  const seed = input.seed ?? Math.floor(Math.random() * 1_000_000);
  const response = await doFetch(ENDPOINT, {
    method: "POST",
    headers: auth(options.token),
    body: JSON.stringify({ version: VERSION, ...body(input, seed) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ArtError(
      typeof payload?.detail === "string"
        ? payload.detail
        : `replicate ${response.status}`,
      response.status,
    );
  }
  if (!payload.id) throw new ArtError("no prediction id", 502);
  return { id: String(payload.id), seed };
}

export interface Progress {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  image?: string;
  error?: string;
}

/** One short read. The caller polls; nothing here waits on a GPU. */
export async function pollArt(
  id: string,
  options: { token: string; fetch?: typeof fetch },
): Promise<Progress> {
  const doFetch = options.fetch ?? fetch;
  const response = await doFetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    headers: auth(options.token),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ArtError(
      typeof payload?.detail === "string"
        ? payload.detail
        : `replicate ${response.status}`,
      response.status,
    );
  }
  const status = String(payload.status ?? "starting") as Progress["status"];
  if (status === "failed" || status === "canceled") {
    return { status, error: payload.error ?? "the press jammed" };
  }
  if (status !== "succeeded") return { status };
  const out = Array.isArray(payload.output)
    ? payload.output[0]
    : payload.output;
  if (typeof out !== "string") {
    return { status: "failed", error: "no image in the prediction" };
  }
  return { status, image: await inline(out) };
}

/** Replicate output links expire; a data URL is ours to keep for the session. */
export async function inline(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new ArtError("could not fetch the picture", 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) {
    throw new ArtError("picture is too large", 502);
  }
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const mime = response.headers.get("content-type") ?? "image/webp";
  return `data:${mime};base64,${btoa(binary)}`;
}

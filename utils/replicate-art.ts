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

const MODEL = "andreasjansson/illusion";
const ENDPOINT = `https://api.replicate.com/v1/models/${MODEL}/predictions`;

export interface ArtInput {
  /** The payload the code must carry. Kept short on purpose. */
  url: string;
  prompt: string;
  /** Data URI of a greyscale QR raster, used as both init and control image. */
  control: string;
  seed?: number;
}

export interface ArtOutput {
  image: string;
  seed: number;
  predictionId: string;
}

/**
 * The exact field names are the model's, not ours. They live in one place so a
 * schema change is a one-line fix rather than a hunt through the route.
 */
function body(input: ArtInput, seed: number) {
  return {
    prompt: input.prompt,
    qr_code: input.control,
    qr_code_content: input.url,
    negative_prompt: "ugly, disfigured, low quality, blurry, nsfw",
    guidance_scale: 7.5,
    controlnet_conditioning_scale: 1.35,
    strength: 0.9,
    num_inference_steps: 40,
    seed,
  };
}

export class ArtError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Runs one generation synchronously. Replicate's `Prefer: wait` turns the
 * create-and-poll dance into a single request that returns a finished
 * prediction, which is all this needs.
 */
export async function generateArt(
  input: ArtInput,
  options: { token: string; fetch?: typeof fetch; timeoutMs?: number },
): Promise<ArtOutput> {
  const doFetch = options.fetch ?? fetch;
  const seed = input.seed ?? Math.floor(Math.random() * 1_000_000);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 90_000,
  );
  try {
    const response = await doFetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${options.token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=60",
      },
      body: JSON.stringify(body(input, seed)),
      signal: controller.signal,
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
    if (payload.status !== "succeeded") {
      throw new ArtError(payload.error ?? `status ${payload.status}`, 502);
    }
    const image = Array.isArray(payload.output)
      ? payload.output[0]
      : payload.output;
    if (typeof image !== "string") {
      throw new ArtError("no image in the prediction", 502);
    }
    return { image, seed, predictionId: String(payload.id ?? "") };
  } finally {
    clearTimeout(timer);
  }
}

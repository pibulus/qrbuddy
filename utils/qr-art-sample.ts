/**
 * Artwork sampling for the Halftone look (`utils/qr-art-sample.ts`).
 *
 * The point of sampling once, at upload, is that rendering stays pure: the
 * matrix writer never needs a canvas, a DOM or an image decode. A 64×64 RGB
 * grid is 12,288 bytes, about 16 KB as base64 — small enough to ride inside a
 * saved design preference, big enough that a 33-module code reads a colour per
 * module without visible stepping.
 *
 * No third-party image code: one `drawImage` downscale (which averages for us)
 * and a walk over the pixels.
 */

export interface ArtSample {
  /** Grid side in cells. */
  n: number;
  /** base64 of n × n × 3 RGB bytes, row-major. */
  data: string;
}

export const SAMPLE_SIZE = 64;

/**
 * Row-major bytes → base64. Accepts RGBA (a canvas `ImageData` straight from
 * `getImageData`) or RGB, and always stores RGB: copying three quarters of an
 * RGBA buffer shifts every channel and turns a teal hill pink.
 */
export function encodeSample(
  rgb: Uint8ClampedArray | Uint8Array,
  n: number,
): ArtSample {
  const cells = n * n;
  const bytes = new Uint8Array(cells * 3);
  if (rgb.length >= cells * 4) {
    for (let i = 0; i < cells; i++) {
      bytes[i * 3] = rgb[i * 4];
      bytes[i * 3 + 1] = rgb[i * 4 + 1];
      bytes[i * 3 + 2] = rgb[i * 4 + 2];
    }
  } else {
    bytes.set(rgb.subarray(0, bytes.length));
  }
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)),
    );
  }
  return { n, data: btoa(binary) };
}

/** base64 → RGB bytes. Returns null on anything malformed, never throws. */
export function decodeSample(sample: ArtSample | undefined): Uint8Array | null {
  if (!sample || !Number.isFinite(sample.n) || sample.n < 2) return null;
  if (typeof sample.data !== "string" || sample.data.length === 0) return null;
  try {
    const binary = atob(sample.data);
    if (binary.length !== sample.n * sample.n * 3) return null;
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Nearest-cell colour lookup. `u`/`v` are 0–1 across the grid. Nearest rather
 * than bilinear on purpose: the halftone wants a chunky, printed grid, and
 * smoothing at module resolution only muddies edges.
 */
export function sampleColor(
  rgb: Uint8Array,
  n: number,
  u: number,
  v: number,
): [number, number, number] {
  const cx = Math.min(n - 1, Math.max(0, Math.floor(u * n)));
  const cy = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
  const i = (cy * n + cx) * 3;
  return [rgb[i], rgb[i + 1], rgb[i + 2]];
}

/** Rec. 709 relative luminance, 0–1. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * DOM-only: draw an image into a small canvas (which averages on the way down)
 * and read it back as a sample. Centre-crops to a square so a wide photo does
 * not squash its subject.
 */
export function sampleImage(
  image: HTMLImageElement,
  n = SAMPLE_SIZE,
): ArtSample | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = n;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const side = Math.min(image.naturalWidth, image.naturalHeight) ||
      Math.min(image.width, image.height);
    if (!side) return null;
    const sx = (image.naturalWidth - side) / 2 || 0;
    const sy = (image.naturalHeight - side) / 2 || 0;
    ctx.drawImage(image, sx, sy, side, side, 0, 0, n, n);
    const { data } = ctx.getImageData(0, 0, n, n);
    return encodeSample(data, n);
  } catch {
    return null;
  }
}

/** Turns a data: URL into an element the sampler can read. */
export async function loadArtwork(
  dataUrl: string,
): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  try {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    return image;
  } catch {
    return null;
  }
}
/**
 * A palette-derived sample, used until a photo is chosen. Pure maths, no DOM:
 * the Halftone look is never an empty state, and the same code path renders a
 * default and a photograph.
 */
export function defaultSample(
  paper: string,
  accent: string,
  n = 32,
): ArtSample {
  const parse = (hex: string): [number, number, number] => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return [200, 200, 200];
    return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
    ];
  };
  const a = parse(paper);
  const b = parse(accent);
  const bytes = new Uint8Array(n * n * 3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Diagonal sweep with a soft centre so the dots never form a hard seam.
      const u = x / (n - 1);
      const v = y / (n - 1);
      const t = Math.min(
        1,
        Math.max(0, (u * 0.62 + v * 0.38) * 1.1 - 0.08),
      );
      const i = (y * n + x) * 3;
      bytes[i] = a[0] + (b[0] - a[0]) * t;
      bytes[i + 1] = a[1] + (b[1] - a[1]) * t;
      bytes[i + 2] = a[2] + (b[2] - a[2]) * t;
    }
  }
  return encodeSample(bytes, n);
}

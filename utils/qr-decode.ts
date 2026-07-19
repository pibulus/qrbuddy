// Shared QR decoding helpers (jsQR + zxing-wasm, both lazy-loaded).
//
// jsQR is picky about resolution: at full res, rounded/dotted modules have
// visible gaps that break its binarization, while heavy downscaling can blur
// small codes. Real scanners try multiple scales — so do we. 640px first
// (the sweet spot where antialiasing merges stylised dots into solid bars),
// then larger and smaller fallbacks, each with inverted-color attempts.
//
// zxing-wasm (the decoder family real phone scanners descend from) backs
// jsQR up on still images and powers the scannability self-check. Its wasm
// binary is vendored at /zxing_reader.wasm so no CDN fetch happens at runtime.

const SCALE_TARGETS = [640, 1024, 400];

async function loadJsQR() {
  const mod = await import("jsqr");
  return mod.default;
}

type ZXingReader = typeof import("zxing-wasm/reader");
let zxingPromise: Promise<ZXingReader> | null = null;

function loadZXing(): Promise<ZXingReader> {
  zxingPromise ??= import("zxing-wasm/reader").then((mod) => {
    mod.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
      },
    });
    return mod;
  });
  return zxingPromise;
}

async function decodeWithZXing(
  input: Blob | ImageData,
): Promise<string | null> {
  try {
    const { readBarcodes } = await loadZXing();
    const results = await readBarcodes(input, {
      formats: ["QRCode"],
      tryHarder: true,
      tryInvert: true,
    });
    return results.find((r) => r.isValid)?.text ?? null;
  } catch {
    return null;
  }
}

export async function decodeQRFromFile(file: File): Promise<string | null> {
  const jsQR = await loadJsQR();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const maxDim = Math.max(bitmap.width, bitmap.height);
  const targets = [...new Set(SCALE_TARGETS.map((t) => Math.min(t, maxDim)))];

  for (const target of targets) {
    const scale = target / maxDim;
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (code?.data) return code.data;
  }

  // jsQR struck out — zxing reads low-contrast/stylised codes it can't.
  return await decodeWithZXing(file);
}

/**
 * Decode-before-you-download honesty check: can a real decoder read the QR
 * we just rendered? Tests at a deliberately small size (~scanning a screen
 * from a distance), so passing here means comfortable margin at full size.
 * Returns true when the decoded text matches what we encoded, false when
 * unreadable or mismatched, and null when the check couldn't run (no canvas
 * yet, wasm blocked) — callers should treat null as "unknown", not "bad".
 */
export async function checkQRScannability(
  source: HTMLCanvasElement,
  expected: string,
): Promise<boolean | null> {
  if (source.width === 0 || source.height === 0) return null;
  const probe = document.createElement("canvas");
  const SIZE = 250;
  probe.width = SIZE;
  probe.height = SIZE;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, SIZE, SIZE);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  } catch {
    return null; // tainted canvas (shouldn't happen — same-origin renders)
  }

  try {
    const { readBarcodes } = await loadZXing();
    const results = await readBarcodes(imageData, {
      formats: ["QRCode"],
      tryHarder: true,
      tryInvert: true,
    });
    return results.some((r) => r.isValid && r.text === expected);
  } catch {
    return null;
  }
}

/**
 * Decode straight from an off-DOM render (no live canvas needed) — used to
 * probe a candidate style BEFORE committing it, e.g. the style dice. Draws
 * the blob at the same small size checkQRScannability uses, so a probe and
 * a post-render check agree on the same pass/fail bar.
 */
export async function checkBlobScannability(
  blob: Blob,
  expected: string,
): Promise<boolean | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return null;
  }
  const probe = document.createElement("canvas");
  const SIZE = 250;
  probe.width = SIZE;
  probe.height = SIZE;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  } catch {
    return null;
  }

  try {
    const { readBarcodes } = await loadZXing();
    const results = await readBarcodes(imageData, {
      formats: ["QRCode"],
      tryHarder: true,
      tryInvert: true,
    });
    return results.some((r) => r.isValid && r.text === expected);
  } catch {
    return null;
  }
}

/** Single-shot decode for camera frames (already sized by the caller). */
export async function decodeQRFromImageData(
  imageData: ImageData,
): Promise<string | null> {
  const jsQR = await loadJsQR();
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data ?? null;
}

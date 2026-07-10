// Shared QR decoding helpers (jsQR, lazy-loaded).
//
// jsQR is picky about resolution: at full res, rounded/dotted modules have
// visible gaps that break its binarization, while heavy downscaling can blur
// small codes. Real scanners try multiple scales — so do we. 640px first
// (the sweet spot where antialiasing merges stylised dots into solid bars),
// then larger and smaller fallbacks, each with inverted-color attempts.

const SCALE_TARGETS = [640, 1024, 400];

async function loadJsQR() {
  const mod = await import("jsqr");
  return mod.default;
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
  return null;
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

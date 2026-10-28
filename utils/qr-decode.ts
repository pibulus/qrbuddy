// Shared QR decoding helpers (Native BarcodeDetector + zxing-wasm + jsQR).
//
// Why three engines?
// 1. Native `BarcodeDetector` (when supported by Safari/WebKit, Chrome, Android)
//    uses OS-level vision hardware and locks onto angled/low-light camera frames
//    in <5ms.
// 2. `zxing-wasm` (with tryHarder + tryInvert + tryRotate + tryDownscale on
//    Canvas ImageData) reads stylized pastel-punk gradients, rounded/dotted
//    modules, center logos, and perspective-warped codes that break jsQR.
// 3. `jsQR` (with attemptBoth inversion) is a fast synchronous pure-JS pass.
//
// Passing `ImageData` (rendered via createImageBitmap -> Canvas) to zxing-wasm
// instead of only raw File blobs ensures WebP, HEIC, AVIF, and SVG images decode
// reliably across all browsers.

const SCALE_TARGETS = [800, 1280, 512, 360];

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect(
    source: ImageBitmapSource,
  ): Promise<NativeBarcodeResult[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

let barcodeDetectorPromise: Promise<NativeBarcodeDetector | null> | null = null;

function getNativeBarcodeDetector(): Promise<NativeBarcodeDetector | null> {
  if (barcodeDetectorPromise) return barcodeDetectorPromise;
  barcodeDetectorPromise = (async () => {
    try {
      const Ctor = (
        globalThis as unknown as {
          BarcodeDetector?: NativeBarcodeDetectorConstructor;
        }
      ).BarcodeDetector;
      if (!Ctor) return null;
      if (typeof Ctor.getSupportedFormats === "function") {
        const formats = await Ctor.getSupportedFormats();
        if (!formats.includes("qr_code")) return null;
      }
      return new Ctor({ formats: ["qr_code"] });
    } catch {
      return null;
    }
  })();
  return barcodeDetectorPromise;
}

export async function detectWithNativeBarcodeDetector(
  source: ImageBitmapSource,
): Promise<string | null> {
  try {
    const detector = await getNativeBarcodeDetector();
    if (!detector) return null;
    const hits = await detector.detect(source);
    const match = hits.find((h) =>
      typeof h.rawValue === "string" && h.rawValue.trim().length > 0
    );
    return match?.rawValue ?? null;
  } catch {
    return null;
  }
}

async function loadJsQR() {
  const mod = await import("jsqr");
  return mod.default;
}

type ZXingReader = typeof import("zxing-wasm/reader");
let zxingPromise: Promise<ZXingReader> | null = null;

function loadZXing(): Promise<ZXingReader> {
  zxingPromise ??= import("zxing-wasm/reader").then((mod) => {
    const origin = typeof globalThis.location?.origin === "string" &&
        globalThis.location.origin !== "null"
      ? globalThis.location.origin
      : "";
    mod.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm")
            ? `${origin}/zxing_reader.wasm`
            : prefix + path,
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
      tryRotate: true,
      tryDownscale: true,
    });
    return results.find((r) => r.isValid && r.text)?.text ?? null;
  } catch {
    return null;
  }
}

export async function decodeQRFromFile(file: File): Promise<string | null> {
  const jsQR = await loadJsQR();
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback for formats createImageBitmap couldn't open directly
    return await decodeWithZXing(file);
  }

  try {
    // 1. Fast native OS/browser vision check if available
    const nativeHit = await detectWithNativeBarcodeDetector(bitmap);
    if (nativeHit) return nativeHit;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return await decodeWithZXing(file);

    const maxDim = Math.max(bitmap.width, bitmap.height);
    const targets = [...new Set(SCALE_TARGETS.map((t) => Math.min(t, maxDim)))];

    // 2. Multi-scale jsQR + zxing-wasm on Canvas ImageData
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

      const zxingHit = await decodeWithZXing(imageData);
      if (zxingHit) return zxingHit;
    }

    // 3. Center-crop fallback for photos where the QR sticker is small in the middle
    const minSide = Math.min(bitmap.width, bitmap.height);
    if (minSide >= 300) {
      const cropSize = Math.round(minSide * 0.6);
      const sx = Math.round((bitmap.width - cropSize) / 2);
      const sy = Math.round((bitmap.height - cropSize) / 2);
      const outSize = Math.min(640, cropSize);
      canvas.width = outSize;
      canvas.height = outSize;
      ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
      const croppedData = ctx.getImageData(0, 0, outSize, outSize);

      const croppedJsQr = jsQR(croppedData.data, outSize, outSize, {
        inversionAttempts: "attemptBoth",
      });
      if (croppedJsQr?.data) return croppedJsQr.data;

      const croppedZxing = await decodeWithZXing(croppedData);
      if (croppedZxing) return croppedZxing;
    }

    // 4. Final raw file fallback
    return await decodeWithZXing(file);
  } finally {
    bitmap.close?.();
  }
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
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);
  bitmap.close?.();

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

/**
 * Single-shot decode for live camera frames (already sized by the caller).
 * Runs both jsQR (with inversion support) and zxing-wasm (tryHarder + tryInvert +
 * tryRotate) so stylized gradient, rounded-dot, and angled QR codes lock in
 * reliably during live camera scanning.
 */
export async function decodeQRFromImageData(
  imageData: ImageData,
): Promise<string | null> {
  const jsQR = await loadJsQR();
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (code?.data) return code.data;

  return await decodeWithZXing(imageData);
}

/**
 * image-prep.ts — make phone photos slideshow-ready before they leave the
 * device.
 *
 * Multi-file shares cap at 5MB per file (server-enforced), and a modern phone
 * JPEG is 3–8MB, a DSLR frame 10+. Rather than lift the cap, downscale on the
 * client: ≤ MAX_EDGE px on the long side, re-encoded as JPEG. Ten holiday
 * photos land at a few hundred KB each, upload in seconds, and the cap never
 * shows its face.
 *
 * Side benefit: Safari decodes HEIC, so an iPhone's photos come out the other
 * side as JPEG that every browser can display. Anything the browser can't
 * decode (HEIC on Chrome, exotic formats) passes through untouched and the
 * normal validation speaks up.
 */

const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.86;
// Below this, re-encoding costs more than it saves — leave the bytes alone.
const SKIP_UNDER_BYTES = 900 * 1024;

export function isImage(file: File): boolean {
  return file.type.startsWith("image/") ||
    /\.(heic|heif)$/i.test(file.name);
}

/** Downscale one image. Returns the original file when nothing needs doing
 * or the browser can't decode it. */
export async function prepImage(file: File): Promise<File> {
  // GIFs lose their animation through a canvas; SVGs are already tiny.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const needsResize = longEdge > MAX_EDGE;
  const needsShrink = file.size > SKIP_UNDER_BYTES;
  const needsTranscode = !/^image\/(jpeg|png|webp)$/.test(file.type);

  if (!needsResize && !needsShrink && !needsTranscode) {
    bitmap.close();
    return file;
  }

  const scale = needsResize ? MAX_EDGE / longEdge : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  // Not smaller and no format change needed — the original was fine.
  if (!blob || (blob.size >= file.size && !needsTranscode)) return file;

  const stem = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${stem}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

/** Prep every image in a batch (non-images pass through). Runs in parallel;
 * ten phone photos take about a second on a mid-range device. */
export function prepImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => (isImage(f) ? prepImage(f) : f)));
}

/** "IMG_2041.jpg" → "IMG 2041"; "03 - blue_monday.mp3" → "blue monday". */
export function prettyName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]+/, "")
    .replace(/[_-]+/g, " ")
    .trim() || name;
}

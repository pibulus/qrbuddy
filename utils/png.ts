/**
 * Minimal PNG encoder (`utils/png.ts`).
 *
 * The art pipeline needs a raster of the code to hand to a ControlNet, and the
 * studio has no image library on the server. A QR is one bit per pixel, so the
 * encoder only has to write a greyscale 8-bit image: signature, IHDR, one IDAT
 * of filtered scanlines, IEND. `CompressionStream("deflate")` is already
 * zlib-wrapped, which is exactly what PNG wants.
 */

const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const body = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(body));
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(
    new CompressionStream("deflate"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * `dark(row, col)` is sampled on a grid of `count` cells, each `scale` pixels
 * wide, inside a quiet zone of `quiet` cells. Output is greyscale: 0 for a dark
 * module, 255 for paper.
 */
export async function encodeMatrixPng(
  dark: (row: number, col: number) => boolean,
  count: number,
  options: { scale?: number; quiet?: number } = {},
): Promise<Uint8Array> {
  const scale = Math.max(1, Math.round(options.scale ?? 8));
  const quiet = Math.max(0, Math.round(options.quiet ?? 4));
  const size = (count + quiet * 2) * scale;

  // One filter byte (0 = None) per scanline, then one byte per pixel.
  const raw = new Uint8Array((size + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size + 1);
    raw[rowStart] = 0;
    const cellRow = Math.floor(y / scale) - quiet;
    for (let x = 0; x < size; x++) {
      const cellCol = Math.floor(x / scale) - quiet;
      const on = cellRow >= 0 && cellCol >= 0 && cellRow < count &&
        cellCol < count && dark(cellRow, cellCol);
      raw[rowStart + 1 + x] = on ? 0 : 255;
    }
  }

  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, size);
  header.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const parts = [
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

export function toDataUrl(png: Uint8Array, mime = "image/png"): string {
  let binary = "";
  for (let i = 0; i < png.length; i++) binary += String.fromCharCode(png[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

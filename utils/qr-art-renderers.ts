/**
 * QRBuddy "Looks" — presentation renderers for the QR matrix.
 *
 * Three looks sit on top of the existing palette engine:
 * - `foil`    isometric 2.5D extrusion (geometry ported from `QR25D`)
 * - `sticker` artwork behind a protected code, die-cut edge (`QRImage` idea)
 * - `pocket`  8-bit pixel sticker (QRBuddy's own)
 *
 * Attribution: the foil projection and the artwork-under-modules concept are
 * ported from `react-qrbtf` by CPunisher, MIT licensed.
 * https://github.com/CPunisher/react-qrbtf (src/components/QR25D.tsx,
 * src/components/QRImage.tsx). No React code is used; only the SVG geometry.
 * See THIRD_PARTY_LICENSES.md.
 *
 * House rules that survive every look:
 * - finder, timing and alignment patterns stay solid and full size
 * - the quiet zone is never smaller than 4 modules
 * - no #fff / #000; paper and ink come from the active palette
 */

import { escapeXml } from "./svg-export.ts";

export interface LookMatrix {
  count: number;
  isDark(row: number, col: number): boolean;
  isCleared(row: number, col: number): boolean;
  /** Alignment pattern centres for this version. */
  alignment: number[];
}

export interface LookBox {
  x: number;
  y: number;
  size: number;
}

export interface StickerOptions {
  bg: string;
  /** Die-cut card paper; defaults to `bg`. */
  card?: string;
  ink: string;
  /** Optional data: URL painted behind the modules. */
  artImage?: string;
  shape: "squircle" | "circle" | "ticket";
  /** Fill for the data modules; defaults to ink. */
  moduleFill?: string;
}

export interface PocketOptions {
  bg: string;
  ink: string;
  bezel: string;
  accent: string;
  /** Optional fill for data modules; defaults to ink. */
  moduleFill?: string;
}

/** Rounds to 3 decimals and drops the float noise that bloats SVG files. */
function f(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** Structural modules: finder blocks, separators, timing, format, alignment. */
export function isStructuralModule(
  row: number,
  col: number,
  count: number,
  alignment: number[],
): boolean {
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= count - 8) return true;
  if (row >= count - 8 && col < 9) return true;
  if (row === 6 || col === 6) return true;
  if (row === 8 || col === 8) return true;
  return alignment.some((ar) =>
    Math.abs(row - ar) <= 2 && alignment.some((ac) => Math.abs(col - ac) <= 2)
  );
}

/** `#rrggbb` (or `#rgb`) → RGB triple, or null when the value is not hex. */
function hexToRgb(value: string): [number, number, number] | null {
  const hex = value.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (short) {
    return [
      parseInt(short[1] + short[1], 16),
      parseInt(short[2] + short[2], 16),
      parseInt(short[3] + short[3], 16),
    ];
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!long) return null;
  return [
    parseInt(long[1], 16),
    parseInt(long[2], 16),
    parseInt(long[3], 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return "#" +
    rgb.map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16).padStart(2, "0")
    ).join("");
}

/** Mix two colours. Non-hex inputs (gradients) pass through unchanged. */
export function mixColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const clamp = Math.max(0, Math.min(1, t));
  return toHex([
    ca[0] + (cb[0] - ca[0]) * clamp,
    ca[1] + (cb[1] - ca[1]) * clamp,
    ca[2] + (cb[2] - ca[2]) * clamp,
  ]);
}

/**
 * Default foil faces: a lit right cheek and a shaded left cheek. Both are
 * derived from the palette so a look never fights its colours.
 */
export function foilSideColors(
  c1: string,
  c2: string,
  paper: string,
  ink: string,
) {
  return {
    top: c1,
    left: mixColor(c2, ink, 0.34),
    right: mixColor(c2, paper, 0.52),
  };
}

/* ───────────────────────────── Flat Foil ───────────────────────────── */

export interface FoilOptions {
  /** Fill for the module tops — a colour or a gradient reference. */
  top: string;
  /** Far side wall. */
  left: string;
  /** Near side wall. */
  right: string;
  /** Paper of the tile face (may be a gradient reference). */
  face: string;
  /** Outline ink. */
  ink: string;
}

/**
 * Flat Foil: a flat, perfectly readable code printed on an extruded tile.
 *
 * The first pass ported `QR25D`'s isometric plane directly. It looked right and
 * failed the decode gate at every size — an affine skew is recoverable in
 * theory, but finder sampling at print resolution is not. So the top face stayed
 * flat and the thickness moved to the object: a lofted slab under a real code.
 * Foil lives in the material, not in the distortion.
 */
export function renderFoil(
  matrix: LookMatrix,
  box: LookBox,
  options: FoilOptions,
): string {
  const n = matrix.count;
  const s = box.size;
  const face = s * 0.84;
  const ex = s * 0.052;
  const ey = s * 0.058;
  const tx = box.x + (s - face - ex) / 2;
  const ty = box.y + (s - face - ey) / 2;
  const radius = face * 0.06;

  // Loft: 18 offset plates build one continuous side wall with rounded edges.
  const steps = 18;
  const walls: string[] = [];
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    walls.push(
      `<rect x="${f(tx + ex * t)}" y="${f(ty + ey * t)}" width="${
        f(face)
      }" height="${f(face)}" rx="${f(radius)}" fill="${
        escapeXml(mixColor(options.left, options.right, 1 - t))
      }"/>`,
    );
  }

  // Quiet zone lives inside the tile face: 4 modules, always.
  const margin = (face * 4) / (n + 8);
  const code = face - margin * 2;
  const cell = code / n;
  const x0 = tx + margin;
  const y0 = ty + margin;

  const modules: string[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (matrix.isCleared(row, col) || !matrix.isDark(row, col)) continue;
      // Structural modules overlap a hair so print resolution never shows a
      // hairline seam inside a finder ring.
      const structural = isStructuralModule(row, col, n, matrix.alignment);
      const inset = structural ? -0.02 : 0;
      modules.push(
        `<rect x="${f(x0 + (col + inset) * cell)}" y="${
          f(y0 + (row + inset) * cell)
        }" width="${f(cell * (1 - inset * 2))}" height="${
          f(cell * (1 - inset * 2))
        }"/>`,
      );
    }
  }

  return `<g>${walls.join("")}<rect x="${f(tx)}" y="${f(ty)}" width="${
    f(face)
  }" height="${f(face)}" rx="${f(radius)}" fill="${
    escapeXml(options.face)
  }" stroke="${escapeXml(options.ink)}" stroke-width="${
    f(face * 0.012)
  }"/><g fill="${escapeXml(options.top)}">${modules.join("")}</g></g>`;
}

/* ────────────────────────────── Sticker ────────────────────────────── */

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rad <= 0) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  return [
    `M${f(x + rad)} ${f(y)}`,
    `H${f(x + w - rad)}`,
    `A${f(rad)} ${f(rad)} 0 0 1 ${f(x + w)} ${f(y + rad)}`,
    `V${f(y + h - rad)}`,
    `A${f(rad)} ${f(rad)} 0 0 1 ${f(x + w - rad)} ${f(y + h)}`,
    `H${f(x + rad)}`,
    `A${f(rad)} ${f(rad)} 0 0 1 ${f(x)} ${f(y + h - rad)}`,
    `V${f(y + rad)}`,
    `A${f(rad)} ${f(rad)} 0 0 1 ${f(x + rad)} ${f(y)}`,
    "Z",
  ].join("");
}

/** Die-cut outline for the sticker card. */
export function stickerShapePath(
  box: LookBox,
  shape: "squircle" | "circle" | "ticket",
): string {
  const { x, y, size } = box;
  if (shape === "circle") {
    const r = size / 2;
    const c = f(size);
    return `M${f(x)} ${f(y + r)}a${f(r)} ${f(r)} 0 1 0 ${c} 0a${f(r)} ${
      f(r)
    } 0 1 0 -${c} 0Z`;
  }
  if (shape === "ticket") {
    const r = size * 0.11;
    const nr = size * 0.072;
    const mid = y + size / 2;
    return [
      `M${f(x + r)} ${f(y)}`,
      `H${f(x + size - r)}`,
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + size)} ${f(y + r)}`,
      `V${f(mid - nr)}`,
      `A${f(nr)} ${f(nr)} 0 0 0 ${f(x + size)} ${f(mid + nr)}`,
      `V${f(y + size - r)}`,
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + size - r)} ${f(y + size)}`,
      `H${f(x + r)}`,
      `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + size - r)}`,
      `V${f(mid + nr)}`,
      `A${f(nr)} ${f(nr)} 0 0 1 ${f(x)} ${f(mid - nr)}`,
      `V${f(y + r)}`,
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}`,
      "Z",
    ].join("");
  }
  return roundedRectPath(x, y, size, size, size * 0.19);
}

/** Slots that must stay paper-clean for a decoder: separators + timing. */
function protectorRects(
  matrix: LookMatrix,
  cell: number,
  x0: number,
  y0: number,
) {
  const n = matrix.count;
  const rects: string[] = [];
  const push = (row: number, col: number, w: number, h: number) =>
    rects.push(
      `<rect x="${f(x0 + col * cell)}" y="${f(y0 + row * cell)}" width="${
        f(w * cell)
      }" height="${f(h * cell)}"/>`,
    );
  // Finder blocks, including their 1-module separators.
  push(0, 0, 8, 8);
  push(0, n - 8, 8, 8);
  push(n - 8, 0, 8, 8);
  // Timing run.
  push(6, 8, 1, n - 16);
  push(8, 6, n - 16, 1);
  // Alignment patterns, except the three that sit on the finders.
  for (const ar of matrix.alignment) {
    for (const ac of matrix.alignment) {
      if (
        (ar === 6 && (ac === 6 || ac === n - 7)) ||
        (ac === 6 && ar === n - 7)
      ) continue;
      push(ar - 2, ac - 2, 5, 5);
    }
  }
  return rects.join("");
}

export function renderSticker(
  matrix: LookMatrix,
  box: LookBox,
  options: StickerOptions,
): string {
  const n = matrix.count;
  const borderW = box.size * 0.017;
  const card = stickerShapePath(
    {
      x: box.x + borderW / 2,
      y: box.y + borderW / 2,
      size: box.size - borderW,
    },
    options.shape,
  );

  // The code must sit inside the die-cut shape, not outside it. A circle's
  // inscribed square is only 70.7% of its diameter, so the usable area shrinks
  // per shape before the quiet zone is even counted.
  const usable = options.shape === "circle"
    ? 0.69
    : options.shape === "ticket"
    ? 0.78
    : 0.84;
  const face = box.size * usable;
  const faceX = box.x + (box.size - face) / 2;
  const faceY = box.y + (box.size - face) / 2;

  // Quiet zone: at least 4 modules, wrapped inside the die-cut edge.
  const margin = Math.max(0.082, 4.6 / (n + 8)) * face;
  const code = face - margin * 2;
  const cell = code / n;
  const x0 = faceX + margin;
  const y0 = faceY + margin;
  const fill = options.moduleFill ?? options.ink;

  const art = options.artImage
    ? `<g clip-path="url(#qrb-art-clip)"><image x="${f(box.x)}" y="${
      f(box.y)
    }" width="${f(box.size)}" height="${
      f(box.size)
    }" preserveAspectRatio="xMidYMid slice" href="${
      escapeXml(options.artImage)
    }" xlink:href="${escapeXml(options.artImage)}"/><rect x="${f(box.x)}" y="${
      f(box.y)
    }" width="${f(box.size)}" height="${f(box.size)}" fill="${
      escapeXml(options.bg)
    }" opacity="0.58"/></g>`
    : "";

  const modules: string[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (matrix.isCleared(row, col) || !matrix.isDark(row, col)) continue;
      const structural = isStructuralModule(row, col, n, matrix.alignment);
      // Data modules shrink so the artwork breathes between them; function
      // patterns stay full size so the decoder never has to guess.
      const scale = structural ? 1.02 : 0.62;
      const inset = (1 - scale) / 2;
      modules.push(
        `<rect x="${f(x0 + (col + inset) * cell)}" y="${
          f(y0 + (row + inset) * cell)
        }" width="${f(cell * scale)}" height="${f(cell * scale)}" rx="${
          structural ? 0 : f(cell * 0.18)
        }"/>`,
      );
    }
  }

  // Kiss-cut line: the faint inner trace of a sticker sheet. It sells the
  // object without stealing contrast from the code.
  const kiss = stickerShapePath(
    {
      x: box.x + box.size * 0.033,
      y: box.y + box.size * 0.033,
      size: box.size - box.size * 0.066,
    },
    options.shape,
  );

  return `<defs><clipPath id="qrb-art-clip"><path d="${card}"/></clipPath></defs>` +
    `<path d="${card}" fill="${
      escapeXml(options.card ?? options.bg)
    }" stroke="${escapeXml(options.ink)}" stroke-width="${f(borderW)}"/>` +
    `<path d="${kiss}" fill="none" stroke="${
      escapeXml(options.ink)
    }" stroke-width="${f(box.size * 0.004)}" opacity="0.3"/>` +
    art +
    // Over artwork the protector keeps a hint of the picture so it reads as a
    // wash, not a pasted white box; the ink is still far darker than 40% grey.
    `<g fill="${
      escapeXml(options.artImage ? options.bg : (options.card ?? options.bg))
    }"${options.artImage ? ' opacity="0.86"' : ""}>${
      protectorRects(matrix, cell, x0, y0)
    }</g>` +
    `<g fill="${escapeXml(fill)}">${modules.join("")}</g>`;
}

/* ─────────────────────────────── Pocket ─────────────────────────────── */

/** Chunky 8-bit sticker: squared modules, a stitched pixel bezel, four tones. */
export function renderPocket(
  matrix: LookMatrix,
  box: LookBox,
  options: PocketOptions,
): string {
  const n = matrix.count;
  const radius = box.size * 0.055;
  const margin = Math.max(0.10, 5.2 / (n + 8)) * box.size;
  const code = box.size - margin * 2;
  const cell = code / n;
  const x0 = box.x + margin;
  const y0 = box.y + margin;
  const fill = options.moduleFill ?? options.ink;

  // Stitched bezel: small squares stepping round the card, no curves.
  const step = box.size / 26;
  const dot = step * 0.52;
  const bezel: string[] = [];
  const edge = (cx: number, cy: number) =>
    bezel.push(
      `<rect x="${f(cx - dot / 2)}" y="${f(cy - dot / 2)}" width="${
        f(dot)
      }" height="${f(dot)}"/>`,
    );
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    edge(box.x + t * box.size, box.y + step * 0.62);
    edge(box.x + t * box.size, box.y + box.size - step * 0.62);
    edge(box.x + step * 0.62, box.y + t * box.size);
    edge(box.x + box.size - step * 0.62, box.y + t * box.size);
  }

  const modules: string[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (matrix.isCleared(row, col) || !matrix.isDark(row, col)) continue;
      const structural = isStructuralModule(row, col, n, matrix.alignment);
      const scale = structural ? 1.04 : 0.82;
      const inset = (1 - scale) / 2;
      modules.push(
        `<rect x="${f(x0 + (col + inset) * cell)}" y="${
          f(y0 + (row + inset) * cell)
        }" width="${f(cell * scale)}" height="${f(cell * scale)}"/>`,
      );
    }
  }

  return `<path d="${
    roundedRectPath(box.x, box.y, box.size, box.size, radius)
  }" fill="${escapeXml(options.bg)}"/>` +
    `<g fill="${escapeXml(options.bezel)}">${bezel.join("")}</g>` +
    `<g fill="${escapeXml(options.bg)}">${
      protectorRects(matrix, cell, x0, y0)
    }</g>` +
    `<g fill="${escapeXml(fill)}">${modules.join("")}</g>` +
    `<path d="${
      roundedRectPath(
        box.x + box.size * 0.035,
        box.y + box.size * 0.035,
        box.size * 0.93,
        box.size * 0.93,
        radius * 0.7,
      )
    }" fill="none" stroke="${escapeXml(options.accent)}" stroke-width="${
      f(box.size * 0.008)
    }"/>`;
}

/** The four DMG-inspired tones. No trademark in the name, just the flavour. */
export const POCKET_DMG = {
  bg: "#9BBC0F",
  ink: "#0F380F",
  bezel: "#8BAC0F",
  accent: "#306230",
} as const;

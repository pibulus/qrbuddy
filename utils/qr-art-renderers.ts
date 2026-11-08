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
import {
  type ArtSample,
  decodeSample,
  luminance,
  sampleColor,
} from "./qr-art-sample.ts";

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
  /** Thin reads as card stock, chunky as a block. */
  depth?: "thin" | "chunky";
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
  const lift = options.depth === "thin" ? 0.62 : 1.45;
  const ex = s * 0.052 * lift;
  const ey = s * 0.058 * lift;
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

/* ───────────────────────────── Halftone ────────────────────────────── */

export type PlateShape = "square" | "rounded" | "circle";

export interface HalftoneOptions {
  /** Colour grid sampled from the artwork at upload time. */
  sample: ArtSample;
  /** `color` keeps the photo's hues; `dmg` is the four-green print set. */
  tone: "color" | "dmg" | "ink";
  shape: PlateShape;
  /** Palette paper for the plate. */
  bg: string;
  /** Palette ink for function patterns and the plate edge. */
  ink: string;
}

const DMG_PAPER = "#9BBC0F";
const DMG_INK = "#0F380F";

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

function platePath(box: LookBox, shape: PlateShape): string {
  if (shape === "circle") {
    const r = box.size / 2;
    return `M${f(box.x)} ${f(box.y + r)}a${f(r)} ${f(r)} 0 1 0 ${
      f(box.size)
    } 0a${f(r)} ${f(r)} 0 1 0 -${f(box.size)} 0Z`;
  }
  return roundedRectPath(
    box.x,
    box.y,
    box.size,
    box.size,
    shape === "rounded" ? box.size * 0.19 : 0,
  );
}

/** Share of the plate a square code can occupy without touching the edge. */
export function plateUsable(shape: PlateShape): number {
  return shape === "circle" ? 0.70 : 0.88;
}

/** Slots that must stay paper-clean for a decoder: separators + timing. */
function protectorRects(
  matrix: LookMatrix,
  cell: number,
  x0: number,
  y0: number,
): string {
  const n = matrix.count;
  const rects: string[] = [];
  const push = (row: number, col: number, w: number, h: number) =>
    rects.push(
      `<rect x="${f(x0 + col * cell)}" y="${f(y0 + row * cell)}" width="${
        f(w * cell)
      }" height="${f(h * cell)}"/>`,
    );
  push(0, 0, 8, 8);
  push(0, n - 8, 8, 8);
  push(n - 8, 0, 8, 8);
  push(6, 8, 1, n - 16);
  push(8, 6, n - 16, 1);
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

/** Scales an RGB triple so its luminance lands on `target`, hue intact. */
function tintToLuminance(
  rgb: [number, number, number],
  target: number,
): [number, number, number] {
  const y = luminance(rgb[0], rgb[1], rgb[2]);
  if (y < 0.004) {
    const v = Math.round(target * 90);
    return [v, v, v];
  }
  const k = Math.min(3.2, target / y);
  // A touch of chroma after the value pin: a photo scaled to 25% grey turns
  // muddy, and the whole point is that the hue survives.
  const boost = 1.9;
  const grey = y * 255;
  return [
    Math.max(0, Math.min(255, grey + (rgb[0] * k - grey) * boost)),
    Math.max(0, Math.min(255, grey + (rgb[1] * k - grey) * boost)),
    Math.max(0, Math.min(255, grey + (rgb[2] * k - grey) * boost)),
  ];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Halftone: the artwork stops being a background and becomes the ink.
 *
 * Every dark module is a dot whose size follows the local darkness of the
 * picture (0.54 → 1.0 of a cell) and whose colour follows its hue. Bright
 * areas print small dots, dark areas print solid tiles, so the photo appears as
 * a tonal field the code is woven into — not a photo with a code stuck on it.
 *
 * Polarity is never touched: the matrix decides which cells carry a dot, the
 * artwork decides how heavy and what colour. That is why the decoder gate stays
 * green, and it is the line between this and AI QR art.
 */
/**
 * Halftone: the artwork stops being a background and becomes the ink.
 *
 * Each module is a 4×4 sub-grid. The module's centre 2×2 is forced — ink for a
 * dark module, paper for a light one — so the decoder always samples a clean
 * polarity. The surrounding twelve sub-cells are ordered-dithered against the
 * photo's local darkness, which is what makes the picture appear: a dark
 * region fills its ring, a bright region leaves it open. The code sets the
 * grid, the photo sets the density, and neither can break the other.
 */
export function renderHalftone(
  matrix: LookMatrix,
  box: LookBox,
  options: HalftoneOptions,
): string {
  const n = matrix.count;
  const rgb = decodeSample(options.sample);
  const dmg = options.tone === "dmg";
  const paper = dmg ? DMG_PAPER : options.bg;
  const structuralInk = dmg ? DMG_INK : options.ink;

  const shape = platePath(box, options.shape);
  const face = box.size * plateUsable(options.shape);
  const faceX = box.x + (box.size - face) / 2;
  const faceY = box.y + (box.size - face) / 2;
  const margin = Math.max(4 / (n + 8), 0.055) * face;
  const code = face - margin * 2;
  const cell = code / n;
  const x0 = faceX + margin;
  const y0 = faceY + margin;
  const SUB = 4;

  // Histogram stretch on the sample's own tones. Most photos sit in the middle,
  // so min/max would flatten the dither into one density; the 5th/95th
  // percentile gives the halftone its full range without clipping a highlight.
  const sn = options.sample.n;
  const histogram = new Array(32).fill(0);
  if (rgb) {
    for (let i = 0; i < sn * sn; i++) {
      const l = luminance(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
      histogram[Math.min(31, Math.max(0, Math.floor(l * 31)))]++;
    }
  }
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  const percentile = (share: number) => {
    let acc = 0;
    for (let i = 0; i < histogram.length; i++) {
      acc += histogram[i];
      if (acc / total >= share) return i / 31;
    }
    return 1;
  };
  const lo = rgb ? percentile(0.05) : 0;
  const hi = rgb ? Math.max(lo + 0.1, percentile(0.95)) : 1;
  const norm = (l: number) => clamp01((l - lo) / (hi - lo));

  // One path per ink bucket keeps the file small while the hue still moves
  // across the picture.
  const buckets = new Map<string, string[]>();
  const pushCell = (fill: string, path: string) => {
    const list = buckets.get(fill);
    if (list) list.push(path);
    else buckets.set(fill, [path]);
  };

  const solids: string[] = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (matrix.isCleared(row, col)) continue;
      const dark = matrix.isDark(row, col);
      if (isStructuralModule(row, col, n, matrix.alignment)) {
        if (dark) {
          solids.push(
            `<rect x="${f(x0 + col * cell)}" y="${f(y0 + row * cell)}" width="${
              f(cell * 1.02)
            }" height="${f(cell * 1.02)}"/>`,
          );
        }
        continue;
      }

      // Colour is a per-module decision: the eye reads hue at a coarser scale
      // than tone, and one fill per module lets the ink merge into long runs.
      const centre = rgb
        ? sampleColor(rgb, sn, (col + 0.5) / n, (row + 0.5) / n)
        : null;
      let fill = options.ink;
      if (centre && dmg) fill = DMG_INK;
      else if (centre && options.tone === "color") {
        const tint = tintToLuminance(centre, 0.30);
        fill = `rgb(${Math.round(tint[0] / 32) * 32},${
          Math.round(tint[1] / 32) * 32
        },${Math.round(tint[2] / 32) * 32})`;
      }

      // Tone is a per-sub-cell decision, so the halftone resolves at 4× the
      // module grid instead of printing one flat density per module.
      const want: number[] = [];
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const u = (col * SUB + sx + 0.5) / (n * SUB);
          const v = (row * SUB + sy + 0.5) / (n * SUB);
          const local = rgb ? sampleColor(rgb, sn, u, v) : null;
          want.push(local ? 1 - norm(luminance(...local)) : 0.5);
        }
      }

      // The centre 2×2 is the one a decoder samples: it always matches the
      // module. The surrounding ring is free to follow the picture.
      const core = new Set([5, 6, 9, 10]);
      const ink = new Array(SUB * SUB).fill(false);
      for (let i = 0; i < SUB * SUB; i++) {
        ink[i] = core.has(i) ? dark : want[i] > (dark ? 0.45 : 0.7);
      }
      // Hold the polarity: a dark module never opens past half paper, a light
      // one never gains more than a quarter ink, however bright or dark the
      // picture is at that spot.
      const target = dark ? 7 : 3;
      let count = ink.reduce((a, on) => a + (on ? 1 : 0), 0);
      if (dark && count < target) {
        while (count < target) {
          let best = -1;
          for (let i = 0; i < SUB * SUB; i++) {
            if (ink[i] || core.has(i)) continue;
            if (best < 0 || want[i] > want[best]) best = i;
          }
          if (best < 0) break;
          ink[best] = true;
          count++;
        }
      } else if (!dark && count > target) {
        while (count > target) {
          let worst = -1;
          for (let i = 0; i < SUB * SUB; i++) {
            if (!ink[i] || core.has(i)) continue;
            if (worst < 0 || want[i] < want[worst]) worst = i;
          }
          if (worst < 0) break;
          ink[worst] = false;
          count--;
        }
      }

      const baseX = col * SUB;
      const baseY = row * SUB;
      for (let sy = 0; sy < SUB; sy++) {
        let runStart = -1;
        for (let sx = 0; sx <= SUB; sx++) {
          const on = sx < SUB && ink[sy * SUB + sx];
          if (on && runStart < 0) runStart = sx;
          if (!on && runStart >= 0) {
            const len = sx - runStart;
            pushCell(
              fill,
              `M${baseX + runStart} ${baseY + sy}h${len}v1h-${len}Z`,
            );
            runStart = -1;
          }
        }
      }
    }
  }

  const ink = [...buckets.entries()].map(([fill, cells]) =>
    `<path d="${cells.join("")}" fill="${fill}"/>`
  ).join("");

  return `<path d="${shape}" fill="${escapeXml(paper)}" stroke="${
    escapeXml(structuralInk)
  }" stroke-width="${f(box.size * 0.012)}"/><g fill="${escapeXml(paper)}">${
    protectorRects(matrix, cell, x0, y0)
  }</g><g fill="${escapeXml(structuralInk)}">${
    solids.join("")
  }</g><g transform="translate(${f(x0)} ${f(y0)}) scale(${
    f(cell / SUB)
  })" shape-rendering="crispEdges">${ink}</g>`;
}

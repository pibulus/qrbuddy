/**
 * Pure-TS Gradient Vector SVG 1.1 Builder (`utils/qr-vector-svg.ts`)
 *
 * Zero DOM or <canvas> requirement. Generates standalone, print-verified
 * SVG 1.1 markup and Base64 Data URLs for:
 * - Canva Apps SDK v2 (`upload({ mimeType: "image/svg+xml", url: dataUrl, aiDisclosure: "none" })`)
 * - Figma Community Plugin (`figma.createNodeFromSvg(svgString)`)
 * - Adobe Express Add-ons & headless server/CLI vector exports
 */

import qrcode from "qrcode-generator";
import {
  buildQrFilename,
  escapeXml,
  measureCaptionUnicodeFallback,
} from "./svg-export.ts";
import { parseColorToRgb } from "./qr-styles.ts";
import {
  foilSideColors,
  renderFoil,
  renderHalftone,
} from "./qr-art-renderers.ts";
import {
  decodeSample,
  defaultSample,
  luminance,
  sampleColor,
} from "./qr-art-sample.ts";
import { chooseFlips, codewordGroups } from "./qr-codewords.ts";
import {
  ensureContrast,
  printContrast,
  printFilterDefs,
  printSeed,
  type PrintStyle,
  printTooth,
  risoInks,
  risoOffset,
} from "./qr-print.ts";
import type {
  ArtSample,
  CornerSquareShape,
  DotShape,
  Gradient,
  PlateShape,
  RenderMode,
} from "../types/qr-types.ts";

export { buildQrFilename };

export interface VectorPalette {
  id: string;
  label: string;
  c1: string;
  c2: string;
  bg: string;
  rounded?: boolean;
  dotShape?: DotShape;
  cornerSquareShape?: CornerSquareShape;
}

/**
 * Luminance-locked pastel-punk & solid palettes matching `utils/qr-styles.ts`.
 */
export const VECTOR_PALETTES: Record<string, VectorPalette> = {
  sunset: {
    id: "sunset",
    label: "Sunset",
    c1: "#C9184A",
    c2: "#5A189A",
    bg: "#FFF8F6",
    dotShape: "rounded",
    cornerSquareShape: "extra-rounded",
  },
  candy: {
    id: "candy",
    label: "Candy",
    c1: "#B5179E",
    c2: "#3F37C9",
    bg: "#FDF7FF",
    dotShape: "dots",
    cornerSquareShape: "dot",
  },
  blush: {
    id: "blush",
    label: "Crimson",
    c1: "#800F2F",
    c2: "#C9184A",
    bg: "#FFF7F9",
    dotShape: "classy-rounded",
    cornerSquareShape: "dot",
  },
  matcha: {
    id: "matcha",
    label: "Forest",
    c1: "#1B4332",
    c2: "#0F6E56",
    bg: "#F6FBF7",
    dotShape: "classy-rounded",
    cornerSquareShape: "extra-rounded",
  },
  pool: {
    id: "pool",
    label: "Ocean",
    c1: "#0B4F6C",
    c2: "#1D3557",
    bg: "#F5FAFE",
    dotShape: "extra-rounded",
    cornerSquareShape: "extra-rounded",
  },
  vapor: {
    id: "vapor",
    label: "Vaporwave",
    c1: "#7209B7",
    c2: "#006466",
    bg: "#F8F6FF",
    dotShape: "dots",
    cornerSquareShape: "extra-rounded",
  },
  grape: {
    id: "grape",
    label: "Cosmic",
    c1: "#3C096C",
    c2: "#7B2CBF",
    bg: "#FBF7FF",
    dotShape: "classy",
    cornerSquareShape: "extra-rounded",
  },
  terminal: {
    id: "terminal",
    label: "Matrix",
    c1: "#00FF41",
    c2: "#00FF41",
    bg: "#0A0A0A",
    rounded: false,
    dotShape: "square",
    cornerSquareShape: "square",
  },
  brutalist: {
    id: "brutalist",
    label: "Brutal",
    c1: "#000000",
    c2: "#000000",
    bg: "#FFFF00",
    rounded: false,
    dotShape: "square",
    cornerSquareShape: "square",
  },
  noir: {
    id: "noir",
    label: "Classic",
    c1: "#1E1B4B",
    c2: "#0F172A",
    bg: "#FFFDF9",
    dotShape: "rounded",
    cornerSquareShape: "extra-rounded",
  },
  licorice: {
    id: "licorice",
    label: "Classic",
    c1: "#1E1714",
    c2: "#1E1714",
    bg: "#FFFEF7",
    dotShape: "rounded",
    cornerSquareShape: "extra-rounded",
  },
};

/** Smallest QR version that gives the halftone enough grid to draw a picture. */
const HALFTONE_FLOOR = 8;

/**
 * Share of the codeword stream `sharp` is allowed to invert. The measured
 * ceiling on a v8-H code at the 250px probe is 25%; 16% leaves a third of the
 * budget for a scuffed print, and lands on 39 codewords for a 49-module code.
 */
const HALFTONE_FLIP_SHARE = 0.16;

export interface BuildQrSvgOptions {
  logoUrl?: string;
  centerShape?: "squircle" | "circle" | "knockout";
  dotsGradient?: Gradient;
  backgroundGradient?: Gradient;
  eyeGradient?: Gradient;
  eyeColor?: string;
  data: string;
  palette?: keyof typeof VECTOR_PALETTES;
  c1?: string;
  c2?: string;
  bg?: string;
  caption?: string;
  size?: number;
  quietZone?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  rounded?: boolean;
  dotShape?: DotShape;
  cornerSquareShape?: CornerSquareShape;
  /** Presentation layer. Defaults to the flat, print-tested classic matrix. */
  renderMode?: RenderMode;
  artSample?: ArtSample;
  halftoneTone?: "color" | "dmg" | "ink";
  halftoneShape?: PlateShape;
  halftoneDetail?: "soft" | "sharp";
  /** Test hook: force the flip share instead of the adaptive default. */
  halftoneFlipShare?: number;
  /**
   * Surface: `clean` vector, `paper` stock, or `riso` two-drum misregistration.
   * Orthogonal to the look — any look can come off any of the three.
   */
  print?: PrintStyle;
  foilDepth?: "thin" | "chunky";
  /** Grid floor for art looks. Thumbnails pass a coarse one on purpose. */
  artVersionFloor?: number;
}

export type QrVectorOptions = BuildQrSvgOptions;

function isFinderModule(row: number, col: number, count: number): boolean {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= count - 7;
  const inBottomLeft = row >= count - 7 && col < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0) {
    return `M${x},${y}h${w}v${h}h-${w}Z`;
  }
  const x2 = Number((x + w).toFixed(2));
  const y2 = Number((y + h).toFixed(2));
  const rx = Number(rad.toFixed(2));
  const sx = Number((x + rad).toFixed(2));
  const sy = Number(y.toFixed(2));
  return [
    `M${sx},${sy}`,
    `H${Number((x2 - rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${x2},${Number((y + rad).toFixed(2))}`,
    `V${Number((y2 - rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${Number((x2 - rad).toFixed(2))},${y2}`,
    `H${sx}`,
    `A${rx},${rx} 0 0 1 ${Number(x.toFixed(2))},${
      Number((y2 - rad).toFixed(2))
    }`,
    `V${Number((y + rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${sx},${sy}`,
    "Z",
  ].join("");
}

function circlePath(cx: number, cy: number, r: number): string {
  const rx = Number(r.toFixed(2));
  const d = Number((r * 2).toFixed(2));
  const x1 = Number((cx - r).toFixed(2));
  const y = Number(cy.toFixed(2));
  return `M${x1},${y}a${rx},${rx} 0 1,0 ${d},0a${rx},${rx} 0 1,0 -${d},0Z`;
}

function leafRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0) {
    return `M${x},${y}h${w}v${h}h-${w}Z`;
  }
  const x1 = Number(x.toFixed(2));
  const y1 = Number(y.toFixed(2));
  const x2 = Number((x + w).toFixed(2));
  const y2 = Number((y + h).toFixed(2));
  const rx = Number(rad.toFixed(2));
  const sx = Number((x + rad).toFixed(2));
  return [
    `M${sx},${y1}`,
    `H${x2}`,
    `V${Number((y2 - rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${Number((x2 - rad).toFixed(2))},${y2}`,
    `H${x1}`,
    `V${Number((y + rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${sx},${y1}`,
    "Z",
  ].join("");
}

function finderPatternPaths(
  originX: number,
  originY: number,
  cellSize: number,
  rounded: boolean,
  cornerSquareShape?: CornerSquareShape,
): string {
  const outerSize = cellSize * 7;
  const innerCutX = originX + cellSize;
  const innerCutY = originY + cellSize;
  const innerCutSize = cellSize * 5;
  const dotX = originX + cellSize * 2;
  const dotY = originY + cellSize * 2;
  const dotSize = cellSize * 3;

  const effectiveCorner = !rounded
    ? "square"
    : (cornerSquareShape ?? "extra-rounded");

  if (effectiveCorner === "octagon") {
    const octagon = (x: number, y: number, size: number) => {
      const k = size * 0.2;
      return `M${x + k},${y}h${size - 2 * k}l${k},${k}v${
        size - 2 * k
      }l${-k},${k}h${-size + 2 * k}l${-k},${-k}v${-size + 2 * k}Z`;
    };
    return octagon(originX, originY, outerSize) +
      octagon(innerCutX, innerCutY, innerCutSize) +
      octagon(dotX, dotY, dotSize);
  }

  const outerR = effectiveCorner === "square"
    ? 0
    : effectiveCorner === "dot"
    ? cellSize * 3.5
    : cellSize * 1.6;
  const innerR = effectiveCorner === "square"
    ? 0
    : effectiveCorner === "dot"
    ? cellSize * 2.5
    : cellSize * 1.1;
  const dotR = effectiveCorner === "square"
    ? 0
    : effectiveCorner === "dot"
    ? cellSize * 1.5
    : cellSize * 0.85;

  return [
    roundedRectPath(originX, originY, outerSize, outerSize, outerR),
    roundedRectPath(innerCutX, innerCutY, innerCutSize, innerCutSize, innerR),
    roundedRectPath(dotX, dotY, dotSize, dotSize, dotR),
  ].join("");
}

function dataModulePath(
  x: number,
  y: number,
  cellSize: number,
  dotShape: DotShape,
): string {
  switch (dotShape) {
    case "diamond":
      return `M${x + cellSize / 2},${y}l${cellSize / 2},${cellSize / 2}l${
        -cellSize / 2
      },${cellSize / 2}l${-cellSize / 2},${-cellSize / 2}Z`;
    case "square":
      return roundedRectPath(x, y, cellSize, cellSize, 0);
    case "dots":
      return circlePath(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize * 0.44,
      );
    case "classy-rounded":
      return leafRectPath(x, y, cellSize, cellSize, cellSize * 0.45);
    case "classy":
      return leafRectPath(x, y, cellSize, cellSize, cellSize * 0.28);
    case "extra-rounded":
      return roundedRectPath(x, y, cellSize, cellSize, cellSize * 0.46);
    case "rounded":
    default:
      return roundedRectPath(x, y, cellSize, cellSize, cellSize * 0.34);
  }
}

/** QR alignment centres from ISO version geometry (versions 1–40). */
export function alignmentCenters(count: number): number[] {
  const version = (count - 17) / 4;
  if (version === 1) return [];
  const n = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.floor((version * 4 + n * 2 + 1) / (n * 2 - 2)) * 2;
  const positions = [6];
  for (let i = n - 1; i > 0; i--) positions.push(count - 7 - (i - 1) * step);
  return positions;
}

/** Whole-module excavation, never a clipping mask through data modules.
 * Shrink/omit if a centre alignment pattern would be damaged. H is not a
 * licence to erase function patterns, nor a guarantee for arbitrary logos. */
export function centerCutout(
  count: number,
): { start: number; end: number } | null {
  const centers = alignmentCenters(count);
  let side = Math.floor(count * 0.26);
  if (side % 2 === 0) side--;
  for (; side >= 5; side -= 2) {
    const start = (count - side) / 2;
    const end = start + side;
    if (start <= 8) continue; // finder separators, timing and format strips
    const overlapsAlignment = centers.some((row) =>
      centers.some((col) => {
        if (
          (row === 6 && (col === 6 || col === count - 7)) ||
          (col === 6 && row === count - 7)
        ) return false;
        return row + 2 >= start && row - 2 < end && col + 2 >= start &&
          col - 2 < end;
      })
    );
    if (!overlapsAlignment) return { start, end };
  }
  return null;
}

function gradientDef(
  id: string,
  gradient: Gradient | undefined,
  fallback: string,
): string {
  if (!gradient) {
    // Two stops even for a flat colour: several SVG rasterizers (librsvg via
    // ImageMagick, older Inkscape) paint single-stop gradients black.
    return `<linearGradient id="${id}"><stop offset="0%" stop-color="${
      escapeXml(fallback)
    }"/><stop offset="100%" stop-color="${
      escapeXml(fallback)
    }"/></linearGradient>`;
  }
  const stops = gradient.colorStops.map((s) =>
    `<stop offset="${s.offset * 100}%" stop-color="${escapeXml(s.color)}"/>`
  ).join("");
  if (gradient.type === "radial") {
    return `<radialGradient id="${id}">${stops}</radialGradient>`;
  }
  const angle = gradient.rotation ?? Math.PI * 0.75;
  const x = Math.cos(angle) * 50, y = Math.sin(angle) * 50;
  return `<linearGradient id="${id}" x1="${50 - x}%" y1="${50 - y}%" x2="${
    50 + x
  }%" y2="${50 + y}%">${stops}</linearGradient>`;
}

/**
 * Centre mark badge: paper ground, clipped logo, chunky ring. Shared by the
 * classic excavation and the foil overlay so a mark looks the same everywhere.
 */
function markBadge(options: {
  x: number;
  y: number;
  size: number;
  ring: number;
  shape?: "squircle" | "circle" | "knockout";
  bg: string;
  logoUrl: string;
}): string {
  const { x, y, size, ring, shape, bg, logoUrl } = options;
  const radius = shape === "circle"
    ? size / 2
    : shape === "knockout"
    ? 0
    : size * 0.26;
  // Chunky ring drawn INSIDE the mark so it never spills into the moat.
  // Knockout omits the box but keeps a paper ground for legibility.
  const inset = ring / 2;
  const badge = shape === "knockout"
    ? ""
    : `<rect x="${x + inset}" y="${y + inset}" width="${size - ring}" height="${
      size - ring
    }" rx="${
      Math.max(0, radius - inset)
    }" fill="none" stroke="#1e1714" stroke-width="${ring}"/>`;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${
    escapeXml(bg)
  }"/><defs><clipPath id="qrb-mark-clip"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"/></clipPath></defs><image data-center-mark="true" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" clip-path="url(#qrb-mark-clip)" href="${
    escapeXml(logoUrl)
  }" xlink:href="${escapeXml(logoUrl)}"/>` + badge;
}

/**
 * Builds a complete, standalone SVG 1.1 string with 135-degree linear gradient
 * and optional Soft Neo-Toybrut framed card + caption.
 */
export function buildQrSvgString(options: BuildQrSvgOptions): string {
  const payload = (options.data || "https://qrbuddy.app").trim();
  const preset = VECTOR_PALETTES[options.palette ?? "sunset"] ??
    VECTOR_PALETTES.sunset;
  const c1 = options.c1 ?? preset.c1;
  const c2 = options.c2 ?? preset.c2;
  const bg = options.bg ?? preset.bg;
  const hasMark = Boolean(
    options.logoUrl &&
      /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/i.test(options.logoUrl),
  );
  const mode: RenderMode = options.renderMode ?? "classic";
  const ecl = hasMark || mode !== "classic" || options.dotShape === "diamond" ||
      options.dotShape === "dots"
    ? "H"
    : options.errorCorrectionLevel ?? "Q";
  const rounded = options.rounded ?? preset.rounded ?? true;
  const dotShape: DotShape = !rounded
    ? "square"
    : (options.dotShape ?? preset.dotShape ?? "rounded");
  const cornerSquareShape: CornerSquareShape = !rounded
    ? "square"
    : (options.cornerSquareShape ?? preset.cornerSquareShape ??
      "extra-rounded");
  // Artwork is a same-origin raster only, sampled at upload: the renderer never
  // decodes an image, so an external URL can never taint an export canvas.
  const hasSample = Boolean(
    options.artSample && typeof options.artSample.data === "string" &&
      options.artSample.data.length > 0 && options.artSample.n >= 2,
  );

  // Art looks want a finer grid than the payload needs: at 25 modules the
  // halftone is a coarse mosaic, at 61 it is a picture. Encode once to learn
  // the true version, then re-encode no lower than the detail floor.
  const encode = (version: number) => {
    const code = qrcode(Math.max(0, version), ecl);
    code.addData(payload);
    code.make();
    return code;
  };
  let qr = encode(0);
  const needed = (qr.getModuleCount() - 17) / 4;
  // 49 modules is the balance point: bold enough that the code still reads on
  // the 336px stage, fine enough for a 1000px print to hold 196 halftone cells.
  const floor = mode === "halftone"
    ? Math.max(0, options.artVersionFloor ?? HALFTONE_FLOOR)
    : 0;
  const want = Math.max(needed, floor);
  if (want !== needed) qr = encode(want);

  const moduleCount = qr.getModuleCount();
  const quietZone = options.quietZone !== undefined
    ? Math.max(0, options.quietZone)
    : 4;
  const totalModules = moduleCount + quietZone * 2;
  const qrBoxSize = options.size ?? 1000;
  const cellSize = qrBoxSize / totalModules;

  // Print is seeded from the payload, so a link always comes off the same
  // sheet. A foil slab is a manufactured object; stock and drums belong to paper.
  const printStyle: PrintStyle = mode === "foil"
    ? "clean"
    : options.print ?? "clean";
  const print = {
    style: printStyle,
    seed: printSeed(payload),
    size: qrBoxSize,
    ink: "#1e1714",
  };
  const riso = printStyle === "riso" ? risoOffset(print.seed, qrBoxSize) : null;
  // Every ink the palette offers, so the press can choose the two drums rather
  // than inheriting whichever colour happened to sit first in the gradient.
  const risoStops = (options.dotsGradient?.colorStops ?? []).map((stop) =>
    stop.color
  );
  const [risoInk, risoSpot] = risoInks(
    risoStops.length >= 2 ? risoStops : [c1, c2],
    bg,
  );

  const captionText = (options.caption ?? "").trim().toUpperCase();
  const hasCaption = captionText.length > 0;

  const pad = hasCaption ? 64 : 0;
  const border = hasCaption ? 20 : 0;
  const capH = hasCaption ? 170 : 0;
  const totalWidth = qrBoxSize + pad * 2;
  const totalHeight = qrBoxSize + pad * 2 + capH;

  const offsetX = pad + quietZone * cellSize;
  const offsetY = pad + quietZone * cellSize;

  const pathChunks: string[] = [];
  // Art looks overlay their mark instead of excavating it. A halftone runs at
  // a version where the only centred holes land on alignment patterns, and a
  // foil hole is skewed anyway — a badge over the texture reads better and H
  // carries the lost area.
  const cutout = hasMark && mode === "classic"
    ? centerCutout(moduleCount)
    : null;
  const isCleared = (r: number, c: number) =>
    Boolean(
      cutout && r >= cutout.start && r < cutout.end && c >= cutout.start &&
        c < cutout.end,
    );
  // Sharp halftone spends part of the Reed–Solomon budget: whole codewords are
  // inverted where the picture disagrees with the code hardest. The decoder
  // repairs them, so the payload still reads — the gate proves it, the budget
  // is a share of the stream and scales with the version, not the payload.
  const flipped = new Set<string>();
  if (mode === "halftone" && options.halftoneDetail === "sharp") {
    const sample = hasSample
      ? decodeSample(options.artSample)
      : decodeSample(defaultSample(bg, c1));
    if (sample) {
      const sn = hasSample ? options.artSample!.n : 32;
      const want = (row: number, col: number) => {
        const local = sampleColor(
          sample,
          sn,
          (col + 0.5) / moduleCount,
          (row + 0.5) / moduleCount,
        );
        return (0.5 - luminance(local[0], local[1], local[2])) * 2;
      };
      // One risk allowance: the flip budget, a centre badge and a circular
      // plate all spend the same margin, so each gives way to the others.
      let share = options.halftoneFlipShare ?? HALFTONE_FLIP_SHARE;
      if (options.halftoneFlipShare === undefined) {
        if (hasMark) share *= 0.4;
        if (options.halftoneShape === "circle") share *= 0.45;
        // A stamped print is a scuffed print: the bite eats the same margin the
        // codeword flips spend, so the two halve each other rather than stack.
        if (printStyle === "riso") share *= 0.5;
      }
      const groups = codewordGroups(moduleCount);
      for (
        const index of chooseFlips(groups, qr.isDark.bind(qr), want, share)
      ) {
        for (const [row, col] of groups[index]) flipped.add(`${row},${col}`);
      }
    }
  }
  const dark = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= moduleCount || c >= moduleCount) return false;
    if (isCleared(r, c)) return false;
    const on = qr.isDark(r, c);
    return flipped.size ? on !== flipped.has(`${r},${c}`) : on;
  };

  // 3 Finder patterns
  // The spot drum never lands square: on a riso sheet the eye plate sits a hair
  // off in both axes and a fraction of a degree out of true. That single offset
  // is the whole tell, and because it moves colour rather than removing ink it
  // costs the decoder nothing.
  const finderChunks: string[] = [];
  const fx = offsetX + (riso?.dx ?? 0);
  const fy = offsetY + (riso?.dy ?? 0);
  finderChunks.push(
    finderPatternPaths(fx, fy, cellSize, rounded, cornerSquareShape),
    finderPatternPaths(
      fx + (moduleCount - 7) * cellSize,
      fy,
      cellSize,
      rounded,
      cornerSquareShape,
    ),
    finderPatternPaths(
      fx,
      fy + (moduleCount - 7) * cellSize,
      cellSize,
      rounded,
      cornerSquareShape,
    ),
  );

  const finderPaths = finderChunks.join("");
  const alignment = alignmentCenters(moduleCount);
  const structural = (r: number, c: number) =>
    r === 6 || c === 6 || r === 8 || c === 8 ||
    alignment.some((ar) =>
      Math.abs(r - ar) <= 2 && alignment.some((ac) => Math.abs(c - ac) <= 2)
    ) ||
    (moduleCount >= 45 &&
      ((r < 6 && c >= moduleCount - 11) || (c < 6 && r >= moduleCount - 11)));
  // Data modules. Melt rounds only exposed corners; neighbours stay connected.
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderModule(r, c, moduleCount)) continue;
      if (isCleared(r, c)) continue;
      if (!qr.isDark(r, c)) continue;
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      if (structural(r, c)) {
        pathChunks.push(dataModulePath(x, y, cellSize, "square"));
        continue;
      }
      if (dotShape === "rounded" || dotShape === "extra-rounded") {
        const k = cellSize * 0.48;
        const tl = !dark(r - 1, c) && !dark(r, c - 1) ? k : 0;
        const tr = !dark(r - 1, c) && !dark(r, c + 1) ? k : 0;
        const br = !dark(r + 1, c) && !dark(r, c + 1) ? k : 0;
        const bl = !dark(r + 1, c) && !dark(r, c - 1) ? k : 0;
        pathChunks.push(
          `M${x + tl},${y}H${x + cellSize - tr}q${tr},0 ${tr},${tr}V${
            y + cellSize - br
          }q0,${br} ${-br},${br}H${x + bl}q${-bl},0 ${-bl},${-bl}V${
            y + tl
          }q0,${-tl} ${tl},${-tl}Z`,
        );
      } else pathChunks.push(dataModulePath(x, y, cellSize, dotShape));
    }
  }

  // Looks. Each renderer receives the same matrix the classic path draws, so a
  // look can never invent modules the decoder will not see.
  let artBody = "";
  if (mode !== "classic") {
    const box = { x: pad, y: pad, size: qrBoxSize };
    const matrix = {
      count: moduleCount,
      isDark: dark,
      isCleared: (r: number, c: number) => mode !== "foil" && isCleared(r, c),
      alignment,
    };
    if (mode === "foil") {
      const derived = foilSideColors(c1, c2, bg, "#1e1714");
      artBody = renderFoil(matrix, box, {
        top: "url(#qrb-dots)",
        left: derived.left,
        right: derived.right,
        face: "url(#qrb-bg)",
        ink: "#1e1714",
        depth: options.foilDepth ?? "chunky",
      });
    } else if (mode === "halftone") {
      // Riso is a drum pair, not a tone: it takes the ink control over rather
      // than sitting next to it.
      const tone = printStyle === "riso"
        ? "riso"
        : options.halftoneTone ?? "color";
      artBody = renderHalftone(matrix, box, {
        sample: hasSample ? options.artSample! : defaultSample(bg, c1),
        tone: tone,
        shape: options.halftoneShape ?? "rounded",
        bg,
        // A halftone prints the palette's ink on the palette's paper. Near-black
        // is only the right structural ink while the paper is light enough to
        // carry it — on Matrix's near-black stock it is invisible, which is how
        // that look failed the gate for months.
        ink: printStyle === "riso"
          ? risoInk
          : printContrast("#1e1714", bg) >= 4.6
          ? "#1e1714"
          : ensureContrast(c1, bg),
        print,
        spots: [risoInk, risoSpot],
      });
    }
  }

  let frameRect = "";
  let qrBgRect = "";
  let captionElement = "";
  let markElement = "";
  if (hasMark && mode !== "classic") {
    // The badge rests on the art; nothing is excavated.
    const markSize = qrBoxSize * 0.2;
    markElement = markBadge({
      x: pad + (qrBoxSize - markSize) / 2,
      y: pad + (qrBoxSize - markSize) / 2,
      size: markSize,
      ring: qrBoxSize * 0.008,
      shape: options.centerShape,
      bg,
      logoUrl: options.logoUrl!,
    });
  } else if (cutout) {
    const holeSize = (cutout.end - cutout.start) * cellSize;
    // A tight moat makes the mark read as a centrepiece, not a watermark.
    const moat = Math.min(qrBoxSize * 0.012, holeSize * 0.1);
    const markSize = holeSize - moat * 2;
    markElement = markBadge({
      x: offsetX + cutout.start * cellSize + moat,
      y: offsetY + cutout.start * cellSize + moat,
      size: markSize,
      ring: qrBoxSize * 0.008,
      shape: options.centerShape,
      bg,
      logoUrl: options.logoUrl!,
    });
  }

  const maxSafeBgRadius = Math.max(0, Math.floor(quietZone * cellSize));
  const bgRadius = Math.min(
    Math.round(36 * (qrBoxSize / 1000)),
    maxSafeBgRadius,
  );
  const innerBgRadius = Math.min(
    Math.round(28 * (qrBoxSize / 1000)),
    maxSafeBgRadius,
  );

  if (hasCaption) {
    const cardX = border / 2;
    const cardY = border / 2;
    const cardW = totalWidth - border;
    const cardH = totalHeight - border;
    frameRect =
      `  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="56" ry="56" fill="#FFFEF7" stroke="#1E1714" stroke-width="${border}" />\n`;
    qrBgRect =
      `  <rect x="${pad}" y="${pad}" width="${qrBoxSize}" height="${qrBoxSize}" rx="${innerBgRadius}" ry="${innerBgRadius}" fill="${
        escapeXml(bg)
      }" />\n`;

    const baseFontSize = 92;
    const maxTextWidth = totalWidth - pad * 2;
    const measured = measureCaptionUnicodeFallback(captionText, baseFontSize);
    const fontSize = measured > maxTextWidth
      ? Math.max(38, Math.floor(baseFontSize * (maxTextWidth / measured)))
      : baseFontSize;
    const textY = qrBoxSize + pad + capH / 2 + 12;

    captionElement = `  <text x="${
      totalWidth / 2
    }" y="${textY}" fill="#1E1714" font-family="'Inter Black', Inter, system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${
      escapeXml(captionText)
    }</text>\n`;
  } else {
    qrBgRect =
      `  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" rx="${bgRadius}" ry="${bgRadius}" fill="${
        escapeXml(bg)
      }" />\n`;
  }

  // Tooth sits under the ink: specks only ever land on paper, never on a module.
  const cardTooth = printTooth(
    print,
    hasCaption ? pad : 0,
    hasCaption ? pad : 0,
    qrBoxSize,
    qrBoxSize,
    hasCaption ? 28 : 36,
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" data-ecl="${ecl}" data-modules="${moduleCount}" data-cutout="${
      mode !== "classic"
        ? (hasMark ? "overlay" : "none")
        : cutout
        ? `${cutout.start}:${cutout.end}`
        : "none"
    }" data-look="${mode}">`,
    `  <defs>`,
    `    <linearGradient id="qrb-grad" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0%" stop-color="${escapeXml(c1)}" />`,
    `      <stop offset="100%" stop-color="${escapeXml(c2)}" />`,
    `    </linearGradient>`,
    options.dotsGradient
      ? gradientDef("qrb-grad", options.dotsGradient, c1).replace(
        'id="qrb-grad"',
        'id="qrb-dots"',
      )
      : gradientDef("qrb-dots", {
        type: "linear",
        rotation: Math.PI / 4,
        colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }],
      }, c1),
    gradientDef("qrb-bg", options.backgroundGradient, bg),
    gradientDef("qrb-eyes", options.eyeGradient, options.eyeColor ?? c1),
    printFilterDefs(print),
    `  </defs>`,
    frameRect + qrBgRect.replace(/fill="[^"]*"/, 'fill="url(#qrb-bg)"') +
    cardTooth +
    (artBody ||
      (`  <path d="${pathChunks.join("")}" fill="${
        riso ? risoInk : "url(#qrb-dots)"
      }" fill-rule="evenodd" />\n` +
        `  <path d="${finderPaths}" fill="${
          riso ? options.eyeColor ?? risoSpot : "url(#qrb-eyes)"
        }" fill-rule="evenodd"${
          riso
            ? ` transform="rotate(${riso.rotate.toFixed(3)} ${
              (offsetX + (moduleCount * cellSize) / 2).toFixed(2)
            } ${(offsetY + (moduleCount * cellSize) / 2).toFixed(2)})"`
            : ""
        } />`)) +
    markElement +
    captionElement +
    `</svg>`,
  ].join("\n");
}

/**
 * Encodes an SVG string into an in-memory `data:image/svg+xml;base64,...` URI
 * accepted directly by Canva Apps SDK v2 `@canva/asset` `upload()`.
 */
export function toSvgDataUrl(svgMarkup: string): string {
  const bytes = new TextEncoder().encode(svgMarkup);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/**
 * Validates that an SVG string satisfies Canva Apps SDK v2 & Figma SVG 1.1 rules:
 * - Size < 3 MB
 * - Explicit numeric width and height attributes on root <svg>
 * - No <script>, <foreignObject>, or external <image> tags
 */
export function validateCanvaSvgCompliance(svgMarkup: string): {
  valid: boolean;
  byteLength: number;
  errors: string[];
} {
  const errors: string[] = [];
  const byteLength = new TextEncoder().encode(svgMarkup).byteLength;

  if (byteLength === 0) {
    errors.push("SVG markup is empty.");
  }
  if (byteLength > 3 * 1024 * 1024) {
    errors.push(`SVG exceeds Canva 3 MB limit (${byteLength} bytes).`);
  }
  if (!/<svg\b[^>]*\bwidth="\d+"/i.test(svgMarkup)) {
    errors.push("Root <svg> is missing explicit numeric width attribute.");
  }
  if (!/<svg\b[^>]*\bheight="\d+"/i.test(svgMarkup)) {
    errors.push("Root <svg> is missing explicit numeric height attribute.");
  }
  if (/<script\b/i.test(svgMarkup)) {
    errors.push("SVG contains forbidden <script> element.");
  }
  if (/<foreignObject\b/i.test(svgMarkup)) {
    errors.push("SVG contains forbidden <foreignObject> element.");
  }
  const imageTags = svgMarkup.match(/<image\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    const hrefMatches = [
      ...tag.matchAll(
        /(?:^|\s)(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
      ),
    ];
    const hrefs = hrefMatches.map((m) => (m[1] ?? m[2] ?? "").trim());
    const allInlineDataImages = hrefs.length > 0 &&
      hrefs.every((h) => /^data:image\//i.test(h));
    if (!allInlineDataImages) {
      errors.push("SVG contains external <image> element.");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    byteLength,
    errors,
  };
}

export interface QrContrastEvaluation {
  minRatio: number;
  bgLuminance: number;
  maxFgLuminance: number;
  inverted: boolean;
  lowContrast: boolean;
}

function colorLuminance(color: string): number {
  const s = color.trim();
  let r: number, g: number, b: number;
  const rgbMatch =
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i
      .exec(s);
  if (rgbMatch) {
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  } else if (/^white$/i.test(s)) {
    [r, g, b] = [255, 255, 255];
  } else if (/^black$/i.test(s)) {
    [r, g, b] = [0, 0, 0];
  } else {
    [r, g, b] = parseColorToRgb(s);
  }
  const lin = (v: number) => {
    const c = Math.max(0, Math.min(255, v)) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Evaluates QR foreground color stops against a background color for physical
 * print & camera scannability:
 * - `inverted`: true when any foreground stop has higher relative luminance
 *   than `bgColor` (light modules on dark ground break many hardware/Android scanners).
 * - `lowContrast`: true when minimum WCAG contrast ratio across stops is < 3.5:1.
 */
export function evaluateQrContrast(
  fgColors: string[],
  bgColor: string,
): QrContrastEvaluation {
  const bgLuminance = colorLuminance(bgColor);
  if (fgColors.length === 0) {
    return {
      minRatio: 1,
      bgLuminance,
      maxFgLuminance: bgLuminance,
      inverted: false,
      lowContrast: true,
    };
  }

  let minRatio = Infinity;
  let maxFgLuminance = 0;
  let inverted = false;

  for (const fg of fgColors) {
    const fgLum = colorLuminance(fg);
    if (fgLum > maxFgLuminance) maxFgLuminance = fgLum;
    if (fgLum > bgLuminance) inverted = true;
    const lighter = Math.max(fgLum, bgLuminance);
    const darker = Math.min(fgLum, bgLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    if (ratio < minRatio) minRatio = ratio;
  }

  return {
    minRatio,
    bgLuminance,
    maxFgLuminance,
    inverted,
    lowContrast: minRatio < 3.5,
  };
}

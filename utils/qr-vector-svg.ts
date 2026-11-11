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
import type {
  CornerSquareShape,
  DotShape,
  Gradient,
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
    return `<linearGradient id="${id}"><stop stop-color="${
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
  const ecl =
    hasMark || options.dotShape === "diamond" || options.dotShape === "dots"
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

  const qr = qrcode(0, ecl);
  qr.addData(payload);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = options.quietZone !== undefined
    ? Math.max(0, options.quietZone)
    : 4;
  const totalModules = moduleCount + quietZone * 2;
  const qrBoxSize = options.size ?? 1000;
  const cellSize = qrBoxSize / totalModules;

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
  const cutout = hasMark ? centerCutout(moduleCount) : null;
  const isCleared = (r: number, c: number) =>
    Boolean(
      cutout && r >= cutout.start && r < cutout.end && c >= cutout.start &&
        c < cutout.end,
    );
  const dark = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < moduleCount && c < moduleCount &&
    !isCleared(r, c) && qr.isDark(r, c);

  // 3 Finder patterns
  pathChunks.push(
    finderPatternPaths(offsetX, offsetY, cellSize, rounded, cornerSquareShape),
    finderPatternPaths(
      offsetX + (moduleCount - 7) * cellSize,
      offsetY,
      cellSize,
      rounded,
      cornerSquareShape,
    ),
    finderPatternPaths(
      offsetX,
      offsetY + (moduleCount - 7) * cellSize,
      cellSize,
      rounded,
      cornerSquareShape,
    ),
  );

  const finderPaths = pathChunks.splice(0).join("");
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

  let frameRect = "";
  let qrBgRect = "";
  let captionElement = "";
  let markElement = "";
  if (cutout) {
    const holeSize = (cutout.end - cutout.start) * cellSize;
    // A tight moat makes the mark read as a centrepiece, not a watermark.
    const moat = Math.min(qrBoxSize * 0.012, holeSize * 0.1);
    const markSize = holeSize - moat * 2;
    const x = offsetX + cutout.start * cellSize + moat;
    const y = offsetY + cutout.start * cellSize + moat;
    const radius = options.centerShape === "circle"
      ? markSize / 2
      : options.centerShape === "knockout"
      ? 0
      : markSize * 0.26;
    // Chunky ring drawn INSIDE the mark so it never spills into the moat.
    // Knockout omits the box but keeps a paper ground for legibility.
    const ring = qrBoxSize * 0.008;
    const inset = ring / 2;
    const badge = options.centerShape === "knockout"
      ? ""
      : `<rect x="${x + inset}" y="${y + inset}" width="${
        markSize - ring
      }" height="${markSize - ring}" rx="${
        Math.max(0, radius - inset)
      }" fill="none" stroke="#1e1714" stroke-width="${ring}"/>`;
    markElement =
      `<rect x="${x}" y="${y}" width="${markSize}" height="${markSize}" rx="${radius}" fill="${
        escapeXml(bg)
      }"/><defs><clipPath id="qrb-mark-clip"><rect x="${x}" y="${y}" width="${markSize}" height="${markSize}" rx="${radius}"/></clipPath></defs><image data-center-mark="true" x="${x}" y="${y}" width="${markSize}" height="${markSize}" preserveAspectRatio="xMidYMid meet" clip-path="url(#qrb-mark-clip)" href="${
        escapeXml(options.logoUrl!)
      }" xlink:href="${escapeXml(options.logoUrl!)}"/>` + badge;
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

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" data-ecl="${ecl}" data-cutout="${
      cutout ? `${cutout.start}:${cutout.end}` : "none"
    }">`,
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
    `  </defs>`,
    frameRect + qrBgRect.replace(/fill="[^"]*"/, 'fill="url(#qrb-bg)"') +
    `  <path d="${finderPaths}" fill="url(#qrb-eyes)" fill-rule="evenodd" />` +
    `  <path d="${
      pathChunks.join("")
    }" fill="url(#qrb-dots)" fill-rule="evenodd" />\n` +
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

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
import { escapeXml, measureCaptionUnicodeFallback } from "./svg-export.ts";

export interface VectorPalette {
  id: string;
  label: string;
  c1: string;
  c2: string;
  bg: string;
}

/**
 * Luminance-locked pastel-punk palettes matching `utils/qr-styles.ts`
 * (every dot stop <= 0.40 relative luminance, >= 2:1 contrast against warm paper).
 */
export const VECTOR_PALETTES: Record<string, VectorPalette> = {
  sunset: {
    id: "sunset",
    label: "Sunset",
    c1: "#C9184A",
    c2: "#5A189A",
    bg: "#FFF8F6",
  },
  candy: {
    id: "candy",
    label: "Candy",
    c1: "#B5179E",
    c2: "#3F37C9",
    bg: "#FDF7FF",
  },
  blush: {
    id: "blush",
    label: "Blush",
    c1: "#800F2F",
    c2: "#C9184A",
    bg: "#FFF7F9",
  },
  matcha: {
    id: "matcha",
    label: "Matcha",
    c1: "#1B4332",
    c2: "#0F6E56",
    bg: "#F6FBF7",
  },
  pool: {
    id: "pool",
    label: "Pool",
    c1: "#0B4F6C",
    c2: "#1D3557",
    bg: "#F5FAFE",
  },
  vapor: {
    id: "vapor",
    label: "Vapor",
    c1: "#7209B7",
    c2: "#006466",
    bg: "#F8F6FF",
  },
  grape: {
    id: "grape",
    label: "Grape",
    c1: "#3C096C",
    c2: "#7B2CBF",
    bg: "#FBF7FF",
  },
  licorice: {
    id: "licorice",
    label: "Licorice",
    c1: "#1E1714",
    c2: "#1E1714",
    bg: "#FFFEF7",
  },
};

export interface BuildQrSvgOptions {
  data: string;
  palette?: keyof typeof VECTOR_PALETTES;
  c1?: string;
  c2?: string;
  bg?: string;
  caption?: string;
  size?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  rounded?: boolean;
}

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

function finderPatternPaths(
  originX: number,
  originY: number,
  cellSize: number,
  rounded: boolean,
): string {
  const outerSize = cellSize * 7;
  const innerCutX = originX + cellSize;
  const innerCutY = originY + cellSize;
  const innerCutSize = cellSize * 5;
  const dotX = originX + cellSize * 2;
  const dotY = originY + cellSize * 2;
  const dotSize = cellSize * 3;

  const outerR = rounded ? cellSize * 1.6 : 0;
  const innerR = rounded ? cellSize * 1.1 : 0;
  const dotR = rounded ? cellSize * 0.85 : 0;

  return [
    roundedRectPath(originX, originY, outerSize, outerSize, outerR),
    roundedRectPath(innerCutX, innerCutY, innerCutSize, innerCutSize, innerR),
    roundedRectPath(dotX, dotY, dotSize, dotSize, dotR),
  ].join("");
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
  const ecl = options.errorCorrectionLevel ?? "Q";
  const rounded = options.rounded !== false;

  const qr = qrcode(0, ecl);
  qr.addData(payload);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
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

  // 3 Finder patterns
  pathChunks.push(
    finderPatternPaths(offsetX, offsetY, cellSize, rounded),
    finderPatternPaths(
      offsetX + (moduleCount - 7) * cellSize,
      offsetY,
      cellSize,
      rounded,
    ),
    finderPatternPaths(
      offsetX,
      offsetY + (moduleCount - 7) * cellSize,
      cellSize,
      rounded,
    ),
  );

  // Data modules
  const dotRadius = rounded ? cellSize * 0.34 : 0;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderModule(r, c, moduleCount)) continue;
      if (!qr.isDark(r, c)) continue;
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      pathChunks.push(roundedRectPath(x, y, cellSize, cellSize, dotRadius));
    }
  }

  let frameRect = "";
  let qrBgRect = "";
  let captionElement = "";

  if (hasCaption) {
    const cardX = border / 2;
    const cardY = border / 2;
    const cardW = totalWidth - border;
    const cardH = totalHeight - border;
    frameRect =
      `  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="56" ry="56" fill="#FFFEF7" stroke="#1E1714" stroke-width="${border}" />\n`;
    qrBgRect =
      `  <rect x="${pad}" y="${pad}" width="${qrBoxSize}" height="${qrBoxSize}" rx="28" ry="28" fill="${
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
      `  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" rx="36" ry="36" fill="${
        escapeXml(bg)
      }" />\n`;
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`,
    `  <defs>`,
    `    <linearGradient id="qrb-grad" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0%" stop-color="${escapeXml(c1)}" />`,
    `      <stop offset="100%" stop-color="${escapeXml(c2)}" />`,
    `    </linearGradient>`,
    `  </defs>`,
    frameRect + qrBgRect +
    `  <path d="${
      pathChunks.join("")
    }" fill="url(#qrb-grad)" fill-rule="evenodd" />\n` +
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
  if (/<image\b/i.test(svgMarkup)) {
    errors.push("SVG contains external <image> element.");
  }

  return {
    valid: errors.length === 0,
    byteLength,
    errors,
  };
}

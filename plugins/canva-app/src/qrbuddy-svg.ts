/**
 * Self-contained Pure-TS Gradient Vector SVG 1.1 Builder for Canva Apps SDK v2.
 * Mirrors `utils/qr-vector-svg.ts` from the main QRBuddy repo.
 */
import qrcode from "qrcode-generator";

export interface CanvaPalette {
  id: string;
  label: string;
  c1: string;
  c2: string;
  bg: string;
}

export const CANVA_PALETTES: CanvaPalette[] = [
  { id: "sunset", label: "Sunset", c1: "#C9184A", c2: "#5A189A", bg: "#FFF8F6" },
  { id: "candy", label: "Candy", c1: "#B5179E", c2: "#3F37C9", bg: "#FDF7FF" },
  { id: "blush", label: "Blush", c1: "#800F2F", c2: "#C9184A", bg: "#FFF7F9" },
  { id: "matcha", label: "Matcha", c1: "#1B4332", c2: "#0F6E56", bg: "#F6FBF7" },
  { id: "pool", label: "Pool", c1: "#0B4F6C", c2: "#1D3557", bg: "#F5FAFE" },
  { id: "vapor", label: "Vapor", c1: "#7209B7", c2: "#006466", bg: "#F8F6FF" },
  { id: "grape", label: "Grape", c1: "#3C096C", c2: "#7B2CBF", bg: "#FBF7FF" },
  { id: "licorice", label: "Ink", c1: "#1E1714", c2: "#1E1714", bg: "#FFFEF7" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isFinderModule(row: number, col: number, count: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= count - 7) ||
    (row >= count - 7 && col < 7)
  );
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0) return `M${x},${y}h${w}v${h}h-${w}Z`;
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
    `A${rx},${rx} 0 0 1 ${Number(x.toFixed(2))},${Number((y2 - rad).toFixed(2))}`,
    `V${Number((y + rad).toFixed(2))}`,
    `A${rx},${rx} 0 0 1 ${sx},${sy}`,
    "Z",
  ].join("");
}

function finderPatternPaths(
  originX: number,
  originY: number,
  cellSize: number,
): string {
  return [
    roundedRectPath(originX, originY, cellSize * 7, cellSize * 7, cellSize * 1.6),
    roundedRectPath(
      originX + cellSize,
      originY + cellSize,
      cellSize * 5,
      cellSize * 5,
      cellSize * 1.1,
    ),
    roundedRectPath(
      originX + cellSize * 2,
      originY + cellSize * 2,
      cellSize * 3,
      cellSize * 3,
      cellSize * 0.85,
    ),
  ].join("");
}

export function buildQrSvgString(opts: {
  data: string;
  c1: string;
  c2: string;
  bg?: string;
  caption?: string;
}): { svg: string; width: number; height: number } {
  const qr = qrcode(0, "Q");
  qr.addData((opts.data || "https://qrbuddy.app").trim());
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const qrBoxSize = 1000;
  const cellSize = qrBoxSize / totalModules;

  const captionText = (opts.caption || "").trim().toUpperCase();
  const hasCaption = captionText.length > 0;
  const pad = hasCaption ? 64 : 0;
  const border = hasCaption ? 20 : 0;
  const capH = hasCaption ? 170 : 0;
  const totalWidth = qrBoxSize + pad * 2;
  const totalHeight = qrBoxSize + pad * 2 + capH;

  const offsetX = pad + quietZone * cellSize;
  const offsetY = pad + quietZone * cellSize;

  const pathChunks: string[] = [
    finderPatternPaths(offsetX, offsetY, cellSize),
    finderPatternPaths(offsetX + (moduleCount - 7) * cellSize, offsetY, cellSize),
    finderPatternPaths(offsetX, offsetY + (moduleCount - 7) * cellSize, cellSize),
  ];

  const dotRadius = cellSize * 0.34;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderModule(r, c, moduleCount) || !qr.isDark(r, c)) continue;
      pathChunks.push(
        roundedRectPath(
          offsetX + c * cellSize,
          offsetY + r * cellSize,
          cellSize,
          cellSize,
          dotRadius,
        ),
      );
    }
  }

  const bg = opts.bg || "#FFFEF7";
  const frameMarkup = hasCaption
    ? `  <rect x="${border / 2}" y="${border / 2}" width="${totalWidth - border}" height="${totalHeight - border}" rx="56" ry="56" fill="#FFFEF7" stroke="#1E1714" stroke-width="${border}" />\n  <rect x="${pad}" y="${pad}" width="${qrBoxSize}" height="${qrBoxSize}" rx="28" ry="28" fill="${escapeXml(bg)}" />\n`
    : `  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" rx="36" ry="36" fill="${escapeXml(bg)}" />\n`;

  const captionMarkup = hasCaption
    ? `  <text x="${totalWidth / 2}" y="${qrBoxSize + pad + capH / 2 + 12}" fill="#1E1714" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="84" text-anchor="middle" dominant-baseline="central">${escapeXml(captionText.slice(0, 18))}</text>\n`
    : "";

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`,
    `  <defs>`,
    `    <linearGradient id="qrb-grad" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `      <stop offset="0%" stop-color="${escapeXml(opts.c1)}" />`,
    `      <stop offset="100%" stop-color="${escapeXml(opts.c2)}" />`,
    `    </linearGradient>`,
    `  </defs>`,
    frameMarkup +
      `  <path d="${pathChunks.join("")}" fill="url(#qrb-grad)" fill-rule="evenodd" />\n` +
      captionMarkup +
      `</svg>`,
  ].join("\n");

  return {
    svg,
    width: hasCaption ? 500 : 500,
    height: hasCaption ? 575 : 500,
  };
}

export function toSvgDataUrl(svgMarkup: string): string {
  const bytes = new TextEncoder().encode(svgMarkup);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

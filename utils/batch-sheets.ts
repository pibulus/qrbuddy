// Pure batch helpers: sequence + CSV parsing, styled vector SVGs, print-ready
// sticker sheets and the editable-batch manifest. No DOM, no components, so the
// Bulk view in CreateModal and the tests share one source.

import { expandSequenceExpressions } from "../hooks/useBatchGenerator.ts";
import { addDynamicToHistory } from "./history.ts";
import { resolveQRStyle } from "./qr-design.ts";
import { buildQrSvgString, toSvgDataUrl } from "./qr-vector-svg.ts";
import { saveOwnerToken } from "./token-vault.ts";
import type { Locale } from "./i18n.ts";
import type { QRStyle } from "../types/qr-types.ts";

export { expandSequenceExpressions };

export interface BatchRow {
  index: number;
  label: string;
  destination: string;
}

export interface BatchResult extends BatchRow {
  status: "created" | "failed";
  shortCode?: string;
  redirectUrl?: string;
  editUrl?: string;
  error?: string;
}

export interface CreateQrResponse {
  success: boolean;
  short_code: string;
  redirect_url: string;
  edit_url: string;
  owner_token: string;
}

export type BatchPaletteKey = string;
export type StickerPaperSize = "A4" | "Letter";
export type StickerGridSize = "3x4" | "4x6";
export interface StickerSheetItem {
  data: string;
  caption: string;
  sublabel?: string;
}

const MAX_ROWS = 200;
const URL_HEADERS = ["url", "destination", "link", "destination_url", "target"];
const TITLE_HEADERS = ["title", "label", "name", "caption", "sku", "item"];

/** Split one CSV line, honouring double quotes. Good enough for spreadsheets. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Parse a pasted spreadsheet or `{1..N}` sequence list. A header row is
 * detected by name; without one, column 1 is the destination and column 2 the
 * label (and `Label | https://...` pipe rows are also accepted).
 */
export function parseBatchCsv(
  text: string,
): { rows: BatchRow[]; skipped: number; error?: string } {
  const expanded = expandSequenceExpressions(text, MAX_ROWS);
  const lines = expanded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { rows: [], skipped: 0, error: "Nothing to import yet." };
  }

  let urlIndex = 0;
  let titleIndex = 1;
  let startAt = 0;

  const first = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = first.some((cell) => URL_HEADERS.includes(cell));
  if (hasHeader) {
    const urlColumn = first.findIndex((cell) => URL_HEADERS.includes(cell));
    const titleColumn = first.findIndex((cell) => TITLE_HEADERS.includes(cell));
    urlIndex = urlColumn >= 0 ? urlColumn : 0;
    titleIndex = titleColumn >= 0 ? titleColumn : -1;
    startAt = 1;
  }

  const rows: BatchRow[] = [];
  let skipped = 0;

  for (let i = startAt; i < lines.length; i++) {
    const line = lines[i];
    if (!hasHeader && line.includes("|")) {
      const pipeIdx = line.indexOf("|");
      const left = line.slice(0, pipeIdx).trim();
      const right = line.slice(pipeIdx + 1).trim();
      if (isHttpUrl(right)) {
        rows.push({ index: rows.length + 1, label: left, destination: right });
        continue;
      }
      if (isHttpUrl(left)) {
        rows.push({ index: rows.length + 1, label: right, destination: left });
        continue;
      }
    }

    const cells = splitCsvLine(line);
    const destination = cells[urlIndex] ?? "";
    if (!isHttpUrl(destination)) {
      skipped++;
      continue;
    }
    const label = titleIndex >= 0 ? cells[titleIndex] ?? "" : "";
    rows.push({ index: rows.length + 1, label, destination });
  }

  if (!rows.length) {
    return {
      rows: [],
      skipped,
      error:
        "No usable rows. Each row needs an http(s) destination in the url column.",
    };
  }
  return { rows, skipped };
}

/** Renders a styled vector SVG using real `QR_STYLES` geometry + gradients via `resolveQRStyle`. */
export function buildStyledBatchQrSvg(
  data: string,
  paletteKey: BatchPaletteKey = "noir",
  options?: { size?: number; caption?: string; style?: QRStyle },
): string {
  const s = options?.style ?? resolveQRStyle(paletteKey);
  return buildQrSvgString({
    data,
    size: options?.size ?? 1024,
    errorCorrectionLevel: "Q",
    caption: options?.caption || undefined,
    c1: s.dots.color ?? s.dots.gradient?.colorStops[0]?.color,
    c2: s.dots.color ?? s.dots.gradient?.colorStops.at(-1)?.color,
    bg: s.background.color ?? s.background.gradient?.colorStops[0]?.color,
    dotsGradient: s.dots.gradient,
    backgroundGradient: s.background.gradient,
    eyeGradient: s.cornersSquare?.gradient ?? s.dots.gradient,
    eyeColor: s.cornersSquare?.color ?? s.dots.color,
    dotShape: s.dots.shape,
    cornerSquareShape: s.cornersSquare?.shape,
    centerShape: s.centerShape,
    renderMode: s.renderMode,
    artSample: s.artSample,
    halftoneTone: s.halftoneTone,
    halftoneShape: s.halftoneShape,
    halftoneDetail: s.halftoneDetail,
    foilDepth: s.foilDepth,
    print: s.print,
    risoInk: s.risoInk,
    risoStock: s.risoStock,
    risoRegister: s.risoRegister,
  });
}

export function compactUrlSublabel(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "");
    const tail = `${u.pathname === "/" ? "" : u.pathname}${u.search}`;
    const combined = `${host}${tail}`;
    return combined.length > 28 ? `${combined.slice(0, 27)}…` : combined;
  } catch {
    return "";
  }
}

/** Builds a standalone print-ready HTML sticker sheet (`A4` or `Letter`, `3×4` or `4×6`). */
export function buildBatchStickerSheetHtml({
  items,
  palette = "noir",
  paperSize = "A4",
  grid = "3x4",
  style,
  lang = "en",
}: {
  items: StickerSheetItem[];
  palette?: BatchPaletteKey;
  /** Resolved studio style; wins over `palette` when given. */
  style?: QRStyle;
  lang?: Locale;
  paperSize?: StickerPaperSize;
  grid?: StickerGridSize;
}): string {
  const cols = grid === "4x6" ? 4 : 3;
  const rowsPerPage = grid === "4x6" ? 6 : 4;
  const perPage = cols * rowsPerPage;
  const pages: string[] = [];

  for (let offset = 0; offset < items.length; offset += perPage) {
    const slice = items.slice(offset, offset + perPage);
    const cells = slice
      .map((item) => {
        const svg = buildStyledBatchQrSvg(item.data, palette, {
          size: 480,
          style,
        });
        const sub = item.sublabel?.trim() ?? "";
        return `<figure class="cell">
          <img src="${toSvgDataUrl(svg)}" alt="" />
          <figcaption>
            <strong>${escapeHtml(item.caption)}</strong>
            ${sub ? `<span>${escapeHtml(sub)}</span>` : ""}
          </figcaption>
        </figure>`;
      })
      .join("");
    pages.push(`<section class="sheet-page">${cells}</section>`);
  }

  const pageSpec = paperSize === "Letter" ? "letter portrait" : "A4 portrait";
  const gapMm = grid === "4x6" ? "3.2mm" : "4.8mm";
  const padMm = grid === "4x6" ? "2.4mm" : "3.6mm";
  const radiusMm = grid === "4x6" ? "3.2mm" : "4.8mm";
  const qrMaxMm = grid === "4x6" ? "27mm" : "42mm";
  const titlePx = grid === "4x6" ? "9.5px" : "11px";
  const subPx = grid === "4x6" ? "8px" : "9px";

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
    <title>${
    lang === "es" ? "Hoja de etiquetas QRBuddy" : "QRBuddy sticker sheet"
  } (${paperSize} · ${grid.replace("x", "×")})</title>
    <style>
      @page { size: ${pageSpec}; margin: 10mm; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #fffef7;
        color: #1e1714;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sheet-page {
        display: grid;
        grid-template-columns: repeat(${cols}, minmax(0, 1fr));
        gap: ${gapMm};
        page-break-after: always;
        break-after: page;
      }
      .sheet-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .cell {
        margin: 0;
        background: #fffef7;
        border: 1.5px dashed #3d332d;
        border-radius: ${radiusMm};
        padding: ${padMm};
        text-align: center;
        break-inside: avoid;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      }
      .cell img {
        width: 100%;
        max-width: ${qrMaxMm};
        max-height: ${qrMaxMm};
        height: auto;
        display: block;
      }
      figcaption {
        display: grid;
        gap: 1.5px;
        margin-top: 2.2mm;
        width: 100%;
      }
      figcaption strong {
        font-size: ${titlePx};
        font-weight: 800;
        color: #1e1714;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      figcaption span {
        font-size: ${subPx};
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #574c44;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media screen {
        body { padding: 8mm; background: #fbf1e4; }
        .sheet-page {
          max-width: ${paperSize === "Letter" ? "215.9mm" : "210mm"};
          margin: 0 auto 8mm;
          padding: 10mm;
          background: #fffef7;
          border: 2px solid #1e1714;
          border-radius: 4mm;
        }
      }
      @media print {
        body { padding: 0; background: #fffef7; }
        .sheet-page { margin: 0; padding: 0; border: 0; max-width: none; }
      }
    </style></head><body>${pages.join("")}</body></html>`;
}

export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Build the backup manifest.csv bundled inside dynamic batch ZIP exports. */
export function buildDynamicBatchManifestCsv(rows: BatchResult[]): string {
  const header = "label,destination,short_url,edit_url";
  const body = rows
    .filter((row) => row.status === "created")
    .map((row) =>
      [
        csvCell(row.label),
        csvCell(row.destination),
        csvCell(row.redirectUrl ?? ""),
        csvCell(row.editUrl ?? ""),
      ].join(",")
    );
  return [header, ...body].join("\n");
}

/** Immediately vault owner_token and record local Time Machine history per minted row. */
export async function persistMintedBatchRow(
  row: Pick<BatchRow, "label" | "destination">,
  created: Pick<
    CreateQrResponse,
    "short_code" | "redirect_url" | "edit_url" | "owner_token"
  >,
  storageOverride?: Storage,
): Promise<{ vaulted: boolean; historySaved: boolean }> {
  const vaulted = await saveOwnerToken(
    "qr",
    created.short_code,
    created.owner_token,
  );
  const historySaved = addDynamicToHistory(
    {
      url: row.destination,
      redirectUrl: created.redirect_url,
      isDynamic: true,
      shortCode: created.short_code,
      editUrl: created.edit_url,
      label: row.label,
      ...(vaulted ? { ownerScope: "qr" } : {}),
    },
    storageOverride,
  );
  return { vaulted, historySaved };
}
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

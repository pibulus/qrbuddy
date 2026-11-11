// ═══════════════════════════════════════════════════════════════════════════
// BatchStudio — a spreadsheet or sequence in, styled print-ready sheets out
// ═══════════════════════════════════════════════════════════════════════════
// Paste or drop a CSV (or `{1..N}` sequence runs), pick a print-verified
// palette and A4/Letter sticker grid, and export either editable codes or
// standalone vector SVGs + printable sticker sheets.
//
// Deliberately sequential when minting editable codes: one row at a time, so a
// quota or network stop leaves every previously minted row vaulted locally.

import { useEffect, useState } from "preact/hooks";
import { expandSequenceExpressions } from "../hooks/useBatchGenerator.ts";
import { apiRequest } from "../utils/api-request.ts";
import { getApiUrl } from "../utils/api.ts";
import { isPlusLibraryEnabled } from "../utils/auth.ts";
import { addDynamicToHistory } from "../utils/history.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { buildQrSvgString, toSvgDataUrl } from "../utils/qr-vector-svg.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";

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

export type BatchPaletteKey =
  | "noir"
  | "sunset"
  | "pool"
  | "matcha"
  | "blush"
  | "vapor";

export type StickerPaperSize = "A4" | "Letter";
export type StickerGridSize = "3x4" | "4x6";

export interface StickerSheetItem {
  data: string;
  caption: string;
  sublabel?: string;
}

export const BATCH_PALETTES: ReadonlyArray<{
  key: BatchPaletteKey;
  label: string;
  swatch: readonly string[];
}> = [
  {
    key: "noir",
    label: "Classic Ink",
    swatch: QR_STYLES.noir.dots.gradient.colorStops.map((s) => s.color),
  },
  {
    key: "sunset",
    label: "Sunset",
    swatch: QR_STYLES.sunset.dots.gradient.colorStops.map((s) => s.color),
  },
  {
    key: "pool",
    label: "Pool",
    swatch: QR_STYLES.pool.dots.gradient.colorStops.map((s) => s.color),
  },
  {
    key: "matcha",
    label: "Forest",
    swatch: QR_STYLES.matcha.dots.gradient.colorStops.map((s) => s.color),
  },
  {
    key: "blush",
    label: "Berry",
    swatch: QR_STYLES.blush.dots.gradient.colorStops.map((s) => s.color),
  },
  {
    key: "vapor",
    label: "Vapor",
    swatch: QR_STYLES.vapor.dots.gradient.colorStops.map((s) => s.color),
  },
];

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
  options?: { size?: number; caption?: string },
): string {
  const s = resolveQRStyle(paletteKey);
  return buildQrSvgString({
    data,
    size: options?.size ?? 1024,
    errorCorrectionLevel: "M",
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
  });
}

function compactUrlSublabel(rawUrl: string): string {
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
}: {
  items: StickerSheetItem[];
  palette?: BatchPaletteKey;
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
        const svg = buildStyledBatchQrSvg(item.data, palette, { size: 480 });
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

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>QRBuddy sticker sheet (${paperSize} · ${
    grid.replace("x", "×")
  })</title>
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

function downloadText(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
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

export default function BatchStudio(
  { supabaseUrl }: { supabaseUrl?: string },
) {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"editable" | "images">("editable");
  const [palette, setPalette] = useState<BatchPaletteKey>("noir");
  const [paperSize, setPaperSize] = useState<StickerPaperSize>("A4");
  const [sheetGrid, setSheetGrid] = useState<StickerGridSize>("3x4");
  const [zipping, setZipping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [hasMintedDynamic, setHasMintedDynamic] = useState(false);
  const [hasExportedBackup, setHasExportedBackup] = useState(false);
  const [error, setError] = useState("");

  const parsed = raw.trim() ? parseBatchCsv(raw) : { rows: [], skipped: 0 };
  const rows = parsed.rows.slice(0, MAX_ROWS);
  const created = results.filter((result) => result.status === "created");
  const shouldGuardUnload = isGenerating ||
    ((hasMintedDynamic || created.length > 0) && !hasExportedBackup);

  useEffect(() => {
    if (!shouldGuardUnload) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldGuardUnload]);

  async function handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setRaw(await file.text());
    setResults([]);
    setDone(0);
    setError("");
  }

  function insertSequenceExample() {
    const sample =
      "url,title\nhttps://venue.example/table/{01..12},Table {01..12}";
    setRaw(raw.trim() ? `${raw.trim()}\n${sample.split("\n")[1]}` : sample);
    setResults([]);
    setDone(0);
    setError("");
  }

  async function run() {
    if (!rows.length || isGenerating) return;
    if (!supabaseUrl) {
      setError("This build has no backend configured.");
      return;
    }

    setIsGenerating(true);
    setHasExportedBackup(false);
    setError("");
    setResults([]);
    setDone(0);

    const collected: BatchResult[] = [];
    const apiUrl = getApiUrl();

    for (const row of rows) {
      try {
        const createdItem = await apiRequest<CreateQrResponse>(
          `${apiUrl}/create-dynamic-qr`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination_url: row.destination,
              title: row.label || null,
            }),
            useUserAuth: isPlusLibraryEnabled(),
          },
          `Row ${row.index} failed`,
        );
        await persistMintedBatchRow(row, createdItem);
        setHasMintedDynamic(true);
        collected.push({
          ...row,
          status: "created",
          shortCode: createdItem.short_code,
          redirectUrl: createdItem.redirect_url,
          editUrl: createdItem.edit_url,
        });
      } catch (caught) {
        collected.push({
          ...row,
          status: "failed",
          error: caught instanceof Error ? caught.message : "Failed",
        });
      }
      setDone(collected.length);
      setResults([...collected]);
    }

    setIsGenerating(false);
  }

  /** Static mode: destination encoded directly into styled vector SVGs + manifest.csv. */
  async function downloadStaticZip() {
    if (!rows.length || zipping) return;
    setZipping(true);
    setError("");
    try {
      const { default: JSZip } = (await import("jszip")) as unknown as {
        default: new () => {
          file: (name: string, data: Blob | string) => void;
          generateAsync: (opts: { type: "blob" }) => Promise<Blob>;
        };
      };
      const zip = new JSZip();
      const manifest = ["row,label,destination,file"];

      for (const row of rows) {
        const svg = buildStyledBatchQrSvg(row.destination, palette, {
          size: 1024,
          caption: row.label || undefined,
        });
        const base = `qr-${String(row.index).padStart(3, "0")}`;
        zip.file(`${base}.svg`, new Blob([svg], { type: "image/svg+xml" }));
        manifest.push(
          [
            row.index,
            csvCell(row.label),
            csvCell(row.destination),
            `${base}.svg`,
          ]
            .join(","),
        );
      }

      zip.file("manifest.csv", manifest.join("\n"));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrbuddy-static-${palette}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not build the ZIP",
      );
    } finally {
      setZipping(false);
    }
  }

  /** Dynamic ZIP export: styled SVG vector files for every minted code + manifest.csv backup. */
  async function downloadDynamicZip() {
    if (!created.length || zipping) return;
    setZipping(true);
    setError("");
    try {
      const { default: JSZip } = (await import("jszip")) as unknown as {
        default: new () => {
          file: (name: string, data: Blob | string) => void;
          generateAsync: (opts: { type: "blob" }) => Promise<Blob>;
        };
      };
      const zip = new JSZip();

      for (const row of created) {
        const svg = buildStyledBatchQrSvg(row.redirectUrl ?? "", palette, {
          size: 1024,
          caption: row.label || undefined,
        });
        const suffix = row.shortCode ? `-${row.shortCode}` : "";
        const base = `qr-${String(row.index).padStart(3, "0")}${suffix}`;
        zip.file(`${base}.svg`, new Blob([svg], { type: "image/svg+xml" }));
      }

      zip.file("manifest.csv", buildDynamicBatchManifestCsv(created));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrbuddy-editable-${palette}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setHasExportedBackup(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not build the ZIP",
      );
    } finally {
      setZipping(false);
    }
  }

  function exportCsv() {
    const header =
      "row,label,destination,short_code,redirect_url,edit_url,status";
    const body = results
      .map((row) =>
        [
          row.index,
          csvCell(row.label),
          csvCell(row.destination),
          row.shortCode ?? "",
          row.redirectUrl ?? "",
          csvCell(row.editUrl ?? ""),
          row.status,
        ].join(",")
      )
      .join("\n");
    downloadText(
      "qrbuddy-codes.csv",
      "text/csv;charset=utf-8",
      `${header}\n${body}`,
    );
    setHasExportedBackup(true);
  }

  function openStickerPrintWindow(items: StickerSheetItem[]) {
    if (!items.length) return;
    const sheet = buildBatchStickerSheetHtml({
      items,
      palette,
      paperSize,
      grid: sheetGrid,
    });

    // deno-lint-ignore no-explicit-any
    const win = (globalThis as any).open("", "_blank") as Window | null;
    if (!win) {
      setError("Pop-up blocked — allow pop-ups to open the sticker sheet.");
      return;
    }
    win.document.write(sheet);
    win.document.close();
    win.focus();
    win.print();
  }

  function printDynamicSheet() {
    if (!created.length) return;
    openStickerPrintWindow(
      created.map((row) => ({
        data: row.redirectUrl ?? "",
        caption: row.label || row.shortCode || `QR ${row.index}`,
        sublabel: row.label ? (row.shortCode ?? "") : "",
      })),
    );
  }

  function printStaticSheet() {
    if (!rows.length) return;
    openStickerPrintWindow(
      rows.map((row) => ({
        data: row.destination,
        caption: row.label || `QR ${row.index}`,
        sublabel: compactUrlSublabel(row.destination),
      })),
    );
  }

  return (
    <main class="mx-auto max-w-3xl px-4 py-10 text-stone-900">
      <header class="mb-6">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
          Batch
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">
          A spreadsheet in. A sheet of codes out.
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          One row, one code. Every sticker prints with its label, and the CSV
          stays local.
        </p>
      </header>

      <section class="rounded-3xl border-2 border-stone-900 bg-[#fffef7] p-5 shadow-[4px_4px_0_#1e1714]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label
            for="batch-csv-input"
            class="block text-xs font-black uppercase tracking-wider text-stone-500"
          >
            Paste CSV or {"{1..N}"} sequence, or drop a file
          </label>
          <button
            type="button"
            onClick={insertSequenceExample}
            class="rounded-lg border-[1.5px] border-[#1e1714]/30 bg-[#fbf1e4] px-2.5 py-1 text-[11px] font-black text-[#1e1714] transition hover:border-[#1e1714]"
          >
            Insert {"{1..12}"} example
          </button>
        </div>

        <textarea
          id="batch-csv-input"
          value={raw}
          onInput={(event) => {
            setRaw((event.target as HTMLTextAreaElement).value);
            setResults([]);
            setError("");
          }}
          rows={6}
          spellcheck={false}
          placeholder={`url,title\nhttps://venue.example/table/{01..12},Table {01..12}\nhttps://venue.example/vip-menu,VIP Lounge`}
          class="mt-2 w-full resize-y rounded-2xl border-2 border-stone-300 bg-white p-3 font-mono text-xs focus:border-stone-900 focus:outline-none"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFile}
            class="text-xs"
          />
          <span class="text-xs font-bold text-stone-600 tabular-nums">
            {rows.length} row{rows.length === 1 ? "" : "s"} ready
            {parsed.skipped ? ` · ${parsed.skipped} skipped` : ""}
            {parsed.rows.length > MAX_ROWS ? ` · first ${MAX_ROWS} only` : ""}
          </span>
        </div>

        {(parsed.error || error) && (
          <p
            role="alert"
            class="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900"
          >
            {parsed.error || error}
          </p>
        )}

        {/* Palette Preset Row */}
        <div class="mt-5">
          <span class="block text-[11px] font-black uppercase tracking-wider text-stone-500">
            Palette
          </span>
          <div
            class="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6"
            role="group"
            aria-label="QR palette"
          >
            {BATCH_PALETTES.map((preset) => {
              const active = palette === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPalette(preset.key)}
                  class={`min-h-[44px] rounded-xl border-2 px-2 py-1.5 flex items-center justify-center gap-1.5 text-xs font-black transition ${
                    active
                      ? "border-[#1e1714] bg-amber-200 text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                      : "border-stone-900/20 bg-white text-stone-800 hover:border-stone-900"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    class="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-[#1e1714]"
                    style={{
                      background: `linear-gradient(135deg, ${
                        preset.swatch.join(", ")
                      })`,
                    }}
                  />
                  <span class="truncate">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Printable Sticker Sheet Layout (Paper + Grid) */}
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-stone-900/15 bg-[#fbf1e4] px-3.5 py-2.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-stone-600">
            Sticker sheet
          </span>
          <div class="flex flex-wrap items-center gap-2">
            <div
              class="inline-flex rounded-xl border-2 border-[#1e1714] bg-white p-0.5"
              role="group"
              aria-label="Paper size"
            >
              {(["A4", "Letter"] as const).map((sizeOpt) => (
                <button
                  key={sizeOpt}
                  type="button"
                  aria-pressed={paperSize === sizeOpt}
                  onClick={() => setPaperSize(sizeOpt)}
                  class={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                    paperSize === sizeOpt
                      ? "bg-[#1e1714] text-[#fffef7]"
                      : "text-[#1e1714] hover:bg-stone-100"
                  }`}
                >
                  {sizeOpt}
                </button>
              ))}
            </div>
            <div
              class="inline-flex rounded-xl border-2 border-[#1e1714] bg-white p-0.5"
              role="group"
              aria-label="Sticker grid"
            >
              {([
                ["3x4", "3×4 (12/pg)"],
                ["4x6", "4×6 (24/pg)"],
              ] as const).map(([gridKey, gridLabel]) => (
                <button
                  key={gridKey}
                  type="button"
                  aria-pressed={sheetGrid === gridKey}
                  onClick={() => setSheetGrid(gridKey)}
                  class={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                    sheetGrid === gridKey
                      ? "bg-[#1e1714] text-[#fffef7]"
                      : "text-[#1e1714] hover:bg-stone-100"
                  }`}
                >
                  {gridLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Mode Switch */}
        <div
          class="mt-4 grid grid-cols-2 gap-2"
          role="group"
          aria-label="Batch mode"
        >
          {([
            ["editable", "Editable codes"],
            ["images", "Image files"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              class={`min-h-[44px] rounded-xl border-2 border-stone-900 px-3 py-2 text-xs font-black transition ${
                mode === value
                  ? "bg-stone-900 text-amber-100"
                  : "bg-white hover:bg-stone-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p class="mt-2 text-[11px] leading-snug text-stone-500">
          {mode === "editable"
            ? "Editable: every row mints a re-pointable short link with scan stats. Needs a connection."
            : "Image files: destination encoded directly inside the vector graphic. Zero tracking, works offline forever."}
        </p>

        {mode === "editable"
          ? (
            <button
              type="button"
              onClick={run}
              disabled={isGenerating || !rows.length}
              class="mt-4 w-full min-h-[48px] rounded-2xl border-2 border-stone-900 bg-pink-400 px-4 py-3 text-sm font-black shadow-[3px_3px_0_#1e1714] transition active:translate-y-[2px] active:shadow-[1px_1px_0_#1e1714] disabled:opacity-40"
            >
              {isGenerating
                ? `Creating ${done} / ${rows.length}…`
                : `Create ${rows.length || ""} code${
                  rows.length === 1 ? "" : "s"
                }`}
            </button>
          )
          : (
            <div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={downloadStaticZip}
                disabled={zipping || !rows.length}
                class="min-h-[48px] rounded-2xl border-2 border-stone-900 bg-yellow-300 px-4 py-3 text-sm font-black shadow-[3px_3px_0_#1e1714] transition active:translate-y-[2px] active:shadow-[1px_1px_0_#1e1714] disabled:opacity-40"
              >
                {zipping
                  ? "Building the ZIP…"
                  : `Download ${rows.length || ""} SVG files`}
              </button>
              <button
                type="button"
                onClick={printStaticSheet}
                disabled={!rows.length}
                class="min-h-[48px] rounded-2xl border-2 border-stone-900 bg-white px-4 py-3 text-sm font-black shadow-[3px_3px_0_#1e1714] transition hover:bg-amber-50 active:translate-y-[2px] active:shadow-[1px_1px_0_#1e1714] disabled:opacity-40"
              >
                Print sticker sheet ({paperSize} ·{" "}
                {sheetGrid.replace("x", "×")})
              </button>
            </div>
          )}
      </section>

      {results.length > 0 && (
        <section class="mt-6 rounded-3xl border-2 border-stone-900 bg-[#fffef7] p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm font-black">
              {created.length} created
              {results.length - created.length
                ? ` · ${results.length - created.length} failed`
                : ""}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                class="min-h-[40px] rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={downloadDynamicZip}
                disabled={!created.length || zipping}
                class="min-h-[40px] rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                {zipping ? "Building ZIP…" : "Download ZIP"}
              </button>
              <button
                type="button"
                onClick={printDynamicSheet}
                disabled={!created.length}
                class="min-h-[40px] rounded-xl border-2 border-stone-900 bg-yellow-300 px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                Print sticker sheet ({paperSize} ·{" "}
                {sheetGrid.replace("x", "×")})
              </button>
            </div>
          </div>

          {created.length > 0 && (
            <p
              role="status"
              class="mt-3 rounded-2xl border-2 border-stone-900/15 bg-amber-50 px-3.5 py-2 text-xs font-bold text-stone-800"
            >
              Edit keys vaulted locally · Manifest included in ZIP &amp; CSV
            </p>
          )}

          <ul class="mt-4 divide-y divide-stone-200 text-xs">
            {results.map((row) => (
              <li key={row.index} class="flex items-center gap-3 py-2">
                <span class="w-6 shrink-0 text-stone-400">{row.index}</span>
                <span class="min-w-0 flex-1 truncate">
                  {row.label || row.destination}
                </span>
                <span class="shrink-0 font-mono">
                  {row.status === "created" ? row.shortCode : "failed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

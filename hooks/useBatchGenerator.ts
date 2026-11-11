import { useState } from "preact/hooks";
import QRRenderer from "../utils/qr-renderer.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { haptics } from "../utils/haptics.ts";
import { Signal } from "@preact/signals";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";

import type { QRStyle } from "../types/qr-types.ts";

export type BatchExportFormat = "png" | "svg" | "both";

export interface ParsedBatchRow {
  index: number;
  label: string;
  url: string;
  safeSlug: string;
}

const SEQUENCE_TOKEN_RE = /\{(\d+)\.\.(\d+)\}/g;
const CSV_HEADER_HINTS = new Set([
  "url",
  "destination",
  "link",
  "destination_url",
  "target",
]);

interface SequenceToken {
  start: number;
  end: number;
  padWidth: number;
}

function isLikelyCsvHeaderLine(line: string): boolean {
  if (line.includes("{") || /^https?:\/\//i.test(line)) return false;
  if (!line.includes(",")) return false;
  return line
    .split(",")
    .map((cell) => cell.replace(/^"|"$/g, "").trim().toLowerCase())
    .some((cell) => CSV_HEADER_HINTS.has(cell));
}

/**
 * Expands `{start..end}` numeric sequence tokens line-by-line (e.g.
 * `Table {1..20} | https://venue.co/t/{1..20}` or `https://venue.co/t/{01..25},Table {01..25}`).
 * - Preserves leading-zero padding (`{01..25}` -> `01`..`25`).
 * - Steps multiple tokens on the same line in lockstep.
 * - Ignores malformed or inverted (`{5..1}`) ranges gracefully.
 * - Caps expanded data rows at `maxRows` (default 200).
 */
export function expandSequenceExpressions(
  input: string,
  maxRows = 200,
): string {
  if (!input) return "";
  const safeCap = Math.max(1, Math.floor(maxRows));
  const rawLines = input.split(/\r?\n/);
  const outputLines: string[] = [];
  let dataRowsEmitted = 0;
  let checkedFirstNonEmpty = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (!checkedFirstNonEmpty) {
      checkedFirstNonEmpty = true;
      if (isLikelyCsvHeaderLine(trimmed)) {
        outputLines.push(trimmed);
        continue;
      }
    }

    if (dataRowsEmitted >= safeCap) break;

    const validTokens: SequenceToken[] = [];
    for (const match of trimmed.matchAll(SEQUENCE_TOKEN_RE)) {
      const startStr = match[1];
      const endStr = match[2];
      const start = Number(startStr);
      const end = Number(endStr);
      if (
        Number.isSafeInteger(start) &&
        Number.isSafeInteger(end) &&
        end >= start
      ) {
        const padWidth = startStr.length > 1 && startStr.startsWith("0")
          ? startStr.length
          : 0;
        validTokens.push({ start, end, padWidth });
      }
    }

    if (validTokens.length === 0) {
      outputLines.push(trimmed);
      dataRowsEmitted++;
      continue;
    }

    const span = Math.max(...validTokens.map((t) => t.end - t.start + 1));
    const countToEmit = Math.min(span, safeCap - dataRowsEmitted);

    for (let step = 0; step < countToEmit; step++) {
      let tokenIdx = 0;
      const expandedLine = trimmed.replace(
        SEQUENCE_TOKEN_RE,
        (fullMatch, startStr: string, endStr: string) => {
          const start = Number(startStr);
          const end = Number(endStr);
          if (
            !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) ||
            end < start
          ) {
            return fullMatch;
          }
          const token = validTokens[tokenIdx++];
          const val = Math.min(token.end, token.start + step);
          return token.padWidth > 0
            ? String(val).padStart(token.padWidth, "0")
            : String(val);
        },
      );
      outputLines.push(expandedLine);
      dataRowsEmitted++;
    }
  }

  return outputLines.join("\n");
}

/**
 * Parses batch textarea input into structured rows.
 * Supports `{start..end}` sequence expansion plus:
 *   - Plain URL or text: `https://example.com/table-1`
 *   - Pipe-separated label + URL: `Table 1 | https://example.com/table-1`
 *   - Comma-separated label + URL: `Table 1, https://example.com/table-1` (when right side starts with http:// or https://)
 *   - Comma-separated URL + label: `https://example.com/table-1, Table 1`
 */
export function parseBatchRows(raw: string, maxRows = 200): ParsedBatchRow[] {
  const expanded = expandSequenceExpressions(raw, maxRows);
  const lines = expanded
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isLikelyCsvHeaderLine(line));

  return lines.slice(0, maxRows).map((line, idx) => {
    let label = "";
    let url = line;

    const pipeIdx = line.indexOf("|");
    if (pipeIdx > 0) {
      const left = line.slice(0, pipeIdx).trim();
      const right = line.slice(pipeIdx + 1).trim();
      if (right.length > 0) {
        label = left;
        url = right;
      }
    } else {
      const commaMatch = /^(.+),\s*(https?:\/\/\S+)$/i.exec(line);
      if (commaMatch) {
        label = commaMatch[1].trim();
        url = commaMatch[2].trim();
      } else {
        const csvUrlFirstMatch = /^(https?:\/\/[^,\s]+),\s*(.+)$/i.exec(line);
        if (csvUrlFirstMatch) {
          url = csvUrlFirstMatch[1].trim();
          label = csvUrlFirstMatch[2].replace(/^"|"$/g, "").trim();
        }
      }
    }

    const baseForSlug = label || url.replace(/^https?:\/\//i, "");
    const safeSlug = baseForSlug
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase()
      .substring(0, 32) || `item_${idx + 1}`;

    return {
      index: idx + 1,
      label: label || `QR ${idx + 1}`,
      url,
      safeSlug,
    };
  });
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildBatchManifestCsv(
  rows: ParsedBatchRow[],
  format: BatchExportFormat,
): string {
  const includePng = format === "png" || format === "both";
  const includeSvg = format === "svg" || format === "both";
  const header = [
    "index",
    "label",
    "target_url",
    ...(includePng ? ["png_filename"] : []),
    ...(includeSvg ? ["svg_filename"] : []),
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    const num = String(row.index).padStart(2, "0");
    const baseName = `qr_${num}_${row.safeSlug}`;
    const cells = [
      escapeCsvCell(row.index),
      escapeCsvCell(row.label),
      escapeCsvCell(row.url),
      ...(includePng ? [escapeCsvCell(`${baseName}.png`)] : []),
      ...(includeSvg ? [escapeCsvCell(`${baseName}.svg`)] : []),
    ];
    lines.push(cells.join(","));
  }

  return lines.join("\r\n") + "\r\n";
}

interface UseBatchGeneratorProps {
  batchUrls: string;
  logoUrl: Signal<string>;
  qrStyle?: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
}

export function useBatchGenerator(
  { batchUrls, logoUrl, qrStyle, customStyle }: UseBatchGeneratorProps,
) {
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const generateBatchZIP = async (format: BatchExportFormat = "png") => {
    try {
      const rows = parseBatchRows(batchUrls);

      if (rows.length === 0) {
        addToast("No links in batch list", 3000);
        return;
      }

      setIsGeneratingBatch(true);
      setBatchProgress(0);
      haptics.medium();

      const styleKey = qrStyle?.value || "sunset";
      const styleConfig = resolveQRStyle(styleKey, customStyle?.value);

      const includePng = format === "png" || format === "both";
      const includeSvg = format === "svg" || format === "both";

      const { default: JSZip } = (await import("jszip")) as unknown as {
        default: new () => {
          file: (name: string, data: Blob | Uint8Array | string) => void;
          generateAsync: (opts: { type: "blob" }) => Promise<Blob>;
        };
      };
      const zip = new JSZip();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const num = String(row.index).padStart(2, "0");
        const baseName = `qr_${num}_${row.safeSlug}`;
        const qr = new QRRenderer({
          size: 1000,
          data: row.url,
          style: styleConfig,
          logoUrl: logoUrl.value,
        });

        if (includePng) {
          const pngBlob = await qr.getRawData("png");
          if (pngBlob) {
            zip.file(`${baseName}.png`, pngBlob);
          }
        }

        if (includeSvg) {
          const svgBlob = await qr.getRawData("svg");
          if (svgBlob) {
            zip.file(`${baseName}.svg`, svgBlob);
          }
        }

        setBatchProgress(Math.round(((i + 1) / rows.length) * 100));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Include print-shop manifest.csv in every batch ZIP
      zip.file("manifest.csv", buildBatchManifestCsv(rows, format));

      const content = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      const blobUrl = URL.createObjectURL(content);
      link.href = blobUrl;
      link.download = "qrbuddy_batch.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      haptics.success();
      setIsGeneratingBatch(false);

      addToast(
        `Batch complete — ${rows.length} QRs + manifest.csv downloaded`,
        3000,
      );
    } catch (error) {
      setIsGeneratingBatch(false);
      reportFailure("Batch generation failed", error, "Batch export failed");
    }
  };

  return {
    isGeneratingBatch,
    batchProgress,
    generateBatchZIP,
  };
}

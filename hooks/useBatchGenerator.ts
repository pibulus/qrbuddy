import { useState } from "preact/hooks";
// @ts-expect-error — esm.sh's jszip types omit the default export the runtime ESM build has
import JSZip from "jszip";
import QRCodeStyling from "qr-code-styling";
import { haptics } from "../utils/haptics.ts";
import { Signal } from "@preact/signals";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";

import { QR_STYLES } from "../utils/qr-styles.ts";
import type {
  CornerDotShape,
  CornerSquareShape,
  DotShape,
  QRStyle,
} from "../types/qr-types.ts";

export type BatchExportFormat = "png" | "svg" | "both";

export interface ParsedBatchRow {
  index: number;
  label: string;
  url: string;
  safeSlug: string;
}

/**
 * Parses batch textarea input into structured rows.
 * Supports:
 *   - Plain URL or text: `https://example.com/table-1`
 *   - Pipe-separated label + URL: `Table 1 | https://example.com/table-1`
 *   - Comma-separated label + URL: `Table 1, https://example.com/table-1` (when right side starts with http:// or https://)
 */
export function parseBatchRows(raw: string): ParsedBatchRow[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, idx) => {
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
        addToast("❌ No URLs provided!", 3000);
        return;
      }

      setIsGeneratingBatch(true);
      setBatchProgress(0);
      haptics.medium();

      const styleKey = qrStyle?.value || "sunset";
      const styleConfig: QRStyle = styleKey === "custom" && customStyle?.value
        ? customStyle.value
        : (QR_STYLES[styleKey as keyof typeof QR_STYLES] || QR_STYLES.sunset);

      const includePng = format === "png" || format === "both";
      const includeSvg = format === "svg" || format === "both";

      const zip = new JSZip();
      const baseOptions = {
        width: 1000,
        height: 1000,
        image: logoUrl.value || undefined,
        qrOptions: {
          errorCorrectionLevel: (logoUrl.value ? "H" : "Q") as "H" | "Q",
        },
        dotsOptions: {
          type: (styleConfig.dots.shape || "rounded") as DotShape,
          ...("gradient" in styleConfig.dots && styleConfig.dots.gradient
            ? { gradient: styleConfig.dots.gradient }
            : { color: styleConfig.dots.color }),
        },
        backgroundOptions: {
          ...("gradient" in styleConfig.background &&
              styleConfig.background.gradient
            ? { gradient: styleConfig.background.gradient }
            : { color: styleConfig.background.color }),
        },
        cornersSquareOptions: {
          type: (styleConfig.cornersSquare?.shape ||
            "extra-rounded") as CornerSquareShape,
          ...(styleConfig.cornersSquare &&
              "gradient" in styleConfig.cornersSquare &&
              styleConfig.cornersSquare.gradient
            ? { gradient: styleConfig.cornersSquare.gradient }
            : { color: styleConfig.cornersSquare?.color }),
        },
        cornersDotOptions: {
          type: (styleConfig.cornersDot?.shape || "dot") as CornerDotShape,
          ...(styleConfig.cornersDot && "gradient" in styleConfig.cornersDot &&
              styleConfig.cornersDot.gradient
            ? { gradient: styleConfig.cornersDot.gradient }
            : { color: styleConfig.cornersDot?.color }),
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
          hideBackgroundDots: true,
        },
      };

      const canvasQr = includePng
        ? new QRCodeStyling({ ...baseOptions, type: "canvas" })
        : null;
      const svgQr = includeSvg
        ? new QRCodeStyling({ ...baseOptions, type: "svg" })
        : null;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const num = String(row.index).padStart(2, "0");
        const baseName = `qr_${num}_${row.safeSlug}`;

        if (canvasQr) {
          canvasQr.update({ data: row.url });
          const pngBlob = await canvasQr.getRawData("png");
          if (pngBlob) {
            zip.file(`${baseName}.png`, pngBlob);
          }
        }

        if (svgQr) {
          svgQr.update({ data: row.url });
          const svgBlob = await svgQr.getRawData("svg");
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
        `📦 Batch complete! ${rows.length} QRs + manifest.csv downloaded.`,
        3000,
      );
    } catch (error) {
      setIsGeneratingBatch(false);
      reportFailure("Batch generation failed", error, "❌ Batch failed");
    }
  };

  return {
    isGeneratingBatch,
    batchProgress,
    generateBatchZIP,
  };
}

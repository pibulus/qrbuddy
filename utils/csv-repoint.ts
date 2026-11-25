import { extractShortCodeFromRedirectUrl } from "../hooks/useDynamicQR.ts";
import { parseTagsInput } from "./history.ts";
import { looksLikeUrl, normalizeUrl } from "./url.ts";

export interface EditableCsvRow {
  shortCode: string;
  title: string;
  destinationUrl: string;
  tags: string[];
  redirectUrl: string;
  scanCount: number;
  isActive: boolean;
  ownerToken?: string;
}

export interface EditableCsvUpdate {
  shortCode: string;
  ownerToken?: string;
  nextDestinationUrl?: string;
  nextTitle?: string;
  nextTags?: string[];
  destinationChanged: boolean;
  titleChanged: boolean;
  tagsChanged: boolean;
}

export interface EditableCsvParseResult {
  updates: EditableCsvUpdate[];
  unchangedCount: number;
  skippedCount: number;
  errors: string[];
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/** Splits one CSV line with delimiter auto-detection and RFC-4180 quote handling. */
function parseCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function buildEditableLibraryCsv(rows: EditableCsvRow[]): string {
  const header = [
    "short_code",
    "title",
    "destination_url",
    "tags",
    "redirect_url",
    "scan_count",
    "is_active",
  ].join(",");

  const body = rows.map((row) =>
    [
      escapeCsvCell(row.shortCode),
      escapeCsvCell(row.title),
      escapeCsvCell(row.destinationUrl),
      escapeCsvCell(row.tags.map((t) => `#${t}`).join(" ")),
      escapeCsvCell(row.redirectUrl),
      escapeCsvCell(row.scanCount),
      escapeCsvCell(row.isActive),
    ].join(",")
  );

  return [header, ...body].join("\n") + "\n";
}

export function parseEditableCsvUpdates(
  csvText: string,
  existingByShortCode: Map<string, EditableCsvRow>,
): EditableCsvParseResult {
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      updates: [],
      unchangedCount: 0,
      skippedCount: 0,
      errors: ["CSV needs a header row and at least one QR row."],
    };
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") && !headerLine.includes(",")
    ? ";"
    : ",";
  const headers = parseCsvRow(headerLine, delimiter).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );

  const codeCol = headers.findIndex((h) =>
    h === "short_code" || h === "shortcode" || h === "code"
  );
  const redirectCol = headers.findIndex((h) =>
    h === "redirect_url" || h === "short_url" || h === "qr_url"
  );
  const destCol = headers.findIndex((h) =>
    h === "destination_url" || h === "destination" || h === "url" ||
    h === "target_url"
  );
  const titleCol = headers.findIndex((h) =>
    h === "title" || h === "label" || h === "name"
  );
  const tagsCol = headers.findIndex((h) => h === "tags" || h === "tag");

  if (destCol === -1 && titleCol === -1 && tagsCol === -1) {
    return {
      updates: [],
      unchangedCount: 0,
      skippedCount: 0,
      errors: [
        "Missing editable columns (destination_url, title, or tags).",
      ],
    };
  }

  const updates: EditableCsvUpdate[] = [];
  const errors: string[] = [];
  let unchangedCount = 0;
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i], delimiter);
    const rawCode = codeCol >= 0 ? (cells[codeCol] ?? "").trim() : "";
    const rawRedirect = redirectCol >= 0
      ? (cells[redirectCol] ?? "").trim()
      : "";
    const shortCode = rawCode ||
      extractShortCodeFromRedirectUrl(rawRedirect) ||
      "";

    if (!shortCode) {
      skippedCount++;
      continue;
    }

    const existing = existingByShortCode.get(shortCode);
    if (!existing) {
      skippedCount++;
      continue;
    }

    const nextTitleRaw = titleCol >= 0
      ? (cells[titleCol] ?? "").trim().slice(0, 80)
      : existing.title;
    const titleChanged = titleCol >= 0 &&
      nextTitleRaw !== existing.title.trim();

    let nextDestinationUrl = existing.destinationUrl;
    let destinationChanged = false;
    if (destCol >= 0) {
      const candidate = (cells[destCol] ?? "").trim();
      if (candidate) {
        if (!looksLikeUrl(candidate)) {
          errors.push(`Row ${i + 1} (${shortCode}): invalid destination URL`);
          continue;
        }
        const normalizedCandidate = normalizeUrl(candidate);
        if (normalizedCandidate !== normalizeUrl(existing.destinationUrl)) {
          nextDestinationUrl = normalizedCandidate;
          destinationChanged = true;
        }
      }
    }

    let nextTags = existing.tags;
    let tagsChanged = false;
    if (tagsCol >= 0) {
      const parsedTags = parseTagsInput(cells[tagsCol] ?? "");
      if (JSON.stringify(parsedTags) !== JSON.stringify(existing.tags)) {
        nextTags = parsedTags;
        tagsChanged = true;
      }
    }

    if (!destinationChanged && !titleChanged && !tagsChanged) {
      unchangedCount++;
      continue;
    }

    updates.push({
      shortCode,
      ownerToken: existing.ownerToken,
      ...(destinationChanged ? { nextDestinationUrl } : {}),
      ...(titleChanged ? { nextTitle: nextTitleRaw } : {}),
      ...(tagsChanged ? { nextTags } : {}),
      destinationChanged,
      titleChanged,
      tagsChanged,
    });
  }

  return { updates, unchangedCount, skippedCount, errors };
}

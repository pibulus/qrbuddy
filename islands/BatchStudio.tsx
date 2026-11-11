// ═══════════════════════════════════════════════════════════════════════════
// BatchStudio — a spreadsheet in, a print-ready sheet of QR codes out
// ═══════════════════════════════════════════════════════════════════════════
// The thing a business with 400 cartons actually needs. Paste or drop a CSV
// with a destination column (and an optional label column), and every row
// becomes an editable code. The result downloads as a CSV you own and prints
// as a sheet you can hand to a label printer.
//
// Deliberately sequential: one row at a time, so a quota or auth failure
// stops the run with the rows already created still yours, instead of
// failing 400 times in parallel and reporting nothing.

import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../utils/api-request.ts";
import { getApiUrl } from "../utils/api.ts";
import { isPlusLibraryEnabled } from "../utils/auth.ts";
import { addDynamicToHistory } from "../utils/history.ts";
import { buildQrSvgString, toSvgDataUrl } from "../utils/qr-vector-svg.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";

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
 * Parse a pasted spreadsheet. A header row is detected by name; without one,
 * column 1 is the destination and column 2 the label.
 */
export function parseBatchCsv(
  text: string,
): { rows: BatchRow[]; skipped: number; error?: string } {
  const lines = text
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
    const cells = splitCsvLine(lines[i]);
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
  // One page, two products: editable codes (server, tracked) or plain image
  // files (local, no account, no scan data). The same CSV feeds both, so a
  // person never has to learn a second tool to change their mind.
  const [mode, setMode] = useState<"editable" | "images">("editable");
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

  /** Static mode: the destination itself is encoded, so the files work
   *  forever with no server and no account — the opposite trade to an
   *  editable code, offered side by side instead of hidden elsewhere. */
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
        const svg = buildQrSvgString({
          data: row.destination,
          size: 1024,
          errorCorrectionLevel: "M",
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
      a.download = "qrbuddy-static-qr.zip";
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

  /** Dynamic ZIP export: SVG vector files for every minted code + manifest.csv backup. */
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
        const svg = buildQrSvgString({
          data: row.redirectUrl ?? "",
          size: 1024,
          errorCorrectionLevel: "M",
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
      a.download = "qrbuddy-editable-qr.zip";
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

  function printSheet() {
    if (!created.length) return;
    const cells = created
      .map((row) => {
        const caption = row.label || row.shortCode || "";
        // Drawn locally: the customer's destinations never leave the browser
        // to reach some third-party QR image service.
        const svg = buildQrSvgString({
          data: row.redirectUrl ?? "",
          size: 420,
          errorCorrectionLevel: "M",
        });
        return `<figure class="cell">
          <img src="${toSvgDataUrl(svg)}" alt="" />
          <figcaption><strong>${escapeHtml(caption)}</strong><span>${
          escapeHtml(row.shortCode ?? "")
        }</span></figcaption>
        </figure>`;
      })
      .join("");

    const sheet = `<!doctype html><html><head><meta charset="utf-8">
      <title>QRBuddy batch sheet</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; margin: 0; }
        main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
        .cell { margin: 0; border: 1.5px solid #1e1714; border-radius: 6mm; padding: 4mm; text-align: center; break-inside: avoid; }
        .cell img { width: 100%; height: auto; display: block; }
        figcaption { display: grid; gap: 2px; margin-top: 3mm; }
        figcaption strong { font-size: 11px; }
        figcaption span { font-size: 9px; font-family: ui-monospace, Menlo, monospace; opacity: 0.7; }
      </style></head><body><main>${cells}</main></body></html>`;

    // deno-lint-ignore no-explicit-any
    const win = (globalThis as any).open("", "_blank") as Window | null;
    if (!win) {
      setError("Allow pop-ups to open the print sheet.");
      return;
    }
    win.document.write(sheet);
    win.document.close();
    win.focus();
    win.print();
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
          One row, one editable code. Every code prints with its label, and the
          CSV stays yours.
        </p>
      </header>

      <section class="rounded-3xl border-2 border-stone-900 bg-[#fffef7] p-5 shadow-[4px_4px_0_#1e1714]">
        <label class="block text-xs font-black uppercase tracking-wider text-stone-500">
          Paste a CSV, or drop a file
        </label>
        <textarea
          value={raw}
          onInput={(event) => {
            setRaw((event.target as HTMLTextAreaElement).value);
            setResults([]);
            setError("");
          }}
          rows={6}
          spellcheck={false}
          placeholder="url,title
https://acme.test/menu,Table 1
https://acme.test/menu,Table 2"
          class="mt-2 w-full resize-y rounded-2xl border-2 border-stone-300 bg-white p-3 font-mono text-xs focus:border-stone-900 focus:outline-none"
        />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFile}
            class="text-xs"
          />
          <span class="text-xs text-stone-500">
            {rows.length} row{rows.length === 1 ? "" : "s"} ready
            {parsed.skipped ? ` · ${parsed.skipped} skipped` : ""}
            {parsed.rows.length > MAX_ROWS ? ` · first ${MAX_ROWS} only` : ""}
          </span>
        </div>
        {(parsed.error || error) && (
          <p class="mt-3 text-xs font-bold text-pink-700">
            {parsed.error || error}
          </p>
        )}
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
              class={`rounded-xl border-2 border-stone-900 px-3 py-2 text-xs font-black transition ${
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
            ? "Editable: every row becomes a tracked code you can re-point later. Needs a connection."
            : "Image files: the destination is inside the graphic. No account, no tracking, works forever offline."}
        </p>

        {mode === "editable"
          ? (
            <button
              type="button"
              onClick={run}
              disabled={isGenerating || !rows.length}
              class="mt-4 w-full rounded-2xl border-2 border-stone-900 bg-pink-400 px-4 py-3 text-sm font-black shadow-[3px_3px_0_#1e1714] transition active:translate-y-[2px] active:shadow-[1px_1px_0_#1e1714] disabled:opacity-40"
            >
              {isGenerating
                ? `Creating ${done} / ${rows.length}…`
                : `Create ${rows.length || ""} code${
                  rows.length === 1 ? "" : "s"
                }`}
            </button>
          )
          : (
            <button
              type="button"
              onClick={downloadStaticZip}
              disabled={zipping || !rows.length}
              class="mt-4 w-full rounded-2xl border-2 border-stone-900 bg-yellow-300 px-4 py-3 text-sm font-black shadow-[3px_3px_0_#1e1714] transition active:translate-y-[2px] active:shadow-[1px_1px_0_#1e1714] disabled:opacity-40"
            >
              {zipping
                ? "Building the ZIP…"
                : `Download ${rows.length || ""} SVG files`}
            </button>
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
                class="rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={downloadDynamicZip}
                disabled={!created.length || zipping}
                class="rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                {zipping ? "Building ZIP…" : "Download ZIP"}
              </button>
              <button
                type="button"
                onClick={printSheet}
                disabled={!created.length}
                class="rounded-xl border-2 border-stone-900 bg-yellow-300 px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                Print sheet
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

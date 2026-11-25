import { useEffect, useRef, useState } from "preact/hooks";
import {
  type BatchExportFormat,
  parseBatchRows,
} from "../../hooks/useBatchGenerator.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { resolveQRStyle } from "../../utils/qr-design.ts";
import {
  type BatchResult,
  buildBatchStickerSheetHtml,
  buildDynamicBatchManifestCsv,
  buildStyledBatchQrSvg,
  compactUrlSublabel,
  type CreateQrResponse,
  persistMintedBatchRow,
  type StickerGridSize,
  type StickerPaperSize,
  type StickerSheetItem,
} from "../../utils/batch-sheets.ts";
import { apiRequest } from "../../utils/api-request.ts";
import { getApiUrl } from "../../utils/api.ts";
import { isPlusLibraryEnabled } from "../../utils/auth.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { haptics } from "../../utils/haptics.ts";
import type { QRStyle } from "../../types/qr-types.ts";

type BatchKind = "static" | "editable";
type StaticOutput = BatchExportFormat | "sheet";

interface BatchSettingsProps {
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: (format?: BatchExportFormat) => void;
  /** Active palette key + custom style, so sheets match the stage. */
  qrStyle?: string;
  customStyle?: QRStyle | null;
  lang?: Locale;
}

const PILL_TRACK =
  "grid gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]";
const PILL_BASE =
  "min-h-[34px] px-2 py-1 text-xs font-black rounded-lg border-2 transition-all disabled:opacity-50";
const PILL_ON =
  "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]";
const PILL_OFF =
  "border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/60";
const MINI_BTN =
  "px-2.5 py-1 text-[11px] font-black rounded-lg border-2 border-[#1e1714]/25 bg-[#fbf1e4] text-[#1e1714] hover:border-[#1e1714] transition-colors disabled:opacity-50";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function isHttp(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export default function BatchSettings({
  batchUrls,
  setBatchUrls,
  isGeneratingBatch,
  batchProgress,
  onGenerateBatch,
  qrStyle = "sunset",
  customStyle = null,
  lang,
}: BatchSettingsProps) {
  const locale = getClientLocale(lang);
  const es = locale === "es";
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<BatchKind>("static");
  const [output, setOutput] = useState<StaticOutput>("both");
  const [paper, setPaper] = useState<StickerPaperSize>("A4");
  const [grid, setGrid] = useState<StickerGridSize>("3x4");
  const [minting, setMinting] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [zipping, setZipping] = useState(false);

  const rows = parseBatchRows(batchUrls);
  const count = rows.length;
  const created = results.filter((r) => r.status === "created");
  const failed = results.length - created.length;
  const busy = isGeneratingBatch || minting || zipping;
  const showSheetPills = (kind === "static" && output === "sheet") ||
    (kind === "editable" && created.length > 0);

  // A half-minted run must not vanish with the tab.
  useEffect(() => {
    if (!minting) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    globalThis.addEventListener("beforeunload", guard);
    return () => globalThis.removeEventListener("beforeunload", guard);
  }, [minting]);

  const resolvedStyle = () => resolveQRStyle(qrStyle, customStyle);

  const insertSequenceExample = () => {
    const sample = es
      ? "Mesa {01..08} | https://ejemplo.com/mesa-{01..08}"
      : "Table {01..08} | https://example.com/table-{01..08}";
    setBatchUrls(batchUrls.trim() ? `${batchUrls.trim()}\n${sample}` : sample);
    setResults([]);
  };

  const importFile = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setBatchUrls(await file.text());
    setResults([]);
    input.value = "";
  };

  const openSheet = (items: StickerSheetItem[]) => {
    if (!items.length) return;
    const html = buildBatchStickerSheetHtml({
      items,
      paperSize: paper,
      grid,
      style: resolvedStyle(),
      lang: locale,
    });
    const win = globalThis.open("", "_blank");
    if (!win) {
      addToast(
        es
          ? "Ventana bloqueada: permitir pop-ups para abrir la hoja"
          : "Pop-up blocked: allow pop-ups to open the sheet",
        3500,
      );
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const printStaticSheet = () =>
    openSheet(rows.map((row) => ({
      data: row.url,
      caption: row.label,
      sublabel: compactUrlSublabel(row.url),
    })));

  const printEditableSheet = () =>
    openSheet(created.map((row) => ({
      data: row.redirectUrl ?? "",
      caption: row.label || row.shortCode || `QR ${row.index}`,
      sublabel: row.label ? (row.shortCode ?? "") : "",
    })));

  /** Mint one row at a time so a quota stop leaves earlier rows vaulted locally. */
  const mintEditable = async () => {
    if (!count || minting) return;
    setMinting(true);
    setResults([]);
    haptics.medium();
    const apiUrl = getApiUrl();
    const collected: BatchResult[] = [];
    for (const row of rows) {
      const base = {
        index: row.index,
        label: row.label,
        destination: row.url,
      };
      if (!isHttp(row.url)) {
        collected.push({
          ...base,
          status: "failed",
          error: es ? "Necesita un link http(s)" : "Needs an http(s) link",
        });
        setResults([...collected]);
        continue;
      }
      try {
        const made = await apiRequest<CreateQrResponse>(
          `${apiUrl}/create-dynamic-qr`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination_url: row.url,
              title: row.label || null,
            }),
            useUserAuth: isPlusLibraryEnabled(),
          },
          `Row ${row.index} failed`,
        );
        await persistMintedBatchRow(
          { label: row.label, destination: row.url },
          made,
        );
        collected.push({
          ...base,
          status: "created",
          shortCode: made.short_code,
          redirectUrl: made.redirect_url,
          editUrl: made.edit_url,
        });
        setResults([...collected]);
      } catch (caught) {
        collected.push({
          ...base,
          status: "failed",
          error: caught instanceof Error ? caught.message : "Failed",
        });
        // Quota or network stop: later rows would fail the same way.
        setResults([...collected]);
        break;
      }
    }
    setMinting(false);
    haptics.success();
  };

  const downloadEditableZip = async () => {
    if (!created.length || zipping) return;
    setZipping(true);
    try {
      const { default: JSZip } = (await import("jszip")) as unknown as {
        default: new () => {
          file: (name: string, data: Blob | string) => void;
          generateAsync: (opts: { type: "blob" }) => Promise<Blob>;
        };
      };
      const zip = new JSZip();
      const style = resolvedStyle();
      for (const row of created) {
        const svg = buildStyledBatchQrSvg(row.redirectUrl ?? "", qrStyle, {
          size: 1024,
          caption: row.label || undefined,
          style,
        });
        const suffix = row.shortCode ? `-${row.shortCode}` : "";
        const name = `qr-${String(row.index).padStart(3, "0")}${suffix}`;
        zip.file(`${name}.svg`, new Blob([svg], { type: "image/svg+xml" }));
      }
      zip.file("manifest.csv", buildDynamicBatchManifestCsv(created));
      downloadBlob(
        "qrbuddy-editable-batch.zip",
        await zip.generateAsync({ type: "blob" }),
      );
    } catch {
      addToast(
        es ? "No se pudo armar el ZIP" : "Could not build the ZIP",
        3000,
      );
    } finally {
      setZipping(false);
    }
  };

  const outputs: { id: StaticOutput; label: string }[] = [
    { id: "both", label: "PNG + SVG" },
    { id: "png", label: "PNG" },
    { id: "svg", label: "SVG" },
    { id: "sheet", label: es ? "Hoja" : "Sheet" },
  ];

  return (
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      <div class="flex items-center justify-between gap-2">
        <h3 class="qr-section-eyebrow">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{es ? "Lote de QRs" : "Bulk QRs"}</span>
        </h3>
        <span class="text-xs font-black text-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] border-2 border-[#1e1714] px-2.5 py-0.5 rounded-full tabular-nums">
          {count} {count === 1 ? "QR" : "QRs"}
        </span>
      </div>

      <div
        class={`${PILL_TRACK} grid-cols-2`}
        role="group"
        aria-label={es ? "Tipo de lote" : "Batch type"}
      >
        {([
          ["static", es ? "Estático" : "Static"],
          ["editable", "Editable"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            disabled={busy}
            onClick={() => {
              setKind(id);
              haptics.light();
            }}
            class={`${PILL_BASE} ${kind === id ? PILL_ON : PILL_OFF}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-[#5c4f47]">
          {es
            ? "Un link por línea, «Nombre | https://…» o {01..25}"
            : 'One link per line, "Label | https://…", or {01..25}'}
        </span>
        <div class="flex gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            class="hidden"
            onChange={importFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            class={MINI_BTN}
          >
            + CSV
          </button>
          <button
            type="button"
            onClick={insertSequenceExample}
            disabled={busy}
            class={MINI_BTN}
          >
            + {"{01..08}"}
          </button>
        </div>
      </div>

      <textarea
        value={batchUrls}
        aria-label={es
          ? "Lista de enlaces para generar QRs en lote (uno por línea)"
          : "Batch QR links (one per line)"}
        onInput={(e) => {
          setBatchUrls((e.target as HTMLTextAreaElement).value);
          if (results.length) setResults([]);
        }}
        placeholder={es
          ? `Mesa {01..08} | https://ejemplo.com/mesa-{01..08}\nhttps://ejemplo.com/menu-vip`
          : `Table {01..08} | https://example.com/table-{01..08}\nhttps://example.com/vip-menu`}
        rows={4}
        class="qr-input text-sm font-mono resize-none"
        disabled={busy}
      />

      {kind === "static" && (
        <div
          class={`${PILL_TRACK} grid-cols-4`}
          role="group"
          aria-label={es ? "Formato de salida" : "Output format"}
        >
          {outputs.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={output === opt.id}
              disabled={busy}
              onClick={() => setOutput(opt.id)}
              class={`${PILL_BASE} ${output === opt.id ? PILL_ON : PILL_OFF}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {showSheetPills && (
        <div class="grid grid-cols-2 gap-2 animate-slide-down">
          <div class={`${PILL_TRACK} grid-cols-2`} role="group">
            {(["A4", "Letter"] as const).map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={paper === size}
                onClick={() => setPaper(size)}
                class={`${PILL_BASE} ${paper === size ? PILL_ON : PILL_OFF}`}
              >
                {size}
              </button>
            ))}
          </div>
          <div class={`${PILL_TRACK} grid-cols-2`} role="group">
            {(["3x4", "4x6"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={grid === g}
                onClick={() => setGrid(g)}
                class={`${PILL_BASE} ${grid === g ? PILL_ON : PILL_OFF}`}
              >
                {g.replace("x", "×")}
              </button>
            ))}
          </div>
        </div>
      )}

      {isGeneratingBatch || minting
        ? (
          <div class="space-y-2 pt-1" role="status" aria-live="polite">
            <div class="h-3.5 bg-[#efe9dc] rounded-full overflow-hidden border-2 border-[#1e1714]">
              <div
                class="h-full bg-[#ffbe0b] transition-all duration-300"
                style={{
                  width: `${
                    minting
                      ? Math.round((results.length / Math.max(count, 1)) * 100)
                      : batchProgress
                  }%`,
                }}
              />
            </div>
            <p class="text-center text-xs font-black text-[#1e1714] animate-pulse">
              {minting
                ? (es
                  ? `Creando códigos… ${results.length}/${count}`
                  : `Minting codes… ${results.length}/${count}`)
                : (es
                  ? `Generando… ${batchProgress}%`
                  : `Generating… ${batchProgress}%`)}
            </p>
          </div>
        )
        : kind === "static"
        ? (
          <button
            type="button"
            onClick={() =>
              output === "sheet" ? printStaticSheet() : onGenerateBatch(output)}
            disabled={!count}
            class="qr-pitch-cta"
          >
            <span>
              {output === "sheet"
                ? (es ? "Abrir hoja de etiquetas" : "Open sticker sheet")
                : (es
                  ? "Descargar ZIP + manifest.csv"
                  : "Download ZIP + manifest.csv")}
            </span>
          </button>
        )
        : created.length === 0
        ? (
          <button
            type="button"
            onClick={mintEditable}
            disabled={!count}
            class="qr-pitch-cta"
          >
            <span>
              {es
                ? `Crear ${count || ""} QRs editables`
                : `Create ${count || ""} editable QRs`}
            </span>
          </button>
        )
        : (
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadEditableZip}
              disabled={zipping}
              class="qr-pitch-cta"
            >
              <span>{zipping ? "…" : "ZIP"}</span>
            </button>
            <button
              type="button"
              onClick={printEditableSheet}
              class="qr-pitch-cta"
            >
              <span>{es ? "Hoja" : "Sheet"}</span>
            </button>
          </div>
        )}

      {kind === "editable" && results.length > 0 && !minting && (
        <p
          role="status"
          class="text-center text-xs font-black text-[#4a3f39]"
        >
          {es
            ? `${created.length} creados, guardados en este dispositivo`
            : `${created.length} created, vaulted on this device`}
          {failed > 0 && (
            <span class="block font-bold text-amber-900">
              {results.find((r) => r.status === "failed")?.error}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

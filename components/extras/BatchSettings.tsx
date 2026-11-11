import { useState } from "preact/hooks";
import {
  type BatchExportFormat,
  parseBatchRows,
} from "../../hooks/useBatchGenerator.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

export const BATCH_DRAFT_STORAGE_KEY = "qrbuddy_batch_draft";

export function stashBatchDraft(
  draft: string,
  storage?: Pick<Storage, "setItem" | "removeItem">,
): boolean {
  try {
    const target = storage ??
      (typeof sessionStorage !== "undefined" ? sessionStorage : undefined);
    if (!target) return false;
    const trimmed = draft.trim();
    if (!trimmed) {
      target.removeItem(BATCH_DRAFT_STORAGE_KEY);
      return false;
    }
    target.setItem(BATCH_DRAFT_STORAGE_KEY, trimmed);
    return true;
  } catch {
    return false;
  }
}

interface BatchSettingsProps {
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: (format?: BatchExportFormat) => void;
  lang?: Locale;
}

export default function BatchSettings({
  batchUrls,
  setBatchUrls,
  isGeneratingBatch,
  batchProgress,
  onGenerateBatch,
  lang,
}: BatchSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const [format, setFormat] = useState<BatchExportFormat>("both");
  const count = parseBatchRows(batchUrls).length;

  const insertSequenceExample = () => {
    const sample = isSpanish
      ? "Mesa {01..08} | https://ejemplo.com/mesa-{01..08}"
      : "Table {01..08} | https://example.com/table-{01..08}";
    setBatchUrls(batchUrls.trim() ? `${batchUrls.trim()}\n${sample}` : sample);
  };

  return (
    <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-black text-gray-900">
          {isSpanish
            ? "Lote de QRs + Manifiesto CSV"
            : "Batch ZIP + CSV Manifest"}
        </h3>
        <span class="text-xs font-black text-blue-900 bg-blue-100 border-2 border-black px-2.5 py-1 rounded-full shadow-sm tabular-nums">
          {count} {count === 1 ? "QR" : "QRs"}
        </span>
      </div>

      <div
        class="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={isSpanish
          ? "Formato de exportación en lote"
          : "Batch export format"}
      >
        {[
          {
            id: "both" as const,
            label: isSpanish ? "PNG + SVG Vector" : "PNG + Vector SVG",
          },
          { id: "png" as const, label: "PNG (1000px)" },
          { id: "svg" as const, label: isSpanish ? "Solo SVG" : "SVG Only" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={format === opt.id}
            onClick={() => setFormat(opt.id)}
            disabled={isGeneratingBatch}
            class={`min-h-[44px] px-3 py-2 text-xs font-black rounded-xl border-2 border-[#1e1714] transition-all ${
              format === opt.id
                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-chunky-xs"
                : "bg-qr-cream text-gray-700 hover:bg-[var(--qr-theme-tint,#fdf2f8)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-gray-600">
          {isSpanish
            ? "Un link por línea, «Nombre | https://…» o {01..25}"
            : 'One link per line, "Label | https://…", or {01..25}'}
        </span>
        <button
          type="button"
          onClick={insertSequenceExample}
          disabled={isGeneratingBatch}
          class="px-2.5 py-1 text-[11px] font-black rounded-lg border-[1.5px] border-[#1e1714]/30 bg-qr-cream text-[#1e1714] hover:border-[#1e1714] transition-colors disabled:opacity-50"
        >
          {isSpanish ? "Insertar ejemplo {01..08}" : "Insert {01..08} example"}
        </button>
      </div>

      <textarea
        value={batchUrls}
        aria-label={isSpanish
          ? "Lista de enlaces para generar QRs en lote (uno por línea)"
          : "Batch QR links (one per line)"}
        onInput={(e) => setBatchUrls((e.target as HTMLTextAreaElement).value)}
        placeholder={isSpanish
          ? `Mesa {01..08} | https://ejemplo.com/mesa-{01..08}\nhttps://ejemplo.com/menu-vip`
          : `Table {01..08} | https://example.com/table-{01..08}\nhttps://example.com/vip-menu`}
        rows={5}
        class="w-full px-3.5 py-2.5 text-base sm:text-sm border-2 border-gray-300 focus:border-black rounded-xl focus:outline-none font-mono bg-white resize-none"
        disabled={isGeneratingBatch}
      />

      {isGeneratingBatch
        ? (
          <div class="space-y-2 pt-1" role="status" aria-live="polite">
            <div class="h-3.5 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
              <div
                class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <p class="text-center text-xs font-black text-blue-800 animate-pulse">
              {isSpanish
                ? `Generando QRs en lote... ${batchProgress}%`
                : `Generating batch QRs... ${batchProgress}%`}
            </p>
          </div>
        )
        : (
          <button
            type="button"
            onClick={() => onGenerateBatch(format)}
            disabled={!batchUrls.trim()}
            class="w-full min-h-[48px] py-3 text-sm font-black text-white bg-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSpanish
              ? "Descargar ZIP (QRs + manifest.csv)"
              : "Download Batch ZIP (QRs + manifest.csv)"}
          </button>
        )}

      {
        /* The other half of the same job, one link away: a static ZIP is final
          the moment it is printed, an editable code is not. Both belong to the
          same CSV, so the door out of here is a link, not a second tool. */
      }
      <a
        href="/batch"
        onClick={() => {
          stashBatchDraft(batchUrls);
        }}
        class="block text-center text-xs font-black text-neutral-700 underline decoration-2 decoration-black/20 underline-offset-2 hover:text-black"
      >
        {isSpanish
          ? "Códigos editables y hoja de etiquetas → Abrir Lote"
          : "Editable codes & sticker print sheets → Open Batch"}
      </a>
    </div>
  );
}

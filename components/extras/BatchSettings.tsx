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
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      <div class="flex items-center justify-between gap-2">
        <h3 class="qr-section-eyebrow">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>
            {isSpanish
              ? "Lote de QRs + Manifiesto CSV"
              : "Batch ZIP + CSV Manifest"}
          </span>
        </h3>
        <span class="text-xs font-black text-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] border-2 border-[#1e1714] px-2.5 py-0.5 rounded-full tabular-nums">
          {count} {count === 1 ? "QR" : "QRs"}
        </span>
      </div>

      <div
        class="grid grid-cols-3 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]"
        role="group"
        aria-label={isSpanish
          ? "Formato de exportación en lote"
          : "Batch export format"}
      >
        {[
          {
            id: "both" as const,
            label: isSpanish ? "PNG + SVG" : "PNG + SVG",
          },
          { id: "png" as const, label: "PNG 1000px" },
          { id: "svg" as const, label: isSpanish ? "Solo SVG" : "SVG Only" },
        ].map((opt) => {
          const active = format === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFormat(opt.id)}
              disabled={isGeneratingBatch}
              class={`min-h-[36px] px-2 py-1 text-xs font-black rounded-lg border-2 transition-all ${
                active
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                  : "border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/60"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-[#5c4f47]">
          {isSpanish
            ? "Un link por línea, «Nombre | https://…» o {01..25}"
            : 'One link per line, "Label | https://…", or {01..25}'}
        </span>
        <button
          type="button"
          onClick={insertSequenceExample}
          disabled={isGeneratingBatch}
          class="px-2.5 py-1 text-[11px] font-black rounded-lg border-2 border-[#1e1714]/25 bg-[#fbf1e4] text-[#1e1714] hover:border-[#1e1714] transition-colors disabled:opacity-50"
        >
          {isSpanish ? "+ Ejemplo {01..08}" : "+ {01..08} example"}
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
        class="qr-input text-sm font-mono resize-none"
        disabled={isGeneratingBatch}
      />

      {isGeneratingBatch
        ? (
          <div class="space-y-2 pt-1" role="status" aria-live="polite">
            <div class="h-3.5 bg-[#efe9dc] rounded-full overflow-hidden border-2 border-[#1e1714]">
              <div
                class="h-full bg-[#ffbe0b] transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <p class="text-center text-xs font-black text-[#1e1714] animate-pulse">
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
            class="qr-pitch-cta"
          >
            <span>
              {isSpanish
                ? "Descargar ZIP (QRs + manifest.csv)"
                : "Download Batch ZIP (QRs + manifest.csv)"}
            </span>
          </button>
        )}

      <a
        href="/batch"
        onClick={() => {
          stashBatchDraft(batchUrls);
        }}
        class="block text-center text-xs font-black text-[#4a3f39] underline decoration-2 decoration-[#1e1714]/25 underline-offset-2 hover:text-[#1e1714]"
      >
        {isSpanish
          ? "Códigos editables y hoja de etiquetas → Abrir Lote"
          : "Editable codes & sticker print sheets → Open Batch"}
      </a>
    </div>
  );
}

import { useState } from "preact/hooks";
import type { BatchExportFormat } from "../../hooks/useBatchGenerator.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

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
  const count = batchUrls.split("\n").filter((u) => u.trim()).length;

  return (
    <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📦</span>
          <h3 class="font-black text-gray-900">
            {isSpanish
              ? "Lote de QRs + Manifiesto CSV"
              : "Batch ZIP + CSV Manifest"}
          </h3>
        </div>
        <span class="text-xs font-black text-blue-900 bg-blue-100 border-2 border-black px-2.5 py-1 rounded-full shadow-sm">
          {count} {count === 1 ? "QR" : "QRs"}
        </span>
      </div>

      <p class="text-xs text-gray-600 leading-relaxed">
        {isSpanish
          ? "Pega un link por línea (o usa «Mesa 1 | https://...» para nombrar cada archivo). Incluye tu paleta, logo central y un archivo manifest.csv listo para imprenta."
          : 'Paste one link per line (or use "Table 1 | https://..." to name each file). Applies your active palette + center logo and includes a print-shop manifest.csv.'}
      </p>

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
            class={`min-h-[44px] px-3 py-2 text-xs font-black rounded-xl border-2 border-black transition-all ${
              format === opt.id
                ? "bg-amber-200 text-black shadow-chunky-xs"
                : "bg-qr-cream text-gray-700 hover:bg-amber-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={batchUrls}
        aria-label={isSpanish
          ? "Lista de enlaces para generar QRs en lote (uno por línea)"
          : "Batch QR links (one per line)"}
        onInput={(e) => setBatchUrls((e.target as HTMLTextAreaElement).value)}
        placeholder={isSpanish
          ? `Mesa 1 | https://ejemplo.com/mesa-1\nMesa 2 | https://ejemplo.com/mesa-2\nhttps://ejemplo.com/menu-vip`
          : `Table 1 | https://example.com/table-1\nTable 2 | https://example.com/table-2\nhttps://example.com/vip-menu`}
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
            <span>⚡️</span> {isSpanish
              ? "Descargar ZIP (QRs + manifest.csv)"
              : "Download Batch ZIP (QRs + manifest.csv)"}
          </button>
        )}
    </div>
  );
}

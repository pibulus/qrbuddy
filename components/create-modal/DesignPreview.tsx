import type { Signal } from "@preact/signals";
import type { FrameConfig, QRStyle } from "../../types/qr-types.ts";
import { bannerColors, resolveQRStyle } from "../../utils/qr-design.ts";
import { styledQrSvg } from "../../utils/qr-renderer.ts";
import { evaluateQrContrast, toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { resolveRiso, risoPaper } from "../../utils/qr-print.ts";
import {
  canExportTransparent,
  createFramedSvg,
  stripSvgBackgroundRect,
} from "../../utils/svg-export.ts";
import { getQRThemeTokens } from "../../utils/qr-styles.ts";
import {
  estimateMinPrintSize,
  measureQrModules,
} from "../../islands/QRCanvas.tsx";
import { resolvePaletteDisplayName } from "./DesignTab.tsx";

export default function DesignPreview(
  {
    url,
    qrStyle,
    customStyle,
    logoUrl,
    frameConfig,
    es,
    onOpenCustomGradient: _onOpenCustomGradient,
    onReset,
  }: {
    url: Signal<string>;
    qrStyle: Signal<string>;
    customStyle?: Signal<QRStyle | null>;
    logoUrl: Signal<string>;
    frameConfig?: Signal<FrameConfig | null>;
    es: boolean;
    onOpenCustomGradient?: () => void;
    onReset?: () => void;
  },
) {
  try {
    const resolved = resolveQRStyle(qrStyle.value, customStyle?.value);
    const activeStyle =
      resolved.renderMode === "halftone" || resolved.renderMode === "foil"
        ? { ...resolved, renderMode: "classic" as const }
        : resolved;
    const tokens = getQRThemeTokens(qrStyle.value, customStyle?.value);
    const payload = url.value || "https://qrbuddy.app";
    let svg = styledQrSvg({
      size: 1000,
      data: payload,
      style: activeStyle,
      logoUrl: logoUrl.value,
    });
    const hasFrame = Boolean(
      frameConfig?.value?.enabled && frameConfig.value.caption.trim() !== "",
    );
    const isTransparent = canExportTransparent(
      activeStyle,
      hasFrame ? { enabled: true } : null,
    );
    const omitted = Boolean(logoUrl.value) &&
      svg.includes('data-cutout="none"');
    if (hasFrame && frameConfig?.value) {
      svg = createFramedSvg(svg, frameConfig.value.caption, {
        banner: bannerColors(frameConfig.value.theme, tokens.accent),
      });
    } else if (isTransparent) {
      svg = stripSvgBackgroundRect(svg);
    }

    const stopColors = activeStyle.dots.gradient?.colorStops?.map((s) =>
      s.color
    ) ??
      (activeStyle.dots.color ? [activeStyle.dots.color] : [tokens.accent]);
    const bgHex = activeStyle.background.color ??
      activeStyle.background.gradient?.colorStops?.[0]?.color ??
      "#FFF8F0";
    const printMode = activeStyle.print ?? "clean";
    // Under riso the sheet is not the palette: the press picks its stock and its
    // two drums, so the contrast check evaluates those against the selected stock.
    const risoPaperHex = printMode === "riso"
      ? risoPaper(activeStyle.risoStock)
      : null;
    const transparentLightInk = isTransparent &&
      stopColors.some((c) => evaluateQrContrast([c], "#FFFEF7").inverted);
    const paper = isTransparent
      ? (transparentLightInk ? "#1E1714" : "#FFFEF7")
      : (risoPaperHex ?? bgHex);
    const inks = printMode === "riso"
      ? [resolveRiso(stopColors, paper, activeStyle.risoInk)[0]]
      : stopColors;
    const contrast = evaluateQrContrast(inks, paper);
    const hasContrastIssue = contrast.inverted || contrast.minRatio < 4.5;

    const paletteName = resolvePaletteDisplayName(qrStyle.value, es);
    const surfaceBadge = isTransparent
      ? (es ? "Sin fondo" : "Clear")
      : printMode === "riso"
      ? "Riso"
      : printMode === "paper"
      ? (es ? "Papel" : "Paper")
      : null;

    const moduleCount = measureQrModules(payload, {
      logoUrl: logoUrl.value,
      dotShape: activeStyle.dots?.shape,
    });
    const printSpec = estimateMinPrintSize(moduleCount);
    const minInchesText = printSpec.minInches.toFixed(1);

    return (
      <div
        class="shrink-0 px-4 sm:px-6 py-2.5 border-b-2 border-[#1e1714]/15 bg-[#f7ecdc]/85"
        data-design-preview
      >
        <div class="flex items-center gap-3">
          <div
            class="w-[80px] h-[80px] sm:w-[86px] sm:h-[86px] shrink-0 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-1 flex items-center justify-center shadow-[2px_2px_0_#1e1714]"
            style={isTransparent
              ? {
                background:
                  "repeating-conic-gradient(#efe6d5 0% 25%, #fffef7 0% 50%) 50% / 12px 12px",
              }
              : undefined}
          >
            <img
              src={toSvgDataUrl(svg)}
              alt={es
                ? "Vista previa del QR en vivo"
                : "Live QR design preview"}
              class="w-full h-full object-contain"
              width="86"
              height="86"
            />
          </div>

          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                <span class="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2.5 py-0.5 text-xs font-black text-[#1e1714]">
                  <span
                    aria-hidden="true"
                    class="w-2.5 h-2.5 rounded-full border border-[#1e1714] shrink-0"
                    style={{ backgroundColor: tokens.accent }}
                  />
                  <span>{paletteName}</span>
                </span>

                {surfaceBadge && (
                  <span class="inline-flex items-center rounded-full border border-[#1e1714]/50 bg-[#fffef7] px-2 py-0.5 text-[11px] font-black text-[#1e1714]">
                    {surfaceBadge}
                  </span>
                )}

                <span
                  class={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black tabular-nums ${
                    hasContrastIssue
                      ? "border-amber-500 bg-amber-100 text-amber-950"
                      : "border-[#1e1714]/30 bg-[#dcfce7] text-[#1e1714]"
                  }`}
                >
                  <span>{hasContrastIssue ? "⚠" : "✓"}</span>
                  <span>
                    {hasContrastIssue
                      ? (es ? "Contraste bajo" : "Low contrast")
                      : (es ? "Escaneo seguro" : "Scan-safe")}
                  </span>
                </span>
              </div>

              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  class="shrink-0 min-h-[30px] px-2.5 rounded-xl border border-[#1e1714]/25 bg-[#fffef7] hover:border-[#1e1714] hover:bg-[#f7ecdc] text-[11px] font-black text-[#1e1714] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714]"
                  aria-label={es
                    ? "Restablecer diseño original"
                    : "Reset design to default"}
                >
                  ↺ {es ? "Restablecer" : "Reset"}
                </button>
              )}
            </div>

            {omitted
              ? (
                <p
                  data-print-spec
                  data-dense-warning={printSpec.denseWarning ? "true" : "false"}
                  class="text-[11px] font-bold text-amber-900"
                  role="status"
                >
                  {es
                    ? "QR denso: marca central omitida."
                    : "Dense QR: center mark omitted."}
                </p>
              )
              : (
                <p
                  data-print-spec
                  data-dense-warning={printSpec.denseWarning ? "true" : "false"}
                  class={`text-[11px] font-bold leading-snug tabular-nums truncate ${
                    printSpec.denseWarning ? "text-amber-900" : "text-[#574c44]"
                  }`}
                >
                  {es
                    ? `${moduleCount}×${moduleCount} · Mín. ${printSpec.minMm} mm (${minInchesText}″)`
                    : `${moduleCount}×${moduleCount} · Print ≥ ${printSpec.minMm} mm (${minInchesText}″)`}
                </p>
              )}
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <p class="p-3 text-sm text-amber-800" role="status">
        {es
          ? "El contenido supera la capacidad del QR."
          : "Content exceeds QR capacity."}
      </p>
    );
  }
}

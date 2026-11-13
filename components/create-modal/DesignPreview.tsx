import type { Signal } from "@preact/signals";
import type { FrameConfig, QRStyle } from "../../types/qr-types.ts";
import { bannerColors, resolveQRStyle } from "../../utils/qr-design.ts";
import { styledQrSvg } from "../../utils/qr-renderer.ts";
import { evaluateQrContrast, toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { resolveRiso, risoPaper } from "../../utils/qr-print.ts";
import { createFramedSvg } from "../../utils/svg-export.ts";
import { getQRThemeTokens } from "../../utils/qr-styles.ts";
import { resolvePaletteDisplayName } from "./DesignTab.tsx";

export default function DesignPreview(
  {
    url,
    qrStyle,
    customStyle,
    logoUrl,
    frameConfig,
    es,
    onOpenCustomGradient,
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
    const tokens = getQRThemeTokens(qrStyle.value, customStyle?.value);
    let svg = styledQrSvg({
      size: 1000,
      data: url.value || "https://qrbuddy.app",
      style: resolved,
      logoUrl: logoUrl.value,
    });
    const omitted = logoUrl.value && svg.includes('data-cutout="none"');
    if (frameConfig?.value?.enabled) {
      svg = createFramedSvg(svg, frameConfig.value.caption, {
        banner: bannerColors(frameConfig.value.theme, tokens.accent),
      });
    }

    const stopColors = resolved.dots.gradient?.colorStops?.map((s) =>
      s.color
    ) ??
      (resolved.dots.color ? [resolved.dots.color] : [tokens.accent]);
    const bgHex = resolved.background.color ??
      resolved.background.gradient?.colorStops?.[0]?.color ??
      "#FFF8F0";
    const lookMode = resolved.renderMode ?? "classic";
    const printMode = resolved.print ?? "clean";
    // Under riso the sheet is not the palette: the press picks its stock and its
    // two drums, so the warning has to describe those or it is just noise.
    const risoPaperHex = printMode === "riso"
      ? risoPaper(resolved.risoStock)
      : null;
    const paper = risoPaperHex ?? bgHex;
    // Only the data drum carries information; the spot is a design choice and
    // is allowed a lower floor, so it is not what the warning is about.
    const inks = printMode === "riso"
      ? [resolveRiso(stopColors, paper, resolved.risoInk)[0]]
      : stopColors;
    const contrast = evaluateQrContrast(inks, paper);
    const hasContrastIssue = contrast.inverted || contrast.lowContrast;
    const paletteName = resolvePaletteDisplayName(qrStyle.value, es);
    const lookBadge = lookMode === "halftone"
      ? (es ? "Semitono" : "Halftone")
      : lookMode === "foil"
      ? (es ? "Foil" : "Flat Foil")
      : null;
    const printBadge = lookMode !== "foil" && printMode !== "clean"
      ? (printMode === "riso" ? "Riso" : (es ? "Papel" : "Paper"))
      : null;

    return (
      <div
        class="shrink-0 px-4 sm:px-6 py-2.5 border-b-2 border-[#1e1714]/15 bg-[#f7ecdc]/75"
        data-design-preview
      >
        <div class="flex items-center gap-3.5">
          <div class="w-[112px] h-[112px] sm:w-[128px] sm:h-[128px] shrink-0 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-1.5 flex items-center justify-center shadow-[2px_2px_0_#1e1714]">
            <img
              src={toSvgDataUrl(svg)}
              alt={es
                ? "Vista previa del QR en vivo"
                : "Live QR design preview"}
              class="w-full h-full object-contain"
              width="120"
              height="120"
            />
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2.5 py-0.5 text-xs font-black text-[#1e1714]">
                <span
                  aria-hidden="true"
                  class="w-2.5 h-2.5 rounded-full border border-[#1e1714] shrink-0"
                  style={{ backgroundColor: tokens.accent }}
                />
                <span>{paletteName}</span>
              </span>

              {lookBadge && (
                <span class="inline-flex items-center rounded-full border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-2 py-0.5 text-[11px] font-black text-[#1e1714]">
                  {lookBadge}
                </span>
              )}

              {printBadge && (
                <span class="inline-flex items-center rounded-full border border-[#1e1714]/50 bg-[#fbf1e4] px-2 py-0.5 text-[11px] font-black text-[#1e1714]">
                  {printBadge}
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

            {omitted
              ? (
                <p class="text-[11px] font-bold text-amber-900" role="status">
                  {es
                    ? "QR denso: marca central omitida."
                    : "Dense QR: center mark omitted."}
                </p>
              )
              : (
                <p class="text-xs font-semibold text-[#574c44] leading-snug">
                  {es
                    ? "Exportación vectorial lista para pantalla e imprenta."
                    : "Vector crisp for screen & print export."}
                </p>
              )}

            {(onOpenCustomGradient || onReset) && (
              <div class="flex items-center gap-2 pt-0.5 flex-wrap">
                {onOpenCustomGradient && (
                  <button
                    type="button"
                    onClick={onOpenCustomGradient}
                    class="min-h-[32px] inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] px-3 py-1 text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] active:translate-y-[1px] transition-all"
                  >
                    <span>✦</span>
                    <span>{es ? "Estudio de color" : "Color studio"}</span>
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    onClick={onReset}
                    class="min-h-[32px] inline-flex items-center gap-1 rounded-xl border-2 border-[#1e1714]/25 hover:border-[#1e1714] bg-[#fffef7] px-2.5 py-1 text-xs font-black text-[#1e1714] transition-colors"
                  >
                    <span>↺</span>
                    <span>{es ? "Restablecer" : "Reset"}</span>
                  </button>
                )}
              </div>
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

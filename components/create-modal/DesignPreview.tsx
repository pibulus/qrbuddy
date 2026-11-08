import type { Signal } from "@preact/signals";
import type { FrameConfig, QRStyle } from "../../types/qr-types.ts";
import { bannerColors, resolveQRStyle } from "../../utils/qr-design.ts";
import { styledQrSvg } from "../../utils/qr-renderer.ts";
import { toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { createFramedSvg } from "../../utils/svg-export.ts";
import { getQRThemeTokens } from "../../utils/qr-styles.ts";

export default function DesignPreview(
  { url, qrStyle, customStyle, logoUrl, frameConfig, es }: {
    url: Signal<string>;
    qrStyle: Signal<string>;
    customStyle?: Signal<QRStyle | null>;
    logoUrl: Signal<string>;
    frameConfig?: Signal<FrameConfig | null>;
    es: boolean;
  },
) {
  try {
    let svg = styledQrSvg({
      size: 1000,
      data: url.value || "https://qrbuddy.app",
      style: resolveQRStyle(qrStyle.value, customStyle?.value),
      logoUrl: logoUrl.value,
    });
    const omitted = logoUrl.value && svg.includes('data-cutout="none"');
    if (frameConfig?.value?.enabled) {
      svg = createFramedSvg(svg, frameConfig.value.caption, {
        banner: bannerColors(
          frameConfig.value.theme,
          getQRThemeTokens(qrStyle.value, customStyle?.value).accent,
        ),
      });
    }
    return (
      <div
        class="shrink-0 flex flex-col items-center justify-center gap-1 py-2 border-b-2 border-[#1e1714]/10 bg-[#fbf1e4]"
        data-design-preview
      >
        <img
          src={toSvgDataUrl(svg)}
          alt={es ? "Vista previa del QR en vivo" : "Live QR design preview"}
          class="h-[168px] sm:h-[196px] max-w-full object-contain"
          width="196"
          height="196"
        />
        {omitted && (
          <p class="text-[11px] font-bold text-amber-800" role="status">
            {es
              ? "QR denso: marca central omitida."
              : "Dense QR: center mark omitted."}
          </p>
        )}
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

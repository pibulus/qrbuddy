import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import LogoUploader from "../LogoUploader.tsx";
import ChoiceRow from "./ChoiceRow.tsx";
import PalettePills, { PALETTE_PILL, pillState } from "./PalettePills.tsx";
import type { QRStyle } from "../../types/qr-types.ts";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface FrameConfig {
  enabled: boolean;
  caption: string;
}

interface DesignTabProps {
  url: Signal<string>;
  qrStyle: Signal<string>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<FrameConfig | null>;
  customStyle?: Signal<QRStyle | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
  onClose: () => void;
  lang?: Locale;
}

/** CreateModal's "Design" tab: palette pills, center logo, caption frame,
 * export options, and reset. Same card language as the other two tabs — no dashed boxes,
 * no tinted wrappers. */
export default function DesignTab(
  {
    url,
    qrStyle,
    logoUrl,
    frameConfig,
    customStyle,
    pngSize,
    onClose,
    lang,
  }: DesignTabProps,
) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const frameActive = frameConfig?.value?.enabled ?? false;
  const isCustom = qrStyle.value === "custom";
  const currentPngSize = pngSize?.value ?? 1000;
  const defaultFrameCaption = isSpanish ? "ESCANÉAME" : "SCAN ME";

  const exportAs = (format: "png" | "svg") => {
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", {
        detail: {
          format,
          size: currentPngSize,
        },
      }),
    );
    haptics.medium();
  };

  const handleResetDesign = () => {
    qrStyle.value = "sunset";
    if (customStyle) customStyle.value = null;
    logoUrl.value = "";
    if (frameConfig) frameConfig.value = null;
    if (pngSize) pngSize.value = 1000;

    resetDesignPreferences();
    globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
    haptics.light();
    addToast(
      isSpanish
        ? "Diseño restablecido al original ↺"
        : "Design reset to default ↺",
    );
  };

  return (
    <div class="space-y-5">
      {/* Palette — one wrapping row of pills, custom rides in the same row */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          {isSpanish ? "Paleta" : "Palette"}
        </h3>
        <PalettePills
          value={qrStyle.value}
          onChange={(key) => (qrStyle.value = key)}
          lang={locale}
          trailing={
            <button
              type="button"
              aria-pressed={isCustom}
              onClick={() => {
                onClose();
                globalThis.dispatchEvent(
                  new CustomEvent("open-gradient-creator"),
                );
                haptics.light();
              }}
              class={`${PALETTE_PILL} ${pillState(isCustom)}`}
            >
              {isSpanish ? "🎨 Degradado propio…" : "🎨 Custom gradient…"}
            </button>
          }
        />
      </section>

      {/* Logo + frame: two cards in the same language as the Content tab */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Extras
        </h3>
        <LogoUploader logoUrl={logoUrl} lang={locale} />
        {frameConfig && (
          <>
            <ChoiceRow
              icon="🔲"
              title={isSpanish ? "Marco para imprimir" : "Print frame"}
              description={isSpanish
                ? `Borde grueso con "${
                  frameConfig.value?.caption || defaultFrameCaption
                }" integrado en la descarga.`
                : `Chunky border with "${
                  frameConfig.value?.caption || "SCAN ME"
                }" baked into the download.`}
              active={frameActive}
              onClick={() => {
                frameConfig.value = frameActive
                  ? null
                  : { enabled: true, caption: defaultFrameCaption };
                haptics.light();
              }}
            />
            {frameActive && (
              <input
                type="text"
                value={frameConfig.value?.caption ?? ""}
                maxLength={24}
                onInput={(e) => {
                  frameConfig.value = {
                    enabled: true,
                    caption: (e.target as HTMLInputElement).value,
                  };
                }}
                placeholder={defaultFrameCaption}
                aria-label={isSpanish ? "Texto del marco" : "Frame caption"}
                class="w-full px-4 py-3 border-2 border-black rounded-2xl bg-white text-lg font-black uppercase tracking-wide focus:border-qr-pop focus:outline-none transition-colors animate-slide-down"
              />
            )}
          </>
        )}
      </section>

      {/* Export */}
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
            {isSpanish ? "Descargar" : "Download"}
          </h3>
          {/* PNG Size selector */}
          <div
            class="flex items-center gap-1 bg-amber-50 p-1 rounded-full border-2 border-black/15"
            role="group"
            aria-label={isSpanish
              ? "Tamaño de exportación PNG"
              : "PNG export size"}
          >
            {([1000, 2000, 3000] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  if (pngSize) pngSize.value = size;
                  haptics.light();
                }}
                aria-pressed={currentPngSize === size}
                class={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
                  currentPngSize === size
                    ? "bg-amber-200 border-2 border-black text-black shadow-chunky"
                    : "text-neutral-600 hover:text-black border-2 border-transparent"
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportAs("png")}
            class="min-h-[48px] rounded-full border-2 border-black bg-black px-4 font-black text-white shadow-chunky hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⬇ PNG
          </button>
          <button
            type="button"
            onClick={() => exportAs("svg")}
            class="min-h-[48px] rounded-full border-2 border-black bg-white px-4 font-black text-black shadow-chunky hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⬇ SVG
          </button>
        </div>
        <button
          type="button"
          onClick={async () => {
            const { qrToTextArt } = await import("../../utils/qr-ascii.ts");
            const art = qrToTextArt(url.value || "https://qrbuddy.app");
            if (!art) {
              addToast(
                isSpanish
                  ? "Demasiados datos para arte de texto 😅"
                  : "Too much data for text art 😅",
              );
              return;
            }
            try {
              await navigator.clipboard.writeText(art);
              haptics.success();
              addToast(
                isSpanish
                  ? "QR en arte de texto copiado — pégalo donde quieras 📋"
                  : "Text-art QR copied — paste it anywhere 📋",
              );
            } catch {
              addToast(
                isSpanish
                  ? "No se pudo copiar al portapapeles 😞"
                  : "Couldn't reach the clipboard 😞",
              );
            }
          }}
          class="w-full min-h-[44px] rounded-full border-2 border-black/15 bg-white px-4 text-sm font-bold font-mono text-neutral-700 hover:border-black/60 hover:text-black transition-all"
        >
          {isSpanish ? "▀▄█ Copiar como arte de texto" : "▀▄█ Copy as text art"}
        </button>

        {/* Reset design action */}
        <div class="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleResetDesign}
            class="min-h-[44px] px-4 py-2 rounded-full border-2 border-black/15 bg-white text-xs font-black text-neutral-600 hover:border-black/60 hover:text-black active:scale-95 transition-all flex items-center justify-center gap-1.5"
            aria-label={isSpanish
              ? "Restablecer diseño original"
              : "Reset design to default"}
          >
            {isSpanish ? "↺ Restablecer diseño" : "↺ Reset design"}
          </button>
        </div>
      </section>
    </div>
  );
}

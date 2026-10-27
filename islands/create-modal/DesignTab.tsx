import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { addToast } from "../ToastManager.tsx";
import LogoUploader from "../LogoUploader.tsx";
import ChoiceRow from "./ChoiceRow.tsx";
import PalettePills from "./PalettePills.tsx";
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

/** CreateModal's "Design" tab: balanced 4×2 palette grid, center logo,
 * caption frame, and compact 1-row export controls. */
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
    sounds.toggleOff?.();
    addToast(
      isSpanish
        ? "Diseño restablecido al original ↺"
        : "Design reset to default ↺",
    );
  };

  return (
    <div class="space-y-4">
      {/* Palette — balanced 4×2 grid + Custom gradient pill in header */}
      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
            {isSpanish ? "Paleta" : "Palette"}
          </h3>
          <button
            type="button"
            aria-pressed={isCustom}
            onClick={() => {
              onClose();
              globalThis.dispatchEvent(
                new CustomEvent("open-gradient-creator"),
              );
              haptics.light();
              sounds.click();
            }}
            class={`min-h-[32px] inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isCustom
                ? "border-[#1e1714] bg-amber-200 text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                : "border-[#1e1714]/20 bg-[#fffef7] text-[#1e1714] hover:border-[#1e1714]"
            }`}
          >
            {isSpanish ? "🎨 Degradado propio →" : "🎨 Custom gradient →"}
          </button>
        </div>
        <PalettePills
          value={qrStyle.value}
          onChange={(key) => (qrStyle.value = key)}
          lang={locale}
        />
      </section>

      {/* Logo + frame */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Extras
        </h3>
        <LogoUploader logoUrl={logoUrl} lang={locale} />
        {frameConfig && (
          <div class="space-y-2">
            <ChoiceRow
              icon="🔲"
              title={isSpanish ? "Marco para imprimir" : "Print frame"}
              description={isSpanish
                ? `Borde grueso con "${
                  frameConfig.value?.caption || defaultFrameCaption
                }" integrado.`
                : `Chunky border with "${
                  frameConfig.value?.caption || "SCAN ME"
                }" baked in.`}
              active={frameActive}
              badge={frameActive
                ? (frameConfig.value?.caption || defaultFrameCaption)
                : undefined}
              onClick={() => {
                frameConfig.value = frameActive
                  ? null
                  : { enabled: true, caption: defaultFrameCaption };
                haptics.light();
                sounds.click();
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
                class="w-full px-3.5 py-2 border-2 border-[#1e1714] rounded-2xl bg-[#fffef7] text-sm font-black uppercase tracking-wide focus:border-[#ec4899] focus:outline-none transition-colors animate-slide-down"
              />
            )}
          </div>
        )}
      </section>

      {/* Export — 1 header row + 1 action row */}
      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
            {isSpanish ? "Descargar" : "Download"}
          </h3>
          <div class="flex items-center gap-1.5">
            <div
              class="flex items-center gap-0.5 bg-amber-50 p-0.5 rounded-full border-2 border-[#1e1714]/15"
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
                    sounds.click();
                  }}
                  aria-pressed={currentPngSize === size}
                  class={`px-2 py-0.5 rounded-full text-[11px] font-black transition-all ${
                    currentPngSize === size
                      ? "bg-amber-200 border border-[#1e1714] text-[#1e1714]"
                      : "text-neutral-600 hover:text-[#1e1714] border border-transparent"
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleResetDesign}
              class="min-h-[30px] px-2.5 py-0.5 rounded-full border-2 border-[#1e1714]/15 bg-[#fffef7] text-[11px] font-black text-neutral-600 hover:border-[#1e1714] hover:text-[#1e1714] active:scale-95 transition-all"
              aria-label={isSpanish
                ? "Restablecer diseño original"
                : "Reset design to default"}
            >
              {isSpanish ? "↺ Reset" : "↺ Reset"}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => exportAs("png")}
            class="min-h-[44px] rounded-2xl border-2 border-[#1e1714] bg-[#1e1714] px-3 text-sm font-black text-[#fffef7] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            ⬇ PNG
          </button>
          <button
            type="button"
            onClick={() => exportAs("svg")}
            class="min-h-[44px] rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] px-3 text-sm font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            ⬇ SVG
          </button>
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
                sounds.copy();
                addToast(
                  isSpanish
                    ? "QR en arte de texto copiado 📋"
                    : "Text-art QR copied 📋",
                );
              } catch {
                addToast(
                  isSpanish
                    ? "No se pudo copiar al portapapeles 😞"
                    : "Couldn't reach the clipboard 😞",
                );
              }
            }}
            class="min-h-[44px] rounded-2xl border-2 border-[#1e1714]/20 bg-[#fffef7] px-2 text-xs font-black font-mono text-[#1e1714] hover:border-[#1e1714] transition-all truncate"
          >
            {isSpanish ? "▀▄█ Texto" : "▀▄█ Text art"}
          </button>
        </div>
      </section>
    </div>
  );
}

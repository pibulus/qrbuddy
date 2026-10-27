import type { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { QR_STYLES } from "../../utils/qr-styles.ts";
import { addToast } from "../ToastManager.tsx";
import LogoUploader from "../LogoUploader.tsx";
import { STYLE_DISPLAY } from "../StyleSelector.tsx";
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

const MINI_QR_PATTERN = [
  1,
  1,
  1,
  0,
  1,
  1,
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  1,
  0,
  1,
  0,
  1,
  1,
  0,
  1,
  1,
];

function getDotShapeLabel(shape: string | undefined, isSpanish: boolean) {
  switch (shape) {
    case "dots":
      return isSpanish ? "Puntos circulares" : "Circle dots";
    case "extra-rounded":
      return isSpanish ? "Puntos suaves" : "Soft-pill dots";
    case "classy":
    case "classy-rounded":
      return isSpanish ? "Corte diamante" : "Diamond-cut dots";
    case "square":
      return isSpanish ? "Cuadros nítidos" : "Crisp squares";
    default:
      return isSpanish ? "Puntos redondeados" : "Rounded dots";
  }
}

function getDotRadiusClass(shape: string | undefined) {
  switch (shape) {
    case "dots":
      return "rounded-full";
    case "square":
      return "rounded-none";
    case "classy":
      return "rounded-[1px]";
    default:
      return "rounded-[2.5px]";
  }
}

/** CreateModal's "Design" tab: live vibe preview strip, palette pills, center
 * logo, caption frame, export options, and reset. */
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
  const frameCaption = frameConfig?.value?.caption ||
    (isSpanish ? "ESCANÉAME" : "SCAN ME");
  const isCustom = qrStyle.value === "custom";
  const currentPngSize = pngSize?.value ?? 1000;
  const defaultFrameCaption = isSpanish ? "ESCANÉAME" : "SCAN ME";

  const [isPopping, setIsPopping] = useState(false);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setIsPopping(true);
    const timer = setTimeout(() => setIsPopping(false), 300);
    return () => clearTimeout(timer);
  }, [qrStyle.value, logoUrl.value, frameActive, frameConfig?.value?.caption]);

  const presetInfo =
    STYLE_DISPLAY[qrStyle.value as keyof typeof STYLE_DISPLAY] ??
      STYLE_DISPLAY.sunset;
  const presetStyle = QR_STYLES[qrStyle.value as keyof typeof QR_STYLES];

  const customStopColors = isCustom && customStyle?.value &&
      "gradient" in customStyle.value.dots &&
      customStyle.value.dots.gradient
    ? customStyle.value.dots.gradient.colorStops.map((s) => s.color)
    : null;

  const activeColors = customStopColors && customStopColors.length > 0
    ? customStopColors
    : isCustom
    ? ["#9370DB", "#FF69B4"]
    : presetInfo.colors;

  const activeGradient = `linear-gradient(135deg, ${activeColors.join(", ")})`;

  const activeBg = !isCustom && presetStyle &&
      "gradient" in presetStyle.background &&
      presetStyle.background.gradient
    ? `linear-gradient(135deg, ${
      presetStyle.background.gradient.colorStops.map((s) => s.color).join(", ")
    })`
    : !isCustom && presetStyle && "color" in presetStyle.background
    ? presetStyle.background.color
    : "#FFF8F0";

  const dotShape = !isCustom && presetStyle && "shape" in presetStyle.dots
    ? presetStyle.dots.shape
    : "rounded";

  const activeStyleName = isCustom
    ? (isSpanish ? "Degradado propio" : "Custom gradient")
    : (isSpanish ? (presetInfo.nameEs ?? presetInfo.name) : presetInfo.name);

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
      {/* Live Vibe Preview Header Strip — immediate visual feedback while modal covers the main QR canvas */}
      <div
        class={`bg-white border-2 border-black rounded-2xl p-3 shadow-chunky flex items-center gap-3.5 transition-transform ${
          isPopping ? "animate-pop" : ""
        }`}
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-col items-center shrink-0">
          <div
            class="w-14 h-14 rounded-xl border-2 border-black p-1.5 flex items-center justify-center relative overflow-hidden shadow-sm"
            style={{ background: activeBg }}
          >
            <div class="grid grid-cols-5 gap-0.5 w-full h-full">
              {MINI_QR_PATTERN.map((cell, idx) => (
                <span
                  key={idx}
                  class={`${getDotRadiusClass(dotShape)} transition-all ${
                    cell ? "opacity-100" : "opacity-15"
                  }`}
                  style={{
                    background: cell ? activeGradient : "transparent",
                  }}
                />
              ))}
            </div>
            {logoUrl.value && (
              <img
                src={logoUrl.value}
                alt=""
                class="absolute inset-0 m-auto w-6 h-6 rounded-md border-2 border-black bg-white object-contain shadow-sm"
              />
            )}
          </div>
          {frameActive && (
            <span class="-mt-1.5 z-10 px-1.5 py-0.5 rounded-md border border-black bg-black text-white text-[9px] font-black uppercase tracking-wider leading-none max-w-[72px] truncate">
              {frameCaption}
            </span>
          )}
        </div>

        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="w-3.5 h-3.5 rounded-full border-2 border-black shrink-0"
              style={{ background: activeGradient }}
            />
            <span class="font-black text-sm text-black leading-tight truncate">
              {activeStyleName}
            </span>
            <span class="inline-flex items-center rounded-full bg-amber-100 border border-black/20 px-2 py-0.5 text-[11px] font-bold text-neutral-800">
              {getDotShapeLabel(dotShape, isSpanish)}
            </span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap text-xs font-bold text-neutral-600">
            {logoUrl.value
              ? (
                <span class="inline-flex items-center gap-1 rounded-full bg-amber-200 border border-black px-2 py-0.5 text-[11px] font-black text-black">
                  <img
                    src={logoUrl.value}
                    alt=""
                    class="w-3.5 h-3.5 rounded-sm object-contain bg-white border border-black/30"
                  />
                  {isSpanish ? "Logo activo" : "Logo active"}
                </span>
              )
              : (
                <span>
                  {isSpanish ? "Sin logo central" : "No center logo"}
                </span>
              )}
            <span aria-hidden="true">·</span>
            {frameActive
              ? (
                <span class="inline-flex items-center gap-1 rounded-full bg-amber-200 border border-black px-2 py-0.5 text-[11px] font-black text-black max-w-[160px] truncate">
                  🔲 {frameCaption}
                </span>
              )
              : (
                <span>
                  {isSpanish ? "Sin marco" : "No frame"}
                </span>
              )}
          </div>
        </div>
      </div>

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
                sounds.click();
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
                  sounds.click();
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
              sounds.copy();
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

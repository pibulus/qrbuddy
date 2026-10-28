import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import LogoUploader from "../LogoUploader.tsx";
import ChoiceRow from "./ChoiceRow.tsx";
import PalettePills from "./PalettePills.tsx";
import type {
  CornerDotShape,
  CornerSquareShape,
  DotShape,
  QRStyle,
} from "../../types/qr-types.ts";
import { QR_STYLES } from "../../utils/qr-styles.ts";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const DOT_SHAPES: ReadonlyArray<{
  id: DotShape;
  glyph: string;
  labelEn: string;
  labelEs: string;
}> = [
  { id: "rounded", glyph: "▢", labelEn: "Soft", labelEs: "Suave" },
  { id: "dots", glyph: "●", labelEn: "Dots", labelEs: "Puntos" },
  { id: "classy-rounded", glyph: "◐", labelEn: "Petal", labelEs: "Pétalo" },
  { id: "classy", glyph: "◆", labelEn: "Gem", labelEs: "Gema" },
  { id: "square", glyph: "■", labelEn: "Pixel", labelEs: "Píxel" },
];

const EYE_SHAPES: ReadonlyArray<{
  id: CornerSquareShape;
  dot: CornerDotShape;
  labelEn: string;
  labelEs: string;
}> = [
  {
    id: "extra-rounded",
    dot: "dot",
    labelEn: "Soft Eye",
    labelEs: "Ojo suave",
  },
  { id: "dot", dot: "dot", labelEn: "Circle Eye", labelEs: "Ojo circular" },
  { id: "square", dot: "square", labelEn: "Sharp Eye", labelEs: "Ojo recto" },
];

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
    url: _url,
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
  const defaultFrameCaption = isSpanish ? "ESCANÉAME" : "SCAN ME";

  const activePreset = (QR_STYLES[qrStyle.value as keyof typeof QR_STYLES] ??
    QR_STYLES.sunset) as QRStyle;
  const activeDotShape: DotShape = customStyle?.value?.dots?.shape ??
    activePreset.dots?.shape ??
    "rounded";
  const activeEyeShape: CornerSquareShape =
    (customStyle?.value?.cornersSquare?.shape as
      | CornerSquareShape
      | undefined) ??
      (activePreset.cornersSquare?.shape as CornerSquareShape | undefined) ??
      "extra-rounded";

  const applyShapeOverride = (
    nextDot?: DotShape,
    nextEye?: CornerSquareShape,
    nextEyeDot?: CornerDotShape,
  ) => {
    if (!customStyle) return;
    const base = isCustom && customStyle.value
      ? customStyle.value
      : activePreset;
    const dotShape = nextDot ?? activeDotShape;
    const eyeShape = nextEye ?? activeEyeShape;
    const eyeDotShape: CornerDotShape = nextEyeDot ??
      (eyeShape === "square" ? "square" : "dot");
    customStyle.value = {
      ...base,
      dots: {
        ...base.dots,
        shape: dotShape,
      },
      cornersSquare: {
        ...(base.cornersSquare ?? {}),
        shape: eyeShape,
      },
      cornersDot: {
        ...(base.cornersDot ?? {}),
        shape: eyeDotShape,
      },
    };
    haptics.light();
    sounds.click();
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
      {/* Palette — balanced 3×2 grid + Custom gradient + Reset pill in header */}
      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
            {isSpanish ? "Paleta" : "Palette"}
          </h3>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetDesign}
              class="min-h-[32px] px-2.5 py-1 rounded-full border-2 border-[#1e1714]/15 bg-[#fffef7] text-xs font-black text-neutral-600 hover:border-[#1e1714] hover:text-[#1e1714] active:scale-95 transition-all whitespace-nowrap"
              aria-label={isSpanish
                ? "Restablecer diseño original"
                : "Reset design to default"}
            >
              {isSpanish ? "↺ Reset" : "↺ Reset"}
            </button>
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
              class={`min-h-[32px] inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-black transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${
                isCustom
                  ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                  : "border-[#1e1714]/20 bg-[#fffef7] text-[#1e1714] hover:border-[#1e1714]"
              }`}
            >
              {isSpanish ? "🎨 Propio →" : "🎨 Custom →"}
            </button>
          </div>
        </div>
        <PalettePills
          value={qrStyle.value}
          onChange={(key) => {
            qrStyle.value = key;
            if (customStyle) customStyle.value = null;
          }}
          lang={locale}
        />
      </section>

      {/* Module & Eye Shape Picker */}
      {customStyle && (
        <section class="space-y-2">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500 whitespace-nowrap">
              {isSpanish ? "Forma y Ojos" : "Shape & Eyes"}
            </h3>
            <div
              class="inline-flex items-center gap-0.5 bg-[#fbf1e4] p-0.5 rounded-full border-2 border-[#1e1714]/15"
              role="group"
              aria-label={isSpanish ? "Forma de esquinas" : "Corner eye shape"}
            >
              {EYE_SHAPES.map((eye) => {
                const active = activeEyeShape === eye.id;
                return (
                  <button
                    key={eye.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      applyShapeOverride(undefined, eye.id, eye.dot)}
                    class={`px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${
                      active
                        ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] border border-[#1e1714] text-[#1e1714]"
                        : "text-neutral-600 hover:text-[#1e1714] border border-transparent"
                    }`}
                  >
                    {isSpanish ? eye.labelEs : eye.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            class="grid grid-cols-5 gap-1.5"
            role="group"
            aria-label={isSpanish ? "Forma de módulos" : "Module dot shape"}
          >
            {DOT_SHAPES.map((shape) => {
              const active = activeDotShape === shape.id ||
                (shape.id === "rounded" && activeDotShape === "extra-rounded");
              return (
                <button
                  key={shape.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyShapeOverride(shape.id)}
                  class={`min-h-[38px] rounded-xl border-2 px-1.5 py-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-black whitespace-nowrap transition-all ${
                    active
                      ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                      : "border-[#1e1714]/15 bg-[#fffef7] text-neutral-700 hover:border-[#1e1714]"
                  }`}
                >
                  <span class="text-xs leading-none" aria-hidden="true">
                    {shape.glyph}
                  </span>
                  <span>{isSpanish ? shape.labelEs : shape.labelEn}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Logo + frame */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Extras
        </h3>
        <LogoUploader logoUrl={logoUrl} lang={locale} />
        {frameConfig && (
          <ChoiceRow
            icon="🔲"
            title={isSpanish ? "Marco para imprimir" : "Print frame"}
            active={frameActive}
            accordion
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
          >
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
                class="w-full px-3.5 py-2 border-2 border-[#1e1714] rounded-xl bg-[#fffef7] text-sm font-black uppercase tracking-wide focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none transition-colors"
              />
            )}
          </ChoiceRow>
        )}
      </section>
    </div>
  );
}

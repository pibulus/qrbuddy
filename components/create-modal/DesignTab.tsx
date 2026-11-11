import { type Signal, useSignal } from "@preact/signals";
import { useEffect, useMemo, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import GradientCreator from "../GradientCreator.tsx";
import LogoUploader from "../LogoUploader.tsx";
import PalettePills, { pillState } from "./PalettePills.tsx";
import type {
  BannerTheme,
  FrameConfig,
  QRStyle,
} from "../../types/qr-types.ts";
import {
  BANNER_THEMES,
  bannerColors,
  resolveQRStyle,
  STAMPS,
  stampUrl,
} from "../../utils/qr-design.ts";
import { toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
import { getQRThemeTokens } from "../../utils/qr-styles.ts";
import {
  estimateMinPrintSize,
  measureQrModules,
} from "../../islands/QRCanvas.tsx";
import { STYLE_DISPLAY } from "../../islands/StyleSelector.tsx";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface DesignTabProps {
  url: Signal<string>;
  qrStyle: Signal<string>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<FrameConfig | null>;
  customStyle?: Signal<QRStyle | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
  onClose: () => void;
  onOpenCustomGradient?: () => void;
  lang?: Locale;
}

const KEY =
  "min-h-[40px] rounded-xl px-1.5 text-xs font-black transition-[transform,box-shadow,border-color] duration-[70ms] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]";

const LEGACY_STYLE_NAMES: Record<string, { name: string; nameEs: string }> = {
  blush: { name: "Crimson", nameEs: "Carmesí" },
  grape: { name: "Cosmic", nameEs: "Cósmico" },
  candy: { name: "Candy", nameEs: "Dulce" },
  terminal: { name: "Matrix", nameEs: "Matrix" },
};

const MONOGRAM_DATA_PREFIX = "data:image/svg+xml;base64,";

export const QUICK_LABEL_CHIPS = [
  { en: "Scan Me", es: "Escanéame" },
  { en: "Menu", es: "Menú" },
  { en: "Wi-Fi", es: "Wi-Fi" },
  { en: "Guest Pass", es: "Acceso" },
] as const;

export function resolvePaletteDisplayName(
  styleKey: string,
  es = false,
): string {
  if (styleKey === "custom") {
    return es ? "Propio" : "Custom";
  }
  const preset = STYLE_DISPLAY[styleKey as keyof typeof STYLE_DISPLAY] ??
    LEGACY_STYLE_NAMES[styleKey] ??
    STYLE_DISPLAY.sunset;
  return es ? (preset.nameEs ?? preset.name) : preset.name;
}

export function decodeMonogramFromLogoUrl(rawLogoUrl: string): string {
  if (!rawLogoUrl || !rawLogoUrl.startsWith(MONOGRAM_DATA_PREFIX)) return "";
  try {
    const binary = atob(rawLogoUrl.slice(MONOGRAM_DATA_PREFIX.length));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const svg = new TextDecoder().decode(bytes);
    const match = svg.match(/<text[^>]*>([^<]+)<\/text>/i);
    if (!match) return "";
    return match[1]
      .replace(/[^\p{L}\p{N}]/gu, "")
      .slice(0, 3)
      .toUpperCase();
  } catch {
    return "";
  }
}

/** Three sections, one grid each: palette (7), centre mark (5+2), label (1+4), plus PNG size. */
export default function DesignTab(
  {
    url,
    qrStyle,
    logoUrl,
    frameConfig,
    customStyle,
    pngSize,
    onOpenCustomGradient,
    lang,
  }: DesignTabProps,
) {
  const locale = getClientLocale(lang);
  const es = locale === "es";
  const current = resolveQRStyle(qrStyle.value, customStyle?.value);
  const [monogram, setMonogram] = useState(() =>
    decodeMonogramFromLogoUrl(logoUrl.value)
  );
  const localGradientOpen = useSignal(false);

  useEffect(() => {
    setMonogram(decodeMonogramFromLogoUrl(logoUrl.value));
  }, [logoUrl.value]);

  const tap = () => {
    haptics.light();
    sounds.click();
  };
  const paletteName = resolvePaletteDisplayName(qrStyle.value, es);
  const accent = getQRThemeTokens(qrStyle.value, customStyle?.value).accent;

  const { moduleCount, printSpec } = useMemo(() => {
    const resolved = resolveQRStyle(qrStyle.value, customStyle?.value);
    const modules = measureQrModules(url.value || "https://qrbuddy.app", {
      logoUrl: logoUrl.value,
      dotShape: resolved.dots?.shape,
    });
    return {
      moduleCount: modules,
      printSpec: estimateMinPrintSize(modules),
    };
  }, [url.value, logoUrl.value, qrStyle.value, customStyle?.value]);
  const minInchesText = printSpec.minInches.toFixed(1);

  const caption = frameConfig?.value?.enabled
    ? frameConfig.value.caption.trim()
    : "";
  const theme: BannerTheme = frameConfig?.value?.theme ?? "accent";
  const banner = bannerColors(theme, accent);

  const writeCaption = (next: string) => {
    if (!frameConfig) return;
    const clean = next.slice(0, 24);
    frameConfig.value = clean.trim() === ""
      ? null
      : { enabled: true, caption: clean, theme };
  };
  const cycleBanner = () => {
    if (!frameConfig) return;
    const i = BANNER_THEMES.indexOf(theme);
    frameConfig.value = {
      enabled: true,
      caption,
      theme: BANNER_THEMES[(i + 1) % BANNER_THEMES.length],
    };
    tap();
  };

  const setMark = (markUrl: string, shape: "circle" | "squircle") => {
    if (customStyle) {
      customStyle.value = { ...current, centerShape: shape };
    }
    logoUrl.value = markUrl;
    tap();
  };

  const reset = () => {
    qrStyle.value = "sunset";
    if (customStyle) customStyle.value = null;
    logoUrl.value = "";
    if (frameConfig) frameConfig.value = null;
    if (pngSize) pngSize.value = 1000;
    setMonogram("");
    resetDesignPreferences();
    globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
    tap();
  };

  const customActive = qrStyle.value === "custom";

  return (
    <div class="space-y-3 text-[#1e1714]">
      <section class="space-y-1.5" aria-label={es ? "Paleta" : "Palette"}>
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs sm:text-[13px] leading-none font-black truncate">
            {es ? "Paleta" : "Palette"}{" "}
            <span class="opacity-50">· {paletteName}</span>
          </h3>
          <button
            type="button"
            onClick={reset}
            class="shrink-0 -my-1.5 min-h-[32px] px-1 rounded-md text-xs font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
            aria-label={es
              ? "Restablecer diseño original"
              : "Reset design to default"}
          >
            ↺ Reset
          </button>
        </div>
        <PalettePills
          swatches
          value={qrStyle.value}
          onChange={(key) => {
            qrStyle.value = key;
          }}
          lang={locale}
          trailing={
            <button
              type="button"
              aria-pressed={customActive}
              onClick={() => {
                if (onOpenCustomGradient) {
                  onOpenCustomGradient();
                } else {
                  localGradientOpen.value = true;
                }
                tap();
              }}
              aria-label={es ? "Colores propios" : "Custom colours"}
              title={es ? "Colores propios" : "Custom colours"}
              class={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#fffef7] text-base font-black active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4] ${
                customActive
                  ? "border-2 border-[#1e1714] ring-2 ring-[#1e1714] ring-offset-2 ring-offset-[#fbf1e4] scale-105"
                  : "border-[1.5px] border-[#1e1714]/[0.28] hover:border-[#1e1714]"
              }`}
            >
              +
            </button>
          }
        />
      </section>

      <section
        class="space-y-1.5"
        aria-label={es ? "Marca central" : "Center mark"}
      >
        <h3 class="text-xs sm:text-[13px] leading-none font-black">
          {es ? "Marca central" : "Center mark"}
        </h3>
        <div class="grid grid-cols-5 gap-2">
          {STAMPS.map((stamp) => {
            const active = logoUrl.value === stampUrl(stamp.path);
            return (
              <button
                key={stamp.id}
                type="button"
                aria-label={es ? stamp.es : stamp.en}
                title={es ? stamp.es : stamp.en}
                aria-pressed={active}
                class={`${KEY} flex items-center justify-center ${
                  pillState(active)
                }`}
                onClick={() => {
                  globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
                  setMonogram("");
                  setMark(active ? "" : stampUrl(stamp.path), "circle");
                }}
              >
                <img src={stampUrl(stamp.path)} alt="" width="22" height="22" />
              </button>
            );
          })}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <LogoUploader
            logoUrl={logoUrl}
            lang={locale}
            compact
            compactLabel={/^data:image\/(png|jpeg|webp)/.test(logoUrl.value)
              ? (es ? "Cambiar logo" : "Replace logo")
              : (es ? "Subir logo" : "Upload logo")}
            onPicked={() => {
              setMonogram("");
              setMark(logoUrl.value, "squircle");
            }}
          />
          <div
            class={`flex items-center min-w-0 min-h-[44px] rounded-xl bg-[#fffef7] transition-colors focus-within:ring-2 focus-within:ring-[#1e1714] focus-within:ring-offset-2 focus-within:ring-offset-[#fbf1e4] ${
              logoUrl.value || monogram
                ? "border-2 border-[#1e1714]"
                : "border-[1.5px] border-[#1e1714]/[0.28] focus-within:border-2 focus-within:border-[#1e1714]"
            }`}
          >
            <span class="pl-2.5 text-[10px] font-black opacity-50">
              Aa
            </span>
            <input
              type="text"
              maxLength={3}
              value={monogram}
              placeholder="VIP"
              aria-label={es
                ? "Texto de la marca, hasta 3 caracteres"
                : "Monogram, up to 3 characters"}
              class="min-w-0 flex-1 bg-transparent px-1 text-sm font-black uppercase focus:outline-none"
              onInput={(e) => {
                const value = e.currentTarget.value.replace(
                  /[^\p{L}\p{N}]/gu,
                  "",
                )
                  .slice(0, 3).toUpperCase();
                globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
                setMonogram(value);
                const svg =
                  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="64" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${
                    value.length === 3 ? 50 : 66
                  }" font-weight="900" fill="#1e1714">${value}</text></svg>`;
                setMark(value ? toSvgDataUrl(svg) : "", "circle");
              }}
            />
            {logoUrl.value && (
              <button
                type="button"
                onClick={() => {
                  logoUrl.value = "";
                  setMonogram("");
                  tap();
                }}
                aria-label={es ? "Quitar marca central" : "Clear center mark"}
                class="shrink-0 w-8 h-8 mr-1.5 rounded-full text-sm font-black hover:bg-[#1e1714]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {frameConfig && (
        <section
          class="space-y-1.5"
          aria-label={es ? "Etiqueta de la tarjeta" : "Card label"}
        >
          <h3 class="text-xs sm:text-[13px] leading-none font-black">
            {es ? "Etiqueta de la tarjeta" : "Card label"}
          </h3>
          <div
            class={`flex items-center min-h-[40px] rounded-xl bg-[#fffef7] transition-colors focus-within:ring-2 focus-within:ring-[#1e1714] focus-within:ring-offset-2 focus-within:ring-offset-[#fbf1e4] ${
              caption
                ? "border-2 border-[#1e1714] shadow-[0_2px_0_#1e1714]"
                : "border-[1.5px] border-[#1e1714]/[0.28] focus-within:border-2 focus-within:border-[#1e1714]"
            }`}
          >
            <input
              type="text"
              maxLength={24}
              value={caption}
              placeholder={es
                ? "Etiqueta opcional, ej. Escanéame"
                : "Optional label, e.g. Scan me"}
              aria-label={es ? "Etiqueta de la tarjeta" : "Card label"}
              class="min-w-0 flex-1 bg-transparent px-3 text-sm font-black focus:outline-none"
              onInput={(e) => writeCaption(e.currentTarget.value)}
            />
            <button
              type="button"
              data-banner-cycle
              onClick={cycleBanner}
              title={es
                ? `Franja: ${theme} — tocar para cambiar`
                : `Banner: ${theme} — tap to change`}
              aria-label={es
                ? `Franja: ${theme}. Cambiar estilo`
                : `Banner: ${theme}. Change style`}
              class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1"
            >
              <span
                aria-hidden="true"
                class="block w-6 h-6 rounded-full border-2 border-[#1e1714]"
                style={{ background: banner.bg }}
              />
            </button>
            {caption && (
              <button
                type="button"
                onClick={() => writeCaption("")}
                aria-label={es ? "Quitar etiqueta" : "Clear label"}
                class="shrink-0 w-9 h-9 mr-1 flex items-center justify-center rounded-full text-sm font-black hover:bg-[#1e1714]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1"
              >
                ✕
              </button>
            )}
          </div>
          <div
            class="flex flex-wrap gap-1.5"
            role="group"
            aria-label={es ? "Etiquetas rápidas" : "Quick labels"}
          >
            {QUICK_LABEL_CHIPS.map((chip) => {
              const label = es ? chip.es : chip.en;
              const chipActive = caption.toLowerCase() === label.toLowerCase();
              return (
                <button
                  key={chip.en}
                  type="button"
                  aria-pressed={chipActive}
                  onClick={() => {
                    writeCaption(chipActive ? "" : label);
                    tap();
                  }}
                  class={`min-h-[30px] inline-flex items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black transition-[transform,box-shadow,border-color] duration-[70ms] active:translate-y-[1.5px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1 ${
                    pillState(chipActive)
                  }`}
                >
                  {chipActive && (
                    <span
                      aria-hidden="true"
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {pngSize && (
        <section
          class="space-y-1.5"
          aria-label={es ? "Tamaño PNG" : "PNG size"}
        >
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="text-xs sm:text-[13px] leading-none font-black shrink-0">
              {es ? "Tamaño PNG" : "PNG size"}{" "}
              <span class="opacity-50">
                · {pngSize.value === 1000
                  ? (es ? "Pantalla" : "Screen")
                  : pngSize.value === 2000
                  ? (es ? "Imprenta" : "Print")
                  : (es ? "Gran formato" : "Large format")}
              </span>
            </h3>
            <span
              data-print-spec
              data-dense-warning={printSpec.denseWarning ? "true" : "false"}
              class={`text-[11px] font-bold leading-none tabular-nums truncate ${
                printSpec.denseWarning ? "text-amber-900" : "text-[#1e1714]/60"
              }`}
            >
              {es
                ? `${moduleCount}×${moduleCount} · Impresión mín. ${printSpec.minMm} mm (${minInchesText}″)`
                : `${moduleCount}×${moduleCount} · Min print ${printSpec.minMm} mm (${minInchesText}″)`}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2" role="group">
            {([
              { size: 1000, hint: es ? "Pantalla" : "Screen" },
              { size: 2000, hint: es ? "Imprenta" : "Print" },
              { size: 3000, hint: es ? "Gran formato" : "Large format" },
            ] as const).map(({ size, hint }) => {
              const active = pngSize.value === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  title={`${size}px · ${hint}`}
                  onClick={() => {
                    pngSize.value = size;
                    tap();
                  }}
                  class={`${KEY} flex items-center justify-center ${
                    pillState(active)
                  }`}
                >
                  {size}px
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!onOpenCustomGradient && (
        <GradientCreator
          isOpen={localGradientOpen}
          zIndexClass="z-[70]"
          lang={locale}
          onCustomGradient={(gradient) => {
            if (customStyle) {
              const prevShape = customStyle.value?.centerShape;
              customStyle.value = prevShape
                ? { ...gradient, centerShape: prevShape }
                : gradient;
            }
            qrStyle.value = "custom";
          }}
        />
      )}
    </div>
  );
}

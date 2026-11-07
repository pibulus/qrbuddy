import type { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import LogoUploader from "../LogoUploader.tsx";
import PalettePills, { pillState } from "./PalettePills.tsx";
import LookGallery from "./LookGallery.tsx";
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
  lang?: Locale;
}

const KEY =
  "min-h-[44px] rounded-xl px-1.5 text-xs font-black transition-[transform,box-shadow,border-color] duration-[70ms] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]";

/** Three sections, one grid each: palette (7), centre mark (5+2), label (1+4). */
export default function DesignTab(
  { url, qrStyle, logoUrl, frameConfig, customStyle, pngSize, onClose, lang }:
    DesignTabProps,
) {
  const locale = getClientLocale(lang);
  const es = locale === "es";
  const current = resolveQRStyle(qrStyle.value, customStyle?.value);
  const [monogram, setMonogram] = useState("");
  const tap = () => {
    haptics.light();
    sounds.click();
  };
  const palette = STYLE_DISPLAY[qrStyle.value as keyof typeof STYLE_DISPLAY] ??
    STYLE_DISPLAY.sunset;
  const paletteName = es ? (palette.nameEs ?? palette.name) : palette.name;
  const accent = getQRThemeTokens(qrStyle.value, customStyle?.value).accent;

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

  const setMark = (url: string, shape: "circle" | "squircle") => {
    if (customStyle) {
      customStyle.value = { ...current, centerShape: shape };
    }
    logoUrl.value = url;
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

  return (
    <div class="space-y-5 text-[#1e1714]">
      <LookGallery
        url={url}
        qrStyle={qrStyle}
        customStyle={customStyle}
        logoUrl={logoUrl}
        lang={locale}
      />

      <section class="space-y-2.5" aria-label={es ? "Paleta" : "Palette"}>
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-black truncate">
            {es ? "Paleta" : "Palette"}{" "}
            <span class="opacity-50">· {paletteName}</span>
          </h3>
          <button
            type="button"
            onClick={reset}
            class="shrink-0 min-h-[32px] px-1 rounded-md text-xs font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
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
              onClick={() => {
                onClose();
                globalThis.dispatchEvent(
                  new CustomEvent("open-gradient-creator"),
                );
                tap();
              }}
              aria-label={es ? "Colores propios" : "Custom colours"}
              title={es ? "Colores propios" : "Custom colours"}
              class="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[1.5px] border-[#1e1714]/[0.28] bg-[#fffef7] text-base font-black hover:border-[#1e1714] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
            >
              +
            </button>
          }
        />
      </section>

      <section
        class="space-y-2.5"
        aria-label={es ? "Marca central" : "Center mark"}
      >
        <h3 class="text-sm font-black">
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
          class="space-y-2.5"
          aria-label={es ? "Etiqueta de la tarjeta" : "Card label"}
        >
          <h3 class="text-sm font-black">
            {es ? "Etiqueta de la tarjeta" : "Card label"}
          </h3>
          <div
            class={`flex items-center min-h-[44px] rounded-xl bg-[#fffef7] transition-colors focus-within:ring-2 focus-within:ring-[#1e1714] focus-within:ring-offset-2 focus-within:ring-offset-[#fbf1e4] ${
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
              class="shrink-0 w-11 h-11 flex items-center justify-center rounded-full mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1"
            >
              <span
                aria-hidden="true"
                class="block w-7 h-7 rounded-full border-2 border-[#1e1714]"
                style={{ background: banner.bg }}
              />
            </button>
            {caption && (
              <button
                type="button"
                onClick={() => writeCaption("")}
                aria-label={es ? "Quitar etiqueta" : "Clear label"}
                class="shrink-0 w-11 h-11 mr-1 flex items-center justify-center rounded-full text-sm font-black hover:bg-[#1e1714]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-1"
              >
                ✕
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

import type { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import LogoUploader from "../LogoUploader.tsx";
import PalettePills, { pillState } from "./PalettePills.tsx";
import type { QRStyle } from "../../types/qr-types.ts";
import { resolveQRStyle, STAMPS, stampUrl } from "../../utils/qr-design.ts";
import { toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
import { STYLE_DISPLAY } from "../../islands/StyleSelector.tsx";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface DesignTabProps {
  url: Signal<string>;
  qrStyle: Signal<string>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  customStyle?: Signal<QRStyle | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
  onClose: () => void;
  lang?: Locale;
}

const KEY =
  "min-h-[44px] rounded-xl border-2 px-1.5 text-xs font-black transition-[transform,box-shadow] duration-[70ms] active:translate-y-[2px] active:shadow-none";

/** Three levers only: colours, the centre mark, and the card label. */
export default function DesignTab(
  { qrStyle, logoUrl, frameConfig, customStyle, pngSize, onClose, lang }:
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

  const labelPresets = [
    es ? "ESCANÉAME" : "SCAN ME",
    es ? "MENÚ" : "MENU",
    "WI-FI",
    "GUEST PASS",
  ];
  const labelChips = [
    es ? "Ninguno" : "None",
    "Scan Me",
    es ? "Menú" : "Menu",
    "Wi-Fi",
    "Guest Pass",
  ];
  const caption = frameConfig?.value?.enabled
    ? frameConfig.value.caption.trim()
    : "";
  const customCaption = caption !== "" && !labelPresets.includes(caption);

  const setCaption = (next: string | null) => {
    if (!frameConfig) return;
    frameConfig.value = next === null
      ? null
      : { enabled: true, caption: next.slice(0, 24) };
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
    <div class="space-y-4 text-[#1e1714]">
      <section class="space-y-2" aria-label={es ? "Paleta" : "Palette"}>
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs font-black uppercase tracking-wide truncate">
            {es ? "Paleta" : "Palette"}{" "}
            <span class="opacity-50">· {paletteName}</span>
          </h3>
          <button
            type="button"
            onClick={reset}
            class="shrink-0 min-h-[32px] px-1 text-xs font-bold underline underline-offset-2"
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
              class="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full border-2 border-dashed border-[#1e1714] bg-[#fffef7] text-sm font-black hover:scale-105 active:scale-95 transition-transform"
            >
              +
            </button>
          }
        />
      </section>

      <section
        class="space-y-2"
        aria-label={es ? "Marca central" : "Center mark"}
      >
        <h3 class="text-xs font-black uppercase tracking-wide">
          {es ? "Marca central" : "Center mark"}
        </h3>
        <div class="grid grid-cols-6 gap-1.5">
          <button
            type="button"
            aria-pressed={!logoUrl.value}
            class={`${KEY} ${pillState(!logoUrl.value)}`}
            onClick={() => {
              globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
              logoUrl.value = "";
              setMonogram("");
              tap();
            }}
          >
            {es ? "Nada" : "None"}
          </button>
          {STAMPS.map((stamp) => (
            <button
              key={stamp.id}
              type="button"
              aria-label={es ? stamp.es : stamp.en}
              title={es ? stamp.es : stamp.en}
              aria-pressed={logoUrl.value === stampUrl(stamp.path)}
              class={`${KEY} flex items-center justify-center ${
                pillState(logoUrl.value === stampUrl(stamp.path))
              }`}
              onClick={() => {
                logoUrl.value = stampUrl(stamp.path);
                setMonogram("");
                globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
                tap();
              }}
            >
              <img src={stampUrl(stamp.path)} alt="" width="22" height="22" />
            </button>
          ))}
        </div>
        <div class="flex items-center gap-2">
          <LogoUploader
            logoUrl={logoUrl}
            lang={locale}
            compact
            onPicked={() => setMonogram("")}
          />
          <label class="flex items-center min-h-[44px] w-28 shrink-0 rounded-xl border-2 border-[#1e1714]/20 bg-[#fffef7] focus-within:border-[#1e1714]">
            <span class="pl-2 text-[10px] font-black uppercase opacity-50">
              Aa
            </span>
            <input
              type="text"
              maxLength={3}
              value={monogram}
              placeholder="VIP"
              aria-label={es
                ? "Texto de la marca, hasta 3 caracteres"
                : "Badge text, up to 3 characters"}
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
                logoUrl.value = value ? toSvgDataUrl(svg) : "";
              }}
            />
          </label>
        </div>
        {logoUrl.value && customStyle && (
          <div
            class="grid grid-cols-3 gap-1.5"
            role="group"
            aria-label={es ? "Forma de la marca" : "Center mark shape"}
          >
            {(["squircle", "circle", "knockout"] as const).map((shape, i) => (
              <button
                type="button"
                class={`${KEY} ${
                  pillState((current.centerShape ?? "squircle") === shape)
                }`}
                aria-pressed={(current.centerShape ?? "squircle") === shape}
                onClick={() => {
                  customStyle.value = { ...current, centerShape: shape };
                  tap();
                }}
              >
                {(es
                  ? ["Suave", "Círculo", "Sin borde"]
                  : ["Squircle", "Circle", "Knockout"])[i]}
              </button>
            ))}
          </div>
        )}
      </section>

      {frameConfig && (
        <section
          class="space-y-2"
          aria-label={es ? "Etiqueta de la tarjeta" : "Card label"}
        >
          <h3 class="text-xs font-black uppercase tracking-wide">
            {es ? "Etiqueta de la tarjeta" : "Card label"}
          </h3>
          <div class="grid grid-cols-5 gap-1.5">
            {labelChips.map((label, i) => {
              const active = i === 0
                ? !frameConfig.value?.enabled
                : caption === labelPresets[i - 1];
              return (
                <button
                  type="button"
                  class={`${KEY} text-[10px] leading-tight ${
                    pillState(active)
                  }`}
                  aria-pressed={active}
                  onClick={() =>
                    setCaption(i === 0 ? null : labelPresets[i - 1])}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            maxLength={24}
            value={customCaption ? caption : ""}
            placeholder={es ? "Etiqueta propia" : "Custom label"}
            aria-label={es ? "Etiqueta propia" : "Custom label"}
            class="w-full min-h-[44px] px-3 border-2 border-[#1e1714]/20 rounded-xl bg-[#fffef7] text-sm font-black uppercase tracking-wide focus:border-[#1e1714] focus:outline-none transition-colors"
            onInput={(e) => {
              const value = e.currentTarget.value.trim().slice(0, 24);
              setCaption(value === "" ? null : value);
            }}
          />
        </section>
      )}
    </div>
  );
}

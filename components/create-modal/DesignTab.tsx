import type { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import LogoUploader from "../LogoUploader.tsx";
import PalettePills, { pillState } from "./PalettePills.tsx";
import type { QRStyle } from "../../types/qr-types.ts";
import {
  PATTERNS,
  resolveQRStyle,
  STAMPS,
  stampUrl,
} from "../../utils/qr-design.ts";
import { buildQrSvgString, toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
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
  "min-h-[44px] rounded-xl border-2 px-2 text-xs font-black transition-[transform,box-shadow] duration-[70ms] active:translate-y-[2px] active:shadow-none";

export default function DesignTab(
  { qrStyle, logoUrl, frameConfig, customStyle, pngSize, onClose, lang }:
    DesignTabProps,
) {
  const locale = getClientLocale(lang);
  const es = locale === "es";
  const current = resolveQRStyle(qrStyle.value, customStyle?.value);
  const [customLabel, setCustomLabel] = useState(() =>
    Boolean(
      frameConfig?.value?.enabled &&
        !["SCAN ME", "ESCANÉAME", "MENU", "MENÚ", "WI-FI"].includes(
          frameConfig.value.caption,
        ),
    )
  );
  const [monogram, setMonogram] = useState("");
  const tap = () => {
    haptics.light();
    sounds.click();
  };
  const frameCaption = frameConfig?.value?.enabled
    ? frameConfig.value.caption
    : "";
  const captions = [
    es ? "ESCANÉAME" : "SCAN ME",
    es ? "MENÚ" : "MENU",
    "WI-FI",
  ];
  const frameLabels = [
    es ? "Ninguno" : "None",
    "Scan Me",
    es ? "Menú" : "Menu",
    "Wi-Fi",
    es ? "Propio" : "Custom",
  ];
  const reset = () => {
    qrStyle.value = "sunset";
    if (customStyle) customStyle.value = null;
    logoUrl.value = "";
    if (frameConfig) frameConfig.value = null;
    if (pngSize) pngSize.value = 1000;
    setCustomLabel(false);
    setMonogram("");
    resetDesignPreferences();
    globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
    tap();
  };
  return (
    <div class="space-y-4 text-[#1e1714]">
      <section class="space-y-2" aria-label={es ? "Paleta" : "Palette"}>
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black uppercase tracking-wide">
            {es ? "Paleta" : "Palette"}
          </h3>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={reset}
              class="min-h-[44px] px-2 text-xs font-bold"
              aria-label={es
                ? "Restablecer diseño original"
                : "Reset design to default"}
            >
              ↺ Reset
            </button>
            <button
              type="button"
              class="min-h-[44px] px-2 text-xs font-black underline underline-offset-2"
              onClick={() => {
                onClose();
                globalThis.dispatchEvent(
                  new CustomEvent("open-gradient-creator"),
                );
                tap();
              }}
            >
              {es ? "Propio" : "Custom"} →
            </button>
          </div>
        </div>
        <PalettePills
          compact
          value={qrStyle.value}
          onChange={(key) => {
            qrStyle.value = key;
          }}
          lang={locale}
        />
      </section>
      {customStyle && (
        <section class="space-y-2" aria-label={es ? "Patrón" : "Pattern"}>
          <h3 class="text-xs font-black uppercase tracking-wide">
            {es ? "Patrón" : "Pattern"}
          </h3>
          <div class="grid grid-cols-4 gap-2">
            {PATTERNS.map((p) => {
              const active = (current.dots.shape === p.dot ||
                (p.id === "melt" &&
                  current.dots.shape === "extra-rounded")) &&
                current.cornersSquare?.shape === p.eye;
              return (
                <button
                  type="button"
                  aria-pressed={active}
                  class={`${KEY} ${
                    pillState(active)
                  } flex flex-col items-center gap-1 py-2 px-1`}
                  onClick={() => {
                    customStyle.value = {
                      ...current,
                      dots: { ...current.dots, shape: p.dot },
                      cornersSquare: { ...current.cornersSquare, shape: p.eye },
                      cornersDot: { ...current.cornersDot, shape: p.pupil },
                    };
                    tap();
                  }}
                >
                  <img
                    alt=""
                    width="52"
                    height="52"
                    class="rounded-md"
                    src={toSvgDataUrl(
                      buildQrSvgString({
                        data: "QRBuddy",
                        c1: "#1e1714",
                        c2: "#1e1714",
                        bg: "#fffef7",
                        dotShape: p.dot,
                        cornerSquareShape: p.eye,
                      }).replace(
                        'viewBox="0 0 1000 1000"',
                        'viewBox="100 100 520 520"',
                      ),
                    )}
                  />
                  {es ? p.es : p.en}
                </button>
              );
            })}
          </div>
        </section>
      )}
      <section
        class="space-y-2"
        aria-label={es ? "Marca central" : "Center mark"}
      >
        <h3 class="text-xs font-black uppercase tracking-wide">
          {es ? "Marca central" : "Center mark"}
        </h3>
        <div class="grid grid-cols-7 gap-1">
          <button
            type="button"
            aria-pressed={!logoUrl.value}
            class={`${KEY} px-0 ${pillState(!logoUrl.value)}`}
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
              type="button"
              aria-label={es ? stamp.es : stamp.en}
              title={es ? stamp.es : stamp.en}
              aria-pressed={logoUrl.value === stampUrl(stamp.path)}
              class={`${KEY} px-0 flex items-center justify-center ${
                pillState(logoUrl.value === stampUrl(stamp.path))
              }`}
              onClick={() => {
                logoUrl.value = stampUrl(stamp.path);
                setMonogram("");
                globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
                tap();
              }}
            >
              <img src={stampUrl(stamp.path)} alt="" width="24" height="24" />
            </button>
          ))}
        </div>
        <div class="flex items-center gap-2">
          <LogoUploader logoUrl={logoUrl} lang={locale} compact />
          <input
            type="text"
            maxLength={3}
            value={monogram}
            placeholder="VIP"
            aria-label={es
              ? "Iniciales, hasta 3 caracteres"
              : "Monogram, up to 3 characters"}
            class="w-16 min-h-[44px] border-2 border-[#1e1714]/20 rounded-xl bg-[#fffef7] px-2 text-center text-sm font-black uppercase"
            onInput={(e) => {
              globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
              const value = e.currentTarget.value.replace(/[^\p{L}\p{N}]/gu, "")
                .slice(0, 3).toUpperCase();
              setMonogram(value);
              const svg =
                `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="65" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${
                  value.length === 3 ? 48 : 62
                }" font-weight="900" fill="#1e1714">${value}</text></svg>`;
              logoUrl.value = value ? toSvgDataUrl(svg) : "";
            }}
          />
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
          aria-label={es ? "Marco para imprimir" : "Print frame"}
        >
          <h3 class="text-xs font-black uppercase tracking-wide">
            {es ? "Marco para imprimir" : "Print frame"}
          </h3>
          <div class="grid grid-cols-5 gap-1">
            {frameLabels.map((label, i) => {
              const active = i === 0
                ? !frameConfig.value?.enabled
                : i === 4
                ? customLabel
                : !customLabel && frameCaption === captions[i - 1];
              return (
                <button
                  type="button"
                  class={`${KEY} text-[10px] px-1 ${pillState(active)}`}
                  aria-pressed={active}
                  onClick={() => {
                    setCustomLabel(i === 4);
                    frameConfig.value = i === 0 ? null : {
                      enabled: true,
                      caption: i === 4
                        ? (frameCaption || captions[0])
                        : captions[i - 1],
                    };
                    tap();
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {customLabel && (
            <input
              type="text"
              maxLength={24}
              value={frameCaption}
              onInput={(e) => {
                frameConfig.value = {
                  enabled: true,
                  caption: e.currentTarget.value,
                };
              }}
              aria-label={es ? "Texto del marco" : "Frame caption"}
              class="w-full min-h-[44px] px-3 border-2 border-[#1e1714] rounded-xl bg-[#fffef7] text-sm font-black"
            />
          )}
        </section>
      )}
    </div>
  );
}

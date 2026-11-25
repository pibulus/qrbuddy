import { type Signal, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import GradientCreator from "../GradientCreator.tsx";
import LogoUploader from "../LogoUploader.tsx";
import PalettePills, { pillState } from "./PalettePills.tsx";
import type {
  BannerTheme,
  CornerSquareShape,
  DotShape,
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
import { canExportTransparent } from "../../utils/svg-export.ts";
import {
  buildCounterCardPrintHtml,
  buildPrintProofSheetHtml,
  openPrintArtifactWindow,
} from "../../utils/print-artifacts.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { resetDesignPreferences } from "../../utils/design-preferences.ts";
import { getQRThemeTokens } from "../../utils/qr-styles.ts";
import {
  RISO_DUOS,
  RISO_REGISTERS,
  RISO_STOCKS,
} from "../../utils/qr-print.ts";
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
  "min-h-[40px] rounded-xl px-2 text-xs font-black transition-[transform,box-shadow,border-color,background-color] duration-[70ms] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef7]";

const MODULE_SHAPES: readonly {
  id: "preset" | DotShape;
  eye?: CornerSquareShape;
  en: string;
  es: string;
}[] = [
  { id: "preset", en: "Auto", es: "Auto" },
  { id: "rounded", eye: "extra-rounded", en: "Round", es: "Suave" },
  { id: "dots", eye: "dot", en: "Dots", es: "Puntos" },
  { id: "diamond", eye: "octagon", en: "Gem", es: "Gema" },
  { id: "square", eye: "square", en: "Pixel", es: "Píxel" },
];

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

/** Shared reset action used by DesignPreview's top Reset button and local triggers. */
export function resetQrDesignState({
  qrStyle,
  customStyle,
  logoUrl,
  frameConfig,
  pngSize,
}: {
  qrStyle: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<FrameConfig | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
}) {
  qrStyle.value = "sunset";
  if (customStyle) customStyle.value = null;
  logoUrl.value = "";
  if (frameConfig) frameConfig.value = null;
  if (pngSize) pngSize.value = 1000;
  resetDesignPreferences();
  globalThis.dispatchEvent(new CustomEvent("qr-design-reset"));
  haptics.light();
  sounds.click();
}

/** Three calm Studio pods: Color & Finish, Shape & Mark, Export & Print. */
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
  const resolved = resolveQRStyle(qrStyle.value, customStyle?.value);
  const current: QRStyle =
    resolved.renderMode === "halftone" || resolved.renderMode === "foil"
      ? { ...resolved, renderMode: "classic" }
      : resolved;
  const [monogram, setMonogram] = useState(() =>
    decodeMonogramFromLogoUrl(logoUrl.value)
  );
  const localGradientOpen = useSignal(false);

  useEffect(() => {
    setMonogram(decodeMonogramFromLogoUrl(logoUrl.value));
  }, [logoUrl.value]);

  useEffect(() => {
    const clearMonogram = () => setMonogram("");
    globalThis.addEventListener("qr-design-reset", clearMonogram);
    return () =>
      globalThis.removeEventListener("qr-design-reset", clearMonogram);
  }, []);

  const tap = () => {
    haptics.light();
    sounds.click();
  };
  const paletteName = resolvePaletteDisplayName(qrStyle.value, es);
  const accent = getQRThemeTokens(qrStyle.value, customStyle?.value).accent;

  const caption = frameConfig?.value?.enabled
    ? frameConfig.value.caption.trim()
    : "";
  const theme: BannerTheme = frameConfig?.value?.theme ?? "accent";
  const banner = bannerColors(theme, accent);

  const printMode = current.print ?? "clean";
  const transparentActive = canExportTransparent(current, frameConfig?.value);
  const activeFinish: "clean" | "clear" | "paper" | "riso" = transparentActive
    ? "clear"
    : printMode === "riso"
    ? "riso"
    : printMode === "paper"
    ? "paper"
    : "clean";

  const risoInk = current.risoInk ?? "auto";
  const risoStock = current.risoStock ?? "cream";
  const risoRegister = current.risoRegister ?? "loose";
  const explicitShape = customStyle?.value?.dots?.shape ?? "preset";

  const writeStylePatch = (patch: Partial<QRStyle>) => {
    if (!customStyle) return;
    customStyle.value = {
      ...current,
      ...patch,
      renderMode: "classic",
    };
    tap();
  };

  const pickFinish = (finish: "clean" | "clear" | "paper" | "riso") => {
    if (!customStyle) return;
    if (finish === "clear") {
      if (caption) return;
      customStyle.value = {
        ...current,
        renderMode: "classic",
        print: "clean",
        transparentBg: true,
      };
    } else {
      customStyle.value = {
        ...current,
        renderMode: "classic",
        print: finish,
        transparentBg: false,
      };
    }
    tap();
  };

  const setModuleShape = (
    shapeId: "preset" | DotShape,
    eye?: CornerSquareShape,
  ) => {
    if (!customStyle) return;
    if (shapeId === "preset") {
      const base = customStyle.value ?? current;
      const cleanedDots = { ...base.dots };
      delete cleanedDots.shape;
      const cleanedCorners = base.cornersSquare
        ? { ...base.cornersSquare }
        : undefined;
      if (cleanedCorners) delete cleanedCorners.shape;
      customStyle.value = {
        ...current,
        renderMode: "classic",
        dots: cleanedDots,
        cornersSquare: cleanedCorners,
      };
    } else {
      customStyle.value = {
        ...current,
        renderMode: "classic",
        dots: { ...current.dots, shape: shapeId },
        cornersSquare: {
          ...(current.cornersSquare ?? {}),
          shape: eye ?? "extra-rounded",
        },
      };
    }
    tap();
  };

  const writeCaption = (next: string) => {
    if (!frameConfig) return;
    const clean = next.slice(0, 24);
    frameConfig.value = clean.trim() === ""
      ? null
      : { enabled: true, caption: clean, theme };
  };

  const cycleBanner = () => {
    if (!frameConfig || !caption.trim()) return;
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
      customStyle.value = {
        ...current,
        renderMode: "classic",
        centerShape: shape,
      };
    }
    logoUrl.value = markUrl;
    tap();
  };

  const launchPrintArtifact = (kind: "sign" | "proof") => {
    tap();
    const payload = url.value || "https://qrbuddy.app";
    const html = kind === "proof"
      ? buildPrintProofSheetHtml({
        data: payload,
        style: current,
        styleKey: qrStyle.value,
        logoUrl: logoUrl.value,
        caption: caption || undefined,
        lang: locale,
      })
      : buildCounterCardPrintHtml({
        data: payload,
        style: current,
        styleKey: qrStyle.value,
        logoUrl: logoUrl.value,
        caption: caption || undefined,
        lang: locale,
      });
    const outcome = openPrintArtifactWindow(
      html,
      kind === "proof"
        ? "qrbuddy-proof-sheet.html"
        : "qrbuddy-counter-sign.html",
    );
    if (outcome === "downloaded") {
      addToast(
        es
          ? "Archivo de impresión descargado (abre y presiona Imprimir)"
          : "Print sheet downloaded (open & Print / Save PDF)",
        3000,
      );
    }
  };

  const customActive = qrStyle.value === "custom";
  const customSwatchStyle = customActive && customStyle?.value?.dots
    ? (customStyle.value.dots.gradient?.colorStops?.length
      ? {
        background: `linear-gradient(135deg, ${
          customStyle.value.dots.gradient.colorStops.map((s) => s.color).join(
            ", ",
          )
        })`,
      }
      : customStyle.value.dots.color
      ? { backgroundColor: customStyle.value.dots.color }
      : undefined)
    : undefined;

  const activeSizeLabel = pngSize?.value === 2000
    ? (es ? "2000px · Imprenta" : "2000px · Print")
    : pngSize?.value === 3000
    ? (es ? "3000px · Póster" : "3000px · Poster")
    : (es ? "1000px · Pantalla" : "1000px · Screen");

  return (
    <div class="space-y-3 text-[#1e1714]">
      {/* Pod 1: Color & Finish */}
      <section
        class="qr-menu-pod p-3.5 space-y-3"
        aria-label={es ? "Color y acabado" : "Color and finish"}
      >
        <div class="flex items-center justify-between gap-2">
          <h3 class="qr-section-eyebrow truncate">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>{es ? "Color y acabado" : "Color & finish"}</span>
          </h3>
          <span class="rounded-full bg-[#f7ecdc] border border-[#1e1714]/20 px-2.5 py-0.5 text-[11px] font-black text-[#4a3f39]">
            {paletteName}
          </span>
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
              aria-label={es ? "Estudio de color" : "Color studio"}
              title={es ? "Estudio de color" : "Color studio"}
              style={customSwatchStyle}
              class={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-black active:scale-95 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef7] ${
                customActive
                  ? "border-2 border-[#1e1714] ring-2 ring-[#1e1714] ring-offset-2 ring-offset-[#fffef7] scale-105 text-[#fffef7] bg-[#ffbe0b]"
                  : "border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              }`}
            >
              <span class={customActive ? "drop-shadow" : ""}>✦</span>
            </button>
          }
        />

        {customStyle && (
          <div class="space-y-1.5 pt-1 border-t border-[#1e1714]/10">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Acabado" : "Finish"}
              </span>
              {activeFinish === "clear" && (
                <span class="text-[11px] font-semibold text-[#574c44]">
                  {es ? "PNG/SVG sin fondo" : "No background rect"}
                </span>
              )}
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                aria-pressed={activeFinish === "clean"}
                onClick={() => pickFinish("clean")}
                class={`${KEY} ${pillState(activeFinish === "clean")}`}
              >
                {es ? "Limpio" : "Clean"}
              </button>
              <button
                type="button"
                aria-pressed={activeFinish === "clear"}
                disabled={Boolean(caption)}
                title={caption
                  ? (es ? "Quita la etiqueta primero" : "Remove label first")
                  : (es
                    ? "Fondo transparente (PNG/SVG)"
                    : "Transparent ground (PNG/SVG)")}
                onClick={() => pickFinish("clear")}
                class={`${KEY} inline-flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none ${
                  pillState(activeFinish === "clear")
                }`}
              >
                <span
                  aria-hidden="true"
                  class="w-3 h-3 rounded-sm border border-[#1e1714] shrink-0"
                  style={{
                    background:
                      "repeating-conic-gradient(#d6cbb8 0% 25%, #fffef7 0% 50%) 50% / 6px 6px",
                  }}
                />
                <span>{es ? "Sin fondo" : "Clear"}</span>
              </button>
              <button
                type="button"
                aria-pressed={activeFinish === "paper"}
                onClick={() => pickFinish("paper")}
                class={`${KEY} ${pillState(activeFinish === "paper")}`}
              >
                {es ? "Papel" : "Paper"}
              </button>
              <button
                type="button"
                aria-pressed={activeFinish === "riso"}
                onClick={() => pickFinish("riso")}
                class={`${KEY} ${pillState(activeFinish === "riso")}`}
              >
                Riso
              </button>
            </div>
          </div>
        )}

        {/* Progressive Riso Tray */}
        {activeFinish === "riso" && (
          <div class="rounded-xl border-2 border-[#1e1714]/25 bg-[#fbf1e4] p-2.5 space-y-2.5">
            <div class="space-y-1.5">
              <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Tintas (2 tambores)" : "Ink duo"}
              </span>
              <div class="grid grid-cols-3 gap-1.5">
                {RISO_DUOS.map((duo) => (
                  <button
                    key={duo.id}
                    type="button"
                    aria-pressed={risoInk === duo.id}
                    onClick={() => writeStylePatch({ risoInk: duo.id })}
                    class={`${KEY} ${pillState(risoInk === duo.id)} !px-1.5`}
                  >
                    <span class="flex items-center justify-center gap-1">
                      {duo.inks[0] && (
                        <>
                          <span
                            aria-hidden="true"
                            class="w-2.5 h-2.5 rounded-full border border-[#1e1714]/40 shrink-0"
                            style={{ background: duo.inks[0] }}
                          />
                          <span
                            aria-hidden="true"
                            class="w-2.5 h-2.5 rounded-full border border-[#1e1714]/40 shrink-0"
                            style={{ background: duo.inks[1] }}
                          />
                        </>
                      )}
                      <span class="truncate">{duo.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1.5">
                <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                  {es ? "Papel" : "Stock"}
                </span>
                <div class="grid grid-cols-5 gap-1">
                  {RISO_STOCKS.map((stock) => (
                    <button
                      key={stock.id}
                      type="button"
                      aria-pressed={risoStock === stock.id}
                      aria-label={stock.label}
                      title={stock.label}
                      onClick={() => writeStylePatch({ risoStock: stock.id })}
                      class={`h-9 rounded-lg border-2 flex items-center justify-center transition-transform duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4] ${
                        risoStock === stock.id
                          ? "border-[#1e1714]"
                          : "border-[#1e1714]/25"
                      }`}
                      style={{ background: stock.paper }}
                    >
                      {risoStock === stock.id && (
                        <span
                          aria-hidden="true"
                          class={`text-[11px] font-black ${
                            stock.id === "midnight"
                              ? "text-[#fbf1e4]"
                              : "text-[#1e1714]"
                          }`}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div class="space-y-1.5">
                <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                  {es ? "Registro" : "Registration"}
                </span>
                <div class="grid grid-cols-3 gap-1">
                  {RISO_REGISTERS.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={risoRegister === mode.id}
                      onClick={() => writeStylePatch({ risoRegister: mode.id })}
                      class={`${KEY} !px-1 !min-h-[36px] ${
                        pillState(risoRegister === mode.id)
                      }`}
                    >
                      {es
                        ? ({
                          tight: "Firme",
                          loose: "Suelto",
                          drift: "Deriva",
                        } as Record<string, string>)[mode.id]
                        : mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Pod 2: Shape, Center Mark & Card Label */}
      <section
        class="qr-menu-pod p-3.5 space-y-3"
        aria-label={es ? "Forma y marca" : "Shape and mark"}
      >
        <div class="flex items-center justify-between gap-2">
          <h3 class="qr-section-eyebrow">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>{es ? "Forma y marca" : "Shape & mark"}</span>
          </h3>
          {logoUrl.value && (
            <button
              type="button"
              onClick={() => {
                logoUrl.value = "";
                setMonogram("");
                tap();
              }}
              class="min-h-[28px] px-2.5 rounded-full border border-[#1e1714]/25 bg-[#fbf1e4] hover:border-[#1e1714] text-[11px] font-black text-[#1e1714]"
            >
              ✕ {es ? "Quitar marca" : "Clear mark"}
            </button>
          )}
        </div>

        {/* Module Geometry */}
        <div class="space-y-1.5">
          <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
            {es ? "Forma de módulos" : "Module shape"}
          </span>
          <div class="grid grid-cols-5 gap-1.5">
            {MODULE_SHAPES.map((m) => {
              const selected = explicitShape === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setModuleShape(m.id, m.eye)}
                  class={`${KEY} !px-1 ${pillState(selected)}`}
                >
                  {es ? m.es : m.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Mark */}
        <div class="space-y-2 pt-1 border-t border-[#1e1714]/10">
          <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
            {es ? "Marca central" : "Center mark"}
          </span>
          <div class="grid grid-cols-5 gap-1.5">
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
                    setMonogram("");
                    setMark(active ? "" : stampUrl(stamp.path), "circle");
                  }}
                >
                  <img
                    src={stampUrl(stamp.path)}
                    alt=""
                    width="18"
                    height="18"
                  />
                </button>
              );
            })}
          </div>
          <div class="grid grid-cols-2 gap-2">
            <LogoUploader
              logoUrl={logoUrl}
              lang={locale}
              compactLabel={/^data:image\/(png|jpeg|webp)/.test(logoUrl.value)
                ? (es ? "Cambiar logo" : "Replace logo")
                : (es ? "Subir logo" : "Upload logo")}
              onPicked={() => {
                setMonogram("");
                setMark(logoUrl.value, "squircle");
              }}
            />
            <div
              class={`flex items-center min-w-0 min-h-[42px] rounded-xl transition-all focus-within:ring-2 focus-within:ring-[#1e1714] focus-within:ring-offset-1 ${
                monogram
                  ? "border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] shadow-[0_2px_0_#1e1714]"
                  : "border-2 border-[#1e1714]/20 bg-[#fbf1e4] focus-within:border-[#1e1714] focus-within:bg-[#fffef7]"
              }`}
            >
              <span class="pl-2.5 text-[11px] font-black text-[#4a3f39]">
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
                class="min-w-0 flex-1 bg-transparent px-1.5 text-sm font-black uppercase placeholder:text-[#7c7267] focus:outline-none"
                onInput={(e) => {
                  const value = e.currentTarget.value.replace(
                    /[^\p{L}\p{N}]/gu,
                    "",
                  )
                    .slice(0, 3).toUpperCase();
                  setMonogram(value);
                  const svg =
                    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="64" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${
                      value.length === 3 ? 50 : 66
                    }" font-weight="900" fill="#1e1714">${value}</text></svg>`;
                  setMark(value ? toSvgDataUrl(svg) : "", "circle");
                }}
              />
            </div>
          </div>
        </div>

        {/* Optional Card Label */}
        {frameConfig && (
          <div class="space-y-2 pt-1 border-t border-[#1e1714]/10">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Etiqueta de tarjeta" : "Card label"}
              </span>
              <span class="text-[11px] font-bold text-[#6e6058]">
                {es ? "Opcional · máx. 24" : "Optional · 24 chars"}
              </span>
            </div>
            <div
              class={`flex items-center min-h-[42px] rounded-xl transition-all focus-within:ring-2 focus-within:ring-[#1e1714] focus-within:ring-offset-1 ${
                caption
                  ? "border-2 border-[#1e1714] bg-[#fffef7] shadow-[0_2px_0_#1e1714]"
                  : "border-2 border-[#1e1714]/20 bg-[#fbf1e4] focus-within:border-[#1e1714] focus-within:bg-[#fffef7]"
              }`}
            >
              <input
                type="text"
                maxLength={24}
                value={caption}
                placeholder={es
                  ? "Ej. Escanéame, Menú, Wi-Fi…"
                  : "e.g. Scan me, Menu, Wi-Fi…"}
                aria-label={es ? "Etiqueta de la tarjeta" : "Card label"}
                class="min-w-0 flex-1 bg-transparent px-3 text-sm font-black placeholder:text-[#7c7267] placeholder:font-semibold focus:outline-none"
                onInput={(e) => writeCaption(e.currentTarget.value)}
              />
              <button
                type="button"
                data-banner-cycle
                disabled={!caption.trim()}
                onClick={cycleBanner}
                title={!caption.trim()
                  ? (es
                    ? "Escribe una etiqueta primero para elegir estilo"
                    : "Type a label first to style its banner")
                  : (es
                    ? `Franja: ${theme} · tocar para cambiar`
                    : `Banner: ${theme} · tap to change`)}
                aria-label={es
                  ? `Franja: ${theme}. Cambiar estilo`
                  : `Banner: ${theme}. Change style`}
                class={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full mr-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] ${
                  caption.trim()
                    ? "hover:scale-105"
                    : "opacity-45 cursor-not-allowed"
                }`}
              >
                <span
                  aria-hidden="true"
                  class="block w-6 h-6 rounded-full border-2 border-[#1e1714] shadow-[1px_1px_0_#1e1714]"
                  style={{ background: banner.bg }}
                />
              </button>
              {caption && (
                <button
                  type="button"
                  onClick={() => writeCaption("")}
                  aria-label={es ? "Quitar etiqueta" : "Clear label"}
                  class="shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded-full text-xs font-black hover:bg-[#1e1714]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714]"
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
                const chipActive =
                  caption.toLowerCase() === label.toLowerCase();
                return (
                  <button
                    key={chip.en}
                    type="button"
                    aria-pressed={chipActive}
                    onClick={() => {
                      writeCaption(chipActive ? "" : label);
                      tap();
                    }}
                    class={`min-h-[30px] inline-flex items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black transition-[transform,box-shadow,border-color,background-color] duration-[70ms] active:translate-y-[1.5px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] ${
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
          </div>
        )}
      </section>

      {/* Pod 3: Export & Print */}
      {pngSize && (
        <section
          class="qr-menu-pod p-3.5 space-y-2.5"
          aria-label={es ? "Exportar e imprimir" : "Export and print"}
        >
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h3 class="qr-section-eyebrow shrink-0">
              <span class="qr-section-pip" aria-hidden="true" />
              <span>{es ? "Exportar e imprimir" : "Export & print"}</span>
            </h3>
            <span class="rounded-full bg-[#f7ecdc] border border-[#1e1714]/20 px-2.5 py-0.5 text-[11px] font-black text-[#4a3f39] tabular-nums">
              {activeSizeLabel}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2" role="group">
            {([
              { size: 1000, hint: es ? "Pantalla" : "Screen" },
              { size: 2000, hint: es ? "Imprenta" : "Print" },
              { size: 3000, hint: es ? "Gran formato" : "Poster" },
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
                  class={`${KEY} flex flex-col items-center justify-center py-1 ${
                    pillState(active)
                  }`}
                >
                  <span>{size}px</span>
                  <span class="text-[10px] font-bold opacity-75 leading-none mt-0.5">
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#1e1714]/10">
            <button
              type="button"
              onClick={() => launchPrintArtifact("sign")}
              class={`${KEY} min-h-[40px] border-2 border-[#1e1714] bg-[#fbf1e4] hover:bg-[#ffbe0b] text-[#1e1714] shadow-[0_1.5px_0_#1e1714] flex items-center justify-center gap-1.5`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0"
              >
                <rect x="5" y="3" width="14" height="14" rx="2" />
                <path d="M9 21h6M12 17v4" />
              </svg>
              <span class="truncate">
                {es ? "Letrero / Caballete" : "Counter Sign / Tent"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => launchPrintArtifact("proof")}
              class={`${KEY} min-h-[40px] border-2 border-[#1e1714]/35 hover:border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-[#1e1714] flex items-center justify-center gap-1.5`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0"
              >
                <rect x="3" y="7" width="18" height="10" rx="2" />
                <path d="M7 7v4M11 7v3M15 7v4M19 7v3" />
              </svg>
              <span class="truncate">
                {es ? "Hoja de prueba mm" : "Size Proof Sheet"}
              </span>
            </button>
          </div>
        </section>
      )}

      {!onOpenCustomGradient && (
        <GradientCreator
          isOpen={localGradientOpen}
          initialStyle={customStyle?.value}
          previewData={url.value}
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

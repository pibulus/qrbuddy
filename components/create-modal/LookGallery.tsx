import type { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import type {
  CornerSquareShape,
  DotShape,
  PlateShape,
  QRStyle,
  RenderMode,
} from "../../types/qr-types.ts";
import { LOOKS, resolveQRStyle } from "../../utils/qr-design.ts";
import { styledQrSvg } from "../../utils/qr-renderer.ts";
import { toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { checkSvgScannability } from "../../utils/qr-decode.ts";
import { loadArtwork, sampleImage } from "../../utils/qr-art-sample.ts";
import { MAX_STORED_LOGO_LENGTH } from "../../utils/design-preferences.ts";
import {
  RISO_DUOS,
  RISO_REGISTERS,
  RISO_STOCKS,
} from "../../utils/qr-print.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { pillState } from "./PalettePills.tsx";

const PREVIEW_SIZE = 600;
const PILL =
  "min-h-[38px] rounded-xl border-2 px-2 text-[11px] font-black truncate transition-[transform,box-shadow,border-color,background-color] duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef7]";

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

type Verdict = boolean | null | undefined;

/** 32-bit FNV-1a. Used only as a cache key for a finished render. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Verdicts survive remounts and tab switches. Bounded so the map cannot grow. */
const verdicts = new Map<string, boolean | null>();
function remember(key: string, value: boolean | null): boolean | null {
  if (verdicts.size > 120) verdicts.clear();
  verdicts.set(key, value);
  return value;
}

async function toArtwork(file: File): Promise<string | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  if (!dataUrl) return null;
  try {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const max = 900;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    if (png.length <= MAX_STORED_LOGO_LENGTH) return png;
    const jpeg = canvas.toDataURL("image/jpeg", 0.8);
    return jpeg.length <= MAX_STORED_LOGO_LENGTH ? jpeg : null;
  } catch {
    return dataUrl.length <= MAX_STORED_LOGO_LENGTH ? dataUrl : null;
  }
}

interface LookGalleryProps {
  url: Signal<string>;
  qrStyle: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  logoUrl: Signal<string>;
  lang?: Locale;
}

/**
 * The Looks pod: three live minis in the current palette (Classic, Halftone,
 * Flat Foil), orthogonal Print presses (Clean, Paper, Riso), module shapes,
 * and a clean gateway to the print press.
 */
export default function LookGallery(
  { url, qrStyle, customStyle, logoUrl, lang }: LookGalleryProps,
) {
  const es = getClientLocale(lang) === "es";
  const current = resolveQRStyle(qrStyle.value, customStyle?.value);
  const active: RenderMode = current.renderMode ?? "classic";
  const payload = url.value || "https://qrbuddy.app";
  const artRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<Record<string, Verdict>>({});

  const tap = () => {
    haptics.light();
    sounds.click();
  };

  // One render per look, reused for the card image and the decoder probe — the
  // tick always describes the exact picture on screen.
  const signature = [
    payload,
    qrStyle.value,
    logoUrl.value,
    current.renderMode,
    current.halftoneTone,
    current.halftoneShape,
    current.halftoneDetail,
    current.foilDepth,
    current.print,
    current.risoInk,
    current.risoStock,
    current.risoRegister,
    current.centerShape,
    hash(current.artSample?.data ?? ""),
    current.artImage?.length ?? 0,
    JSON.stringify(current.dots),
    JSON.stringify(current.cornersSquare),
    JSON.stringify(current.background),
  ].join("|");
  const renderCache = useRef<
    {
      key: string;
      svgs: Record<string, string>;
      previews: Record<string, string>;
    } | null
  >(null);
  if (!renderCache.current || renderCache.current.key !== signature) {
    const svgs: Record<string, string> = {};
    const previews: Record<string, string> = {};
    for (const look of LOOKS) {
      try {
        const svg = styledQrSvg({
          size: PREVIEW_SIZE,
          data: payload,
          style: { ...current, renderMode: look.id as RenderMode },
          logoUrl: logoUrl.value,
        });
        svgs[look.id] = svg;
        previews[look.id] = toSvgDataUrl(svg);
      } catch {
        svgs[look.id] = "";
        previews[look.id] = "";
      }
    }
    renderCache.current = { key: signature, svgs, previews };
  }
  const { svgs, previews } = renderCache.current;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      for (const look of LOOKS) {
        if (cancelled) return;
        const svg = svgs[look.id];
        if (!svg) continue;
        const key = `${look.id}:${hash(svg)}`;
        if (verdicts.has(key)) {
          const cached = verdicts.get(key) ?? null;
          setSeen((prev) =>
            prev[look.id] === cached ? prev : { ...prev, [look.id]: cached }
          );
          continue;
        }
        const verdict = remember(
          key,
          await checkSvgScannability(svg, payload),
        );
        if (cancelled) return;
        setSeen((prev) => ({ ...prev, [look.id]: verdict }));
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  const write = (patch: Partial<QRStyle>) => {
    if (!customStyle) return;
    customStyle.value = { ...current, ...patch };
    tap();
  };

  const pick = (look: RenderMode) => {
    if (!customStyle) return;
    customStyle.value = { ...current, renderMode: look };
    tap();
  };

  const setModuleShape = (
    shapeId: "preset" | DotShape,
    eye?: CornerSquareShape,
  ) => {
    if (!customStyle) return;
    if (shapeId === "preset") {
      const nextDots = { ...current.dots };
      delete nextDots.shape;
      const nextCorners = current.cornersSquare
        ? { ...current.cornersSquare }
        : undefined;
      if (nextCorners) delete nextCorners.shape;
      // Preserve customStyle without pinning an override shape when not in custom palette
      const base = customStyle.value ?? current;
      const cleanedDots = { ...base.dots };
      delete cleanedDots.shape;
      const cleanedCorners = base.cornersSquare
        ? { ...base.cornersSquare }
        : undefined;
      if (cleanedCorners) delete cleanedCorners.shape;
      customStyle.value = {
        ...current,
        dots: qrStyle.value === "custom" ? nextDots : cleanedDots,
        cornersSquare: qrStyle.value === "custom"
          ? nextCorners
          : cleanedCorners,
      };
    } else {
      customStyle.value = {
        ...current,
        dots: { ...current.dots, shape: shapeId },
        cornersSquare: {
          ...(current.cornersSquare ?? {}),
          shape: eye ?? "extra-rounded",
        },
      };
    }
    tap();
  };

  const tone = current.halftoneTone ?? "color";
  const shape: PlateShape = current.halftoneShape ?? "rounded";
  const detail = current.halftoneDetail ?? "sharp";
  const depth = current.foilDepth ?? "chunky";
  const print = current.print ?? "clean";
  const risoInk = current.risoInk ?? "auto";
  const risoStock = current.risoStock ?? "cream";
  const risoRegister = current.risoRegister ?? "loose";
  const hasArt = Boolean(current.artImage);
  const explicitShape = customStyle?.value?.dots?.shape ?? "preset";

  const pickArtwork = async (file: File) => {
    setBusy(true);
    try {
      const art = await toArtwork(file);
      if (!art) {
        addToast(
          es
            ? "Imagen demasiado pesada — prueba una más pequeña"
            : "Image too heavy — try a smaller one",
        );
        haptics.error();
        return;
      }
      const image = await loadArtwork(art);
      const sample = image ? sampleImage(image) : null;
      if (!sample) {
        addToast(
          es ? "No se pudo leer la imagen" : "Couldn't read that image",
        );
        haptics.error();
        return;
      }
      if (customStyle) {
        customStyle.value = {
          ...current,
          renderMode: "halftone",
          artImage: art,
          artSample: sample,
        };
      }
      haptics.success();
      sounds.click();
    } catch {
      addToast(es ? "No se pudo leer la imagen" : "Couldn't read that image");
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  const verdictLabel = (verdict: Verdict, name: string) => {
    if (verdict === true) {
      return es ? `${name}: se escanea` : `${name}: scans clean`;
    }
    if (verdict === false) {
      return es ? `${name}: revisar contraste` : `${name}: check contrast`;
    }
    return es ? `${name}: comprobando` : `${name}: checking`;
  };

  const activeLookLabel = es
    ? LOOKS.find((l) => l.id === active)?.es
    : LOOKS.find((l) => l.id === active)?.en;

  return (
    <section
      class="qr-menu-pod p-3 space-y-2.5"
      aria-label={es ? "Aspecto" : "Look"}
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="qr-section-eyebrow truncate">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>{es ? "Estilo QR" : "QR Look"}</span>
          <span class="rounded-full bg-[#f7ecdc] border border-[#1e1714]/20 px-2 py-0.5 text-[11px] font-black text-[#4a3f39]">
            {activeLookLabel}
          </span>
        </h3>
        <span class="text-[10px] font-black uppercase tracking-wider text-[#574c44]">
          ✓ {es ? "Verificado" : "Scan-tested"}
        </span>
      </div>

      {/* 3 Live Visual Look Cards */}
      <div class="grid grid-cols-3 gap-2">
        {LOOKS.map((look) => {
          const isActive = active === look.id;
          const verdict = seen[look.id];
          return (
            <button
              key={look.id}
              type="button"
              aria-pressed={isActive}
              aria-label={verdictLabel(verdict, es ? look.es : look.en)}
              title={es ? look.blurbEs : look.blurbEn}
              onClick={() => pick(look.id as RenderMode)}
              class={`relative flex flex-col items-center gap-1 rounded-xl p-1.5 pb-1.5 transition-[transform,border-color,background-color,box-shadow] duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffef7] ${
                pillState(isActive)
              }`}
            >
              {previews[look.id]
                ? (
                  <img
                    src={previews[look.id]}
                    alt=""
                    width="96"
                    height="96"
                    class="w-full aspect-square rounded-lg bg-[#fffef7] border border-[#1e1714]/15"
                  />
                )
                : (
                  <span class="w-full aspect-square rounded-lg bg-[#1e1714]/10" />
                )}
              <span class="text-[11px] font-black leading-tight text-center truncate w-full">
                {es ? look.es : look.en}
              </span>
              <span
                aria-hidden="true"
                class={`absolute top-1 right-1 w-4 h-4 rounded-full border-[1.5px] border-[#1e1714] text-[9px] leading-[13px] text-center font-black ${
                  verdict === true
                    ? "bg-[#dcfce7] text-[#1e1714]"
                    : verdict === false
                    ? "bg-[#ffbe0b] text-[#1e1714]"
                    : "bg-[#fbf1e4] text-[#574c44]"
                }`}
              >
                {verdict === true ? "✓" : verdict === false ? "!" : "·"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Classic Module Shapes */}
      {active === "classic" && (
        <div class="space-y-1.5 pt-0.5">
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
                  class={`${PILL} ${pillState(selected)}`}
                >
                  {es ? m.es : m.en}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Print Press (Clean / Paper / Riso) */}
      {active !== "foil" && (
        <div class="space-y-1.5 pt-0.5">
          <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
            {es ? "Prensa / textura" : "Print press"}
          </span>
          <div class="grid grid-cols-3 gap-1.5">
            {([
              ["clean", es ? "Vector limpio" : "Clean"],
              ["paper", es ? "Papel grano" : "Paper"],
              ["riso", "Riso 2-drum"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={print === id}
                onClick={() => write({ print: id })}
                class={`${PILL} ${pillState(print === id)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Riso press: the two drums, the stock, and how loose the spot runs */}
      {active !== "foil" && print === "riso" && (
        <div class="rounded-xl border-2 border-[#1e1714]/25 bg-[#fbf1e4] p-2.5 space-y-2.5">
          <div class="space-y-1.5">
            <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
              {es ? "Tintas" : "Ink duo"}
            </span>
            <div class="grid grid-cols-3 gap-1.5">
              {RISO_DUOS.map((duo) => (
                <button
                  key={duo.id}
                  type="button"
                  aria-pressed={risoInk === duo.id}
                  onClick={() => write({ risoInk: duo.id })}
                  class={`${PILL} ${pillState(risoInk === duo.id)} !px-1.5`}
                >
                  <span class="flex items-center justify-center gap-1">
                    {duo.inks[0] && (
                      <>
                        <span
                          aria-hidden="true"
                          class="w-2.5 h-2.5 rounded-full border border-[#1e1714]/40"
                          style={{ background: duo.inks[0] }}
                        />
                        <span
                          aria-hidden="true"
                          class="w-2.5 h-2.5 rounded-full border border-[#1e1714]/40"
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

          <div class="space-y-1.5">
            <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
              {es ? "Papel" : "Stock"}
            </span>
            <div class="grid grid-cols-5 gap-1.5">
              {RISO_STOCKS.map((stock) => (
                <button
                  key={stock.id}
                  type="button"
                  aria-pressed={risoStock === stock.id}
                  aria-label={stock.label}
                  title={stock.label}
                  onClick={() => write({ risoStock: stock.id })}
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
            <div class="grid grid-cols-3 gap-1.5">
              {RISO_REGISTERS.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={risoRegister === mode.id}
                  onClick={() => write({ risoRegister: mode.id })}
                  class={`${PILL} ${pillState(risoRegister === mode.id)}`}
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
      )}

      {/* Halftone Controls */}
      {active === "halftone" && (
        <div class="rounded-xl border-2 border-[#1e1714]/25 bg-[#fbf1e4] p-2.5 space-y-2">
          <div class="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => artRef.current?.click()}
              class={`min-h-[40px] flex-1 min-w-0 rounded-xl border-2 border-[#1e1714] px-3 text-xs font-black shadow-[0_1.5px_0_#1e1714] transition-all active:translate-y-px ${
                hasArt
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714]"
                  : "bg-[#ffbe0b] hover:bg-[#ffd04a] text-[#1e1714]"
              }`}
            >
              {busy
                ? (es ? "Procesando…" : "Processing…")
                : hasArt
                ? (es ? "🖼 Cambiar imagen" : "🖼 Replace image")
                : (es ? "🖼 Subir imagen para semitono" : "🖼 Upload artwork")}
            </button>
            {hasArt && (
              <button
                type="button"
                onClick={() =>
                  write({ artImage: undefined, artSample: undefined })}
                aria-label={es ? "Quitar imagen" : "Remove image"}
                class="shrink-0 w-10 h-10 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-sm font-black text-[#1e1714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714]"
              >
                ✕
              </button>
            )}
            <input
              ref={artRef}
              data-look-art="true"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (file) void pickArtwork(file);
              }}
            />
          </div>
          {print !== "riso" && (
            <div class="space-y-1">
              <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Tinta" : "Ink tone"}
              </span>
              <div class="grid grid-cols-3 gap-1.5">
                {([
                  ["color", es ? "Color" : "Colour"],
                  ["dmg", "Game Boy"],
                  ["ink", es ? "Monocromo" : "Mono Ink"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tone === id}
                    onClick={() => write({ halftoneTone: id })}
                    class={`${PILL} ${pillState(tone === id)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Detalle" : "Detail"}
              </span>
              <div class="grid grid-cols-2 gap-1.5">
                {([
                  ["soft", es ? "Suave" : "Soft"],
                  ["sharp", es ? "Nítido" : "Sharp"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={detail === id}
                    onClick={() => write({ halftoneDetail: id })}
                    class={`${PILL} ${pillState(detail === id)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div class="space-y-1">
              <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
                {es ? "Placa" : "Plate"}
              </span>
              <div class="grid grid-cols-3 gap-1">
                {([
                  ["square", es ? "Recta" : "Sq"],
                  ["rounded", es ? "Curva" : "Rnd"],
                  ["circle", es ? "Círculo" : "Circ"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={shape === id}
                    onClick={() => write({ halftoneShape: id })}
                    class={`${PILL} px-1 ${pillState(shape === id)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flat Foil Controls */}
      {active === "foil" && (
        <div class="rounded-xl border-2 border-[#1e1714]/25 bg-[#fbf1e4] p-2.5 space-y-1.5">
          <span class="block text-[10px] font-black uppercase tracking-wider text-[#574c44]">
            {es ? "Relieve 3D" : "Tile relief"}
          </span>
          <div class="grid grid-cols-2 gap-1.5">
            {([
              ["thin", es ? "Fino" : "Thin"],
              ["chunky", es ? "Grueso" : "Chunky"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={depth === id}
                onClick={() => write({ foilDepth: id })}
                class={`${PILL} ${pillState(depth === id)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

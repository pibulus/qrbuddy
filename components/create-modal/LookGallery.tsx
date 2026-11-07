import type { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import type {
  QRStyle,
  RenderMode,
  StickerShape,
} from "../../types/qr-types.ts";
import { LOOKS, resolveQRStyle } from "../../utils/qr-design.ts";
import { styledQrSvg } from "../../utils/qr-renderer.ts";
import { toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import { checkSvgScannability } from "../../utils/qr-decode.ts";
import { foilSideColors } from "../../utils/qr-art-renderers.ts";
import { MAX_STORED_LOGO_LENGTH } from "../../utils/design-preferences.ts";
import { addToast } from "../../islands/ToastManager.tsx";
import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { pillState } from "./PalettePills.tsx";

const PREVIEW_SIZE = 600;
const TICK =
  "min-h-[34px] rounded-lg border-2 px-2 text-[11px] font-black transition-[transform,border-color] duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]";

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
 * The Looks row: four live minis in the current palette, each carrying its own
 * scan verdict. A look is never described as print-safe without a real decoder
 * passing on the same render shown here.
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
  // tick always describes the exact picture on screen. Memoised on the design
  // signature so a verdict arriving does not re-encode four QRs.
  const signature = `${payload}|${qrStyle.value}|${logoUrl.value}|${
    JSON.stringify(current)
  }`;
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
    const next: QRStyle = { ...current, renderMode: look };
    customStyle.value = next;
    tap();
  };

  // Foil defaults: the same derivation the renderer uses, so the swatches start
  // on the colours already on screen rather than inventing a new palette.
  const c1 = current.dots.color ??
    current.dots.gradient?.colorStops[0]?.color ?? "#C9184A";
  const c2 = current.dots.color ??
    current.dots.gradient?.colorStops.at(-1)?.color ?? "#5A189A";
  const bg = current.background.color ??
    current.background.gradient?.colorStops[0]?.color ?? "#FBF1E4";
  const derived = foilSideColors(c1, c2, bg, "#1e1714");
  const foilTop = current.artColors?.top ?? current.dots.color ?? c1;
  const foilLeft = current.artColors?.left ?? derived.left;
  const foilRight = current.artColors?.right ?? derived.right;

  const setFoilColor = (slot: "top" | "left" | "right", value: string) => {
    if (!customStyle) return;
    customStyle.value = {
      ...current,
      artColors: { ...current.artColors, [slot]: value },
    };
  };

  const shape: StickerShape = current.stickerShape ?? "squircle";
  const tone = current.pocketTone ?? "brand";
  const hasArt = Boolean(current.artImage);

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
      if (customStyle) {
        customStyle.value = {
          ...current,
          renderMode: "sticker",
          artImage: art,
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

  return (
    <section class="space-y-2.5" aria-label={es ? "Aspecto" : "Look"}>
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-sm font-black">
          {es ? "Aspecto" : "Look"}{" "}
          <span class="opacity-50">
            · {es
              ? LOOKS.find((l) => l.id === active)?.es
              : LOOKS.find((l) => l.id === active)?.en}
          </span>
        </h3>
        <span class="text-[10px] font-bold opacity-45">
          {es ? "Probado con lector" : "Decoder-tested"}
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2">
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
              class={`relative flex flex-col items-center gap-1 rounded-xl p-1.5 pb-1 transition-[transform,border-color] duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4] ${
                pillState(isActive)
              }`}
            >
              {previews[look.id]
                ? (
                  <img
                    src={previews[look.id]}
                    alt=""
                    width="80"
                    height="80"
                    class="w-full aspect-square rounded-lg bg-[#fbf1e4]"
                  />
                )
                : (
                  <span class="w-full aspect-square rounded-lg bg-[#1e1714]/10" />
                )}
              <span class="text-[10px] font-black leading-tight text-center truncate w-full">
                {es ? look.es : look.en}
              </span>
              <span
                aria-hidden="true"
                class={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full border-[1.5px] border-[#1e1714] text-[9px] leading-[13px] text-center font-black ${
                  verdict === true
                    ? "bg-[#c8f08f]"
                    : verdict === false
                    ? "bg-[#ffd04a]"
                    : "bg-[#fbf1e4] opacity-70"
                }`}
              >
                {verdict === true ? "✓" : verdict === false ? "!" : "…"}
              </span>
            </button>
          );
        })}
      </div>

      {active === "foil" && (
        <div class="rounded-xl border-[1.5px] border-[#1e1714]/25 p-2 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider opacity-60">
              {es ? "Caras del foil" : "Foil faces"}
            </span>
            <button
              type="button"
              onClick={() => write({ artColors: undefined })}
              class="text-[11px] font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
            >
              {es ? "Auto" : "Auto"}
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            {([
              ["top", es ? "Arriba" : "Top", foilTop],
              ["left", es ? "Izquierda" : "Left", foilLeft],
              ["right", es ? "Derecha" : "Right", foilRight],
            ] as const).map(([slot, label, value]) => (
              <label
                key={slot}
                class="flex items-center gap-1.5 min-h-[38px] rounded-lg border-[1.5px] border-[#1e1714]/25 px-1.5 bg-[#fffef7] focus-within:border-[#1e1714]"
              >
                <input
                  type="color"
                  value={value.startsWith("#") ? value.slice(0, 7) : "#C9184A"}
                  onInput={(e) => setFoilColor(slot, e.currentTarget.value)}
                  aria-label={label}
                  class="w-6 h-6 shrink-0 rounded-full border-[1.5px] border-[#1e1714] bg-transparent p-0 appearance-none cursor-pointer"
                />
                <span class="text-[10px] font-black truncate">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {active === "sticker" && (
        <div class="rounded-xl border-[1.5px] border-[#1e1714]/25 p-2 space-y-2">
          <div class="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => artRef.current?.click()}
              class={`${TICK} ${pillState(hasArt)} flex-1 min-w-0 truncate`}
            >
              {busy
                ? (es ? "Procesando…" : "Processing…")
                : hasArt
                ? (es ? "Cambiar arte" : "Replace artwork")
                : (es ? "Añadir arte" : "Add artwork")}
            </button>
            {hasArt && (
              <button
                type="button"
                onClick={() => write({ artImage: undefined })}
                aria-label={es ? "Quitar arte" : "Remove artwork"}
                class="shrink-0 w-9 h-9 rounded-lg border-2 border-[#1e1714] bg-[#fffef7] text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
              >
                ✕
              </button>
            )}
            <input
              ref={artRef}
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
          <div class="grid grid-cols-3 gap-2">
            {([
              ["squircle", es ? "Cuadrada" : "Squircle"],
              ["circle", es ? "Círculo" : "Circle"],
              ["ticket", es ? "Ticket" : "Ticket"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={shape === id}
                onClick={() => write({ stickerShape: id })}
                class={`${TICK} truncate ${pillState(shape === id)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {active === "pocket" && (
        <div class="rounded-xl border-[1.5px] border-[#1e1714]/25 p-2 grid grid-cols-2 gap-2">
          {([
            ["brand", es ? "Paleta" : "Palette"],
            ["dmg", "DMG"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tone === id}
              onClick={() => write({ pocketTone: id })}
              class={`${TICK} ${pillState(tone === id)}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

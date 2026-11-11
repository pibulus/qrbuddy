import { Signal } from "@preact/signals";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import type { ColorStop, QRStyle } from "../types/qr-types.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";
import { contrastRatio, relativeLuminance } from "../utils/qr-styles.ts";
import { evaluateQrContrast, toSvgDataUrl } from "../utils/qr-vector-svg.ts";
import { useModalShell } from "./modal/useModalShell.ts";

const DEFAULT_BG_COLOR = "#FFF8F0";

// 18 calibrated Flexoki + Pastel-Punk ink pigments.
// Every chip stays <= 0.14 relative luminance and >= 4.6:1 contrast across all
// 6 scan-safe paper grounds so 1-tap picks always scan first try.
export const QUICK_PICK_COLORS = [
  { name: "Warm Ink", color: "#1E1714" },
  { name: "Espresso", color: "#3D2E28" },
  { name: "Crimson", color: "#9F1239" },
  { name: "Flexoki Red", color: "#AF3029" },
  { name: "Berry Pink", color: "#BE185D" },
  { name: "Flexoki Magenta", color: "#A02F6F" },
  { name: "Rust Orange", color: "#B43E0E" },
  { name: "Amber Roast", color: "#92400E" },
  { name: "Olive Press", color: "#4D6608" },
  { name: "Forest Green", color: "#166534" },
  { name: "Botanical Emerald", color: "#065F46" },
  { name: "Pine Teal", color: "#115E59" },
  { name: "Deep Pool", color: "#0E6480" },
  { name: "Flexoki Blue", color: "#205EA6" },
  { name: "Cobalt", color: "#1D4ED8" },
  { name: "Indigo Ink", color: "#3730A3" },
  { name: "Flexoki Purple", color: "#5E409D" },
  { name: "Electric Violet", color: "#6D28D9" },
] as const;

export const CURATED_DUOS = [
  {
    id: "berry-violet",
    en: "Berry × Violet",
    es: "Mora × Violeta",
    c1: "#BE185D",
    c2: "#6D28D9",
    angle: 135,
  },
  {
    id: "crimson-plum",
    en: "Crimson × Plum",
    es: "Carmesí × Ciruela",
    c1: "#9F1239",
    c2: "#5E409D",
    angle: 135,
  },
  {
    id: "forest-teal",
    en: "Forest × Pool",
    es: "Bosque × Laguna",
    c1: "#166534",
    c2: "#0E6480",
    angle: 135,
  },
  {
    id: "cobalt-magenta",
    en: "Cobalt × Orchid",
    es: "Cobalto × Orquídea",
    c1: "#1D4ED8",
    c2: "#A02F6F",
    angle: 135,
  },
  {
    id: "rust-ink",
    en: "Rust × Ink",
    es: "Óxido × Tinta",
    c1: "#B43E0E",
    c2: "#1E1714",
    angle: 135,
  },
  {
    id: "emerald-indigo",
    en: "Emerald × Indigo",
    es: "Esmeralda × Índigo",
    c1: "#065F46",
    c2: "#3730A3",
    angle: 135,
  },
] as const;

// Ground is strictly locked to high-luminance stationery stocks (>= 0.84 lum)
// so users can never invert the quiet zone or pick neon backgrounds.
export const GROUND_SWATCHES = [
  { name: "Warm Cream", es: "Crema", color: "#FFF8F0" },
  { name: "Warm Paper", es: "Papel", color: "#FFFEF7" },
  { name: "Blush Paper", es: "Rosa pálido", color: "#FDF2F8" },
  { name: "Butter", es: "Mantequilla", color: "#FEF9C3" },
  { name: "Sky Paper", es: "Cielo", color: "#F0F9FF" },
  { name: "Matcha Mist", es: "Matcha", color: "#F0FDF4" },
] as const;

const ANGLE_PRESETS = [
  { deg: 135, glyph: "↘" },
  { deg: 90, glyph: "→" },
  { deg: 180, glyph: "↓" },
  { deg: 45, glyph: "↗" },
] as const;

export type ColorFillMode = "solid" | "linear" | "radial";

interface HsvColor {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export function normalizeHexInput(raw: string): string | null {
  const clean = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const expanded = clean
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase();
    return `#${expanded}`;
  }
  return null;
}

export function hexToHsv(hex: string): HsvColor {
  const norm = normalizeHexInput(hex) ?? "#BE185D";
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / d + 2) * 60;
    } else {
      h = ((r - g) / d + 4) * 60;
    }
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h: ((h % 360) + 360) % 360, s, v };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const val = Math.max(0, Math.min(1, v));

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const toByte = (n: number) =>
    Math.max(0, Math.min(255, Math.round((n + m) * 255)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toByte(r1)}${toByte(g1)}${toByte(b1)}`;
}

/**
 * Clamps any arbitrary colour into a rich, print-scannable QR ink (>= 4.55:1
 * contrast against the active paper stock, <= 0.18 relative luminance).
 * Intentional neutrals remain crisp charcoal; washed-out pastels become deep pigment.
 */
export function clampInkToScanSafe(
  hex: string,
  bgHex: string = DEFAULT_BG_COLOR,
): string {
  const norm = normalizeHexInput(hex) ?? "#BE185D";
  const safeBg = relativeLuminance(bgHex) < 0.72 ? DEFAULT_BG_COLOR : bgHex;
  const checkBg = safeBg.toUpperCase() === DEFAULT_BG_COLOR
    ? "#FFF0F7"
    : safeBg;

  if (
    contrastRatio(norm, checkBg) >= 4.55 &&
    relativeLuminance(norm) <= 0.18
  ) {
    return norm;
  }

  const hsv = hexToHsv(norm);
  const sat = hsv.s < 0.12 ? hsv.s : Math.max(hsv.s, 0.62);
  let val = Math.min(hsv.v, 0.78);
  let candidate = norm;

  for (let step = 0; step < 32; step++) {
    candidate = hsvToHex(hsv.h, sat, val);
    if (
      contrastRatio(candidate, checkBg) >= 4.6 &&
      relativeLuminance(candidate) <= 0.18
    ) {
      return candidate;
    }
    val = Math.max(0.12, val - 0.03);
  }
  return candidate;
}

/** One-tap contrast auto-fixer: ensures light ground and clamps stops to >= 4.5:1. */
export function autoFixPaletteContrast(
  stops: readonly ColorStop[],
  bg: string,
): { stops: ColorStop[]; bgColor: string } {
  const nextBg = relativeLuminance(bg) < 0.72 ? DEFAULT_BG_COLOR : bg;
  const fixedStops = stops.map((stop) => ({
    ...stop,
    color: clampInkToScanSafe(stop.color, nextBg),
  }));
  return { stops: fixedStops, bgColor: nextBg };
}

function sanitizeGroundColor(raw?: string): string {
  const norm = raw ? normalizeHexInput(raw) : null;
  if (!norm || relativeLuminance(norm) < 0.72) return DEFAULT_BG_COLOR;
  const matched = GROUND_SWATCHES.find((s) =>
    s.color.toUpperCase() === norm.toUpperCase()
  );
  return matched ? matched.color : DEFAULT_BG_COLOR;
}

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperConstructor {
  new (): { open: () => Promise<EyeDropperResult> };
}

interface GradientCreatorProps {
  onCustomGradient: (gradient: QRStyle) => void;
  isOpen: Signal<boolean>;
  initialStyle?: QRStyle | null;
  previewData?: string;
  lang?: Locale;
  zIndexClass?: string;
}

export default function GradientCreator(
  {
    onCustomGradient,
    isOpen,
    initialStyle,
    previewData,
    lang,
    zIndexClass = "z-[60]",
  }: GradientCreatorProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [fillMode, setFillMode] = useState<ColorFillMode>("linear");
  const [rotation, setRotation] = useState(135);
  const [target, setTarget] = useState<number>(0);
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { offset: 0, color: "#BE185D" },
    { offset: 1, color: "#6D28D9" },
  ]);
  const [hexDraft, setHexDraft] = useState("#BE185D");
  const [hsvState, setHsvState] = useState<HsvColor>(() => hexToHsv("#BE185D"));
  const svPadRef = useRef<HTMLDivElement>(null);

  const supportsEyeDropper = typeof globalThis !== "undefined" &&
    "EyeDropper" in globalThis;

  // Hydrate from existing custom style when opened, sanitizing any legacy
  // low-contrast or dark-ground palettes into scan-safe ink on light paper.
  useEffect(() => {
    if (!isOpen.value || !initialStyle?.dots) return;
    const nextBg = sanitizeGroundColor(initialStyle.background?.color);
    setBgColor(nextBg);

    if (initialStyle.dots.gradient?.colorStops?.length) {
      const grad = initialStyle.dots.gradient;
      setFillMode(grad.type === "radial" ? "radial" : "linear");
      if (typeof grad.rotation === "number") {
        setRotation(
          Math.round(((grad.rotation * 180) / Math.PI + 360) % 360),
        );
      }
      const nextStops = grad.colorStops.slice(0, 3).map((s) => ({
        offset: s.offset,
        color: clampInkToScanSafe(s.color, nextBg),
      }));
      setColorStops(
        nextStops.length >= 2 ? nextStops : [
          { offset: 0, color: nextStops[0]?.color ?? "#BE185D" },
          { offset: 1, color: "#6D28D9" },
        ],
      );
      setTarget(0);
    } else if (initialStyle.dots.color) {
      const c = clampInkToScanSafe(initialStyle.dots.color, nextBg);
      setFillMode("solid");
      setColorStops([
        { offset: 0, color: c },
        { offset: 1, color: "#6D28D9" },
      ]);
      setTarget(0);
    }
  }, [isOpen.value]);

  const shell = useModalShell({
    open: isOpen.value,
    onClose: () => {
      isOpen.value = false;
    },
  });

  const safeStopIndex = Math.min(target, colorStops.length - 1);
  const activeHex = colorStops[safeStopIndex]?.color ?? "#BE185D";

  // Sync hexDraft and HSV state whenever target switches or external swatch updates activeHex
  useEffect(() => {
    const norm = normalizeHexInput(activeHex);
    if (norm) {
      setHexDraft(norm);
      const currentFromHsv = hsvToHex(hsvState.h, hsvState.s, hsvState.v);
      if (currentFromHsv.toUpperCase() !== norm.toUpperCase()) {
        setHsvState(hexToHsv(norm));
      }
    }
  }, [activeHex, target]);

  const setActiveSafeInk = (rawHex: string, ground = bgColor) => {
    const safeHex = clampInkToScanSafe(rawHex, ground);
    setHexDraft(safeHex);
    setHsvState(hexToHsv(safeHex));
    const idx = fillMode === "solid" ? 0 : safeStopIndex;
    setColorStops((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], color: safeHex };
      return next;
    });
  };

  const applyHsvChange = (next: HsvColor) => {
    const rawHex = hsvToHex(next.h, next.s, next.v);
    const safeHex = clampInkToScanSafe(rawHex, bgColor);
    setHsvState(hexToHsv(safeHex));
    setHexDraft(safeHex);
    const idx = fillMode === "solid" ? 0 : safeStopIndex;
    setColorStops((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], color: safeHex };
      return copy;
    });
  };

  const updateSvFromPointer = (clientX: number, clientY: number) => {
    const el = svPadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // Map vertical drag directly into the deep, scan-safe ink brightness band (0.14..0.76)
    const rawRatio = Math.max(
      0,
      Math.min(1, 1 - (clientY - rect.top) / rect.height),
    );
    const v = 0.14 + rawRatio * 0.62;
    applyHsvChange({ h: hsvState.h, s, v });
  };

  const selectDuoRecipe = (duo: (typeof CURATED_DUOS)[number]) => {
    const c1 = clampInkToScanSafe(duo.c1, bgColor);
    const c2 = clampInkToScanSafe(duo.c2, bgColor);
    if (fillMode === "solid") {
      setFillMode("linear");
    }
    setRotation(duo.angle);
    setColorStops([
      { offset: 0, color: c1 },
      { offset: 1, color: c2 },
    ]);
    setTarget(0);
    setHexDraft(c1);
    setHsvState(hexToHsv(c1));
    haptics.light();
    sounds.click();
  };

  const addColorStop = () => {
    if (colorStops.length >= 3) return;
    const midColor = clampInkToScanSafe(
      QUICK_PICK_COLORS[(colorStops.length * 4 + 3) % QUICK_PICK_COLORS.length]
        .color,
      bgColor,
    );
    const next = [
      ...colorStops,
      { offset: 0.5, color: midColor },
    ].sort((a, b) => a.offset - b.offset);
    const insertedIdx = next.findIndex((s) =>
      s.offset === 0.5 && s.color === midColor
    );
    setColorStops(next);
    setTarget(insertedIdx >= 0 ? insertedIdx : next.length - 1);
    haptics.light();
    sounds.click();
  };

  const removeColorStop = (index: number) => {
    if (colorStops.length <= 2) return;
    const next = colorStops.filter((_, i) => i !== index);
    setColorStops(next);
    setTarget(Math.min(target, next.length - 1));
    haptics.medium();
  };

  const reverseStops = () => {
    const reversed = [...colorStops]
      .reverse()
      .map((stop, idx, arr) => ({
        color: stop.color,
        offset: arr.length > 1
          ? Number((1 - arr[arr.length - 1 - idx].offset).toFixed(2))
          : 0,
      }))
      .sort((a, b) => a.offset - b.offset);
    setColorStops(reversed);
    haptics.light();
    sounds.click();
  };

  const updateStopOffset = (index: number, offset: number) => {
    const targetColor = colorStops[index]?.color;
    const next = colorStops
      .map((s, i) => (i === index ? { ...s, offset } : s))
      .sort((a, b) => a.offset - b.offset);
    setColorStops(next);
    const movedIdx = next.findIndex((s) =>
      s.color === targetColor && s.offset === offset
    );
    if (movedIdx >= 0) setTarget(movedIdx);
  };

  const selectGroundSwatch = (nextGround: string) => {
    setBgColor(nextGround);
    setColorStops((prev) =>
      prev.map((stop) => ({
        ...stop,
        color: clampInkToScanSafe(stop.color, nextGround),
      }))
    );
    haptics.light();
    sounds.click();
  };

  const buildDraftQrStyle = (): QRStyle => {
    const primaryColor = colorStops[0]?.color || "#BE185D";
    const lastColor = fillMode === "solid"
      ? primaryColor
      : (colorStops[colorStops.length - 1]?.color || primaryColor);

    const background = bgColor.toUpperCase() === DEFAULT_BG_COLOR
      ? {
        type: "gradient" as const,
        gradient: {
          type: "linear" as const,
          rotation: Math.PI * 0.75,
          colorStops: [
            { offset: 0, color: "#FFF8F0" },
            { offset: 1, color: "#FFF0F7" },
          ],
        },
      }
      : { color: bgColor };

    // Preserve active Look, Print Press, and Module Shape from initialStyle
    // so editing colors never strips Halftone, Flat Foil, Riso, or Gem settings.
    const preservedLook: Partial<QRStyle> = {};
    if (initialStyle?.centerShape) {
      preservedLook.centerShape = initialStyle.centerShape;
    }
    if (initialStyle?.renderMode) {
      preservedLook.renderMode = initialStyle.renderMode;
    }
    if (initialStyle?.artImage) preservedLook.artImage = initialStyle.artImage;
    if (initialStyle?.artSample) {
      preservedLook.artSample = initialStyle.artSample;
    }
    if (initialStyle?.halftoneTone) {
      preservedLook.halftoneTone = initialStyle.halftoneTone;
    }
    if (initialStyle?.halftoneShape) {
      preservedLook.halftoneShape = initialStyle.halftoneShape;
    }
    if (initialStyle?.halftoneDetail) {
      preservedLook.halftoneDetail = initialStyle.halftoneDetail;
    }
    if (initialStyle?.foilDepth) {
      preservedLook.foilDepth = initialStyle.foilDepth;
    }
    if (initialStyle?.print) preservedLook.print = initialStyle.print;

    const preservedDotShape = initialStyle?.dots?.shape;
    const preservedCornerSquareShape = initialStyle?.cornersSquare?.shape;
    const preservedCornerDotShape = initialStyle?.cornersDot?.shape;

    if (fillMode === "solid") {
      return {
        ...preservedLook,
        dots: {
          ...(preservedDotShape ? { shape: preservedDotShape } : {}),
          color: primaryColor,
        },
        background,
        cornersSquare: {
          ...(preservedCornerSquareShape
            ? { shape: preservedCornerSquareShape }
            : {}),
          color: primaryColor,
        },
        cornersDot: {
          ...(preservedCornerDotShape
            ? { shape: preservedCornerDotShape }
            : {}),
          color: primaryColor,
        },
      };
    }

    return {
      ...preservedLook,
      dots: {
        ...(preservedDotShape ? { shape: preservedDotShape } : {}),
        type: "gradient",
        gradient: {
          type: fillMode,
          rotation: fillMode === "linear"
            ? (rotation * Math.PI) / 180
            : undefined,
          colorStops: colorStops.map((stop) => ({
            offset: stop.offset,
            color: stop.color,
          })),
        },
      },
      background,
      cornersSquare: {
        ...(preservedCornerSquareShape
          ? { shape: preservedCornerSquareShape }
          : {}),
        color: primaryColor,
      },
      cornersDot: {
        ...(preservedCornerDotShape ? { shape: preservedCornerDotShape } : {}),
        color: lastColor,
      },
    };
  };

  const draftStyle = useMemo(
    () => buildDraftQrStyle(),
    [fillMode, rotation, colorStops, bgColor, initialStyle],
  );

  const liveQrPreviewUrl = useMemo(() => {
    try {
      const svg = styledQrSvg({
        size: 320,
        data: previewData?.trim() || "https://qrbuddy.app",
        style: draftStyle,
      });
      return toSvgDataUrl(svg);
    } catch {
      return "";
    }
  }, [draftStyle, previewData]);

  const effectiveStops = fillMode === "solid"
    ? [colorStops[0] ?? { offset: 0, color: "#BE185D" }]
    : colorStops;

  const effectiveBgForCheck = bgColor.toUpperCase() === DEFAULT_BG_COLOR
    ? "#FFF0F7"
    : bgColor;
  const contrast = evaluateQrContrast(
    effectiveStops.map((stop) => stop.color),
    effectiveBgForCheck,
  );
  const isScanSafe = !contrast.inverted && contrast.minRatio >= 4.5;

  const applyCustomColors = () => {
    if (!isScanSafe) {
      const fixed = autoFixPaletteContrast(colorStops, bgColor);
      setColorStops(fixed.stops);
      setBgColor(fixed.bgColor);
      haptics.medium();
      return;
    }
    onCustomGradient(draftStyle);
    shell.requestClose();
    haptics.success();
    sounds.success();
  };

  const getSwatchBarBackground = () => {
    if (fillMode === "solid") {
      return colorStops[0]?.color || "#BE185D";
    }
    const stopString = colorStops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(", ");
    return fillMode === "linear"
      ? `linear-gradient(${rotation}deg, ${stopString})`
      : `radial-gradient(circle, ${stopString})`;
  };

  const handleEyeDropper = async () => {
    if (!supportsEyeDropper) return;
    try {
      const Ctor = (
        globalThis as unknown as { EyeDropper: EyeDropperConstructor }
      ).EyeDropper;
      const dropper = new Ctor();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        const norm = normalizeHexInput(result.sRGBHex);
        if (norm) {
          setActiveSafeInk(norm);
          haptics.light();
          sounds.click();
        }
      }
    } catch {
      // User cancelled eyedropper
    }
  };

  if (!shell.mounted) return null;

  const guardrailMessage = !isScanSafe
    ? (contrast.inverted
      ? (isSpanish
        ? "Paleta invertida: módulos claros sobre fondo oscuro fallan al escanear"
        : "Inverted palette: light modules on dark ground fail cameras")
      : (isSpanish
        ? `Contraste bajo (${
          contrast.minRatio.toFixed(1)
        }:1) — mínimo 4.5:1 para impresión`
        : `Low contrast (${
          contrast.minRatio.toFixed(1)
        }:1) — locked at 4.5:1+ for reliable scans`))
    : null;

  const pureHueHex = hsvToHex(hsvState.h, 1, 0.76);
  const activeGroundObj =
    GROUND_SWATCHES.find((s) =>
      s.color.toUpperCase() === bgColor.toUpperCase()
    ) ?? GROUND_SWATCHES[0];

  return (
    <div
      class={`fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center p-0 sm:p-5`}
    >
      <div
        ref={shell.backdropRef}
        class={`absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm charm-modal-backdrop animate-fade-in${
          shell.closing
            ? " charm-modal-backdrop--closing charm-modal--closing"
            : ""
        }`}
        onClick={shell.onBackdropClick}
      />
      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gradient-creator-title"
        tabindex={-1}
        class={`relative z-10 w-full max-w-lg bg-[#fbf1e4] border-t-4 sm:border-3 border-[#1e1714] rounded-t-3xl sm:rounded-3xl shadow-chunky-hover flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[88dvh] charm-modal-sheet animate-slide-up sm:animate-pop-in${
          shell.closing ? " charm-modal--closing" : ""
        }`}
      >
        {/* Header */}
        <div class="flex items-start justify-between gap-3 px-4 pt-4 pb-2.5 sm:px-6 sm:pt-5 border-b-2 border-[#1e1714]/10">
          <div class="min-w-0">
            <h2
              id="gradient-creator-title"
              class="text-xl sm:text-2xl font-black text-[#1e1714] tracking-tight leading-tight"
            >
              {isSpanish ? "Estudio de color." : "Color studio."}
            </h2>
            <p class="text-xs sm:text-sm font-bold text-[#5c4f47]">
              {isSpanish
                ? "Pigmentos bloqueados a contraste seguro (4.5:1+)."
                : "Print-safe inks & duos, scan-locked at 4.5:1+."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              shell.requestClose();
              haptics.light();
            }}
            aria-label={isSpanish
              ? "Cerrar estudio de color"
              : "Close color studio"}
            class="qr-modal-close-btn shrink-0"
          >
            <svg
              class="w-4 h-4 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3.25"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6.5 6.5l11 11m0-11l-11 11" />
            </svg>
          </button>
        </div>

        {/* Scrollable Studio Body */}
        <div class="flex-1 min-h-0 overflow-y-auto scrollbar-none px-4 py-3.5 sm:px-6 space-y-3">
          {/* 1. Live QR + Enamel Stage + Contrast Lock Badge */}
          <div class="qr-menu-pod p-3 space-y-2.5">
            <div class="flex items-center gap-3">
              {liveQrPreviewUrl && (
                <div class="w-[92px] h-[92px] shrink-0 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] p-1 flex items-center justify-center shadow-[1.5px_1.5px_0_#1e1714]">
                  <img
                    src={liveQrPreviewUrl}
                    alt={isSpanish
                      ? "Vista previa del QR"
                      : "Live color QR preview"}
                    width="84"
                    height="84"
                    class="w-full h-full object-contain rounded-lg"
                  />
                </div>
              )}

              <div class="min-w-0 flex-1 space-y-2">
                {/* Enamel Fill Strip */}
                <div
                  class="w-full h-11 rounded-xl border-2 border-[#1e1714] shadow-[1.5px_1.5px_0_#1e1714]"
                  style={{ background: getSwatchBarBackground() }}
                />

                {/* Contrast Pill + Auto-Lock Action */}
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    class={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-black tabular-nums ${
                      guardrailMessage
                        ? "border-amber-500 bg-amber-100 text-amber-950"
                        : "border-[#1e1714] bg-[#dcfce7] text-[#1e1714]"
                    }`}
                  >
                    <span>{guardrailMessage ? "⚠" : "✓"}</span>
                    <span>
                      {contrast.minRatio.toFixed(1)}:1 · {guardrailMessage
                        ? (isSpanish ? "Ajustar" : "Needs shade lock")
                        : (isSpanish ? "Escaneo seguro" : "Scan-safe")}
                    </span>
                  </span>

                  {guardrailMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        const fixed = autoFixPaletteContrast(
                          colorStops,
                          bgColor,
                        );
                        setColorStops(fixed.stops);
                        setBgColor(fixed.bgColor);
                        const nextHex = fixed.stops[safeStopIndex]?.color ??
                          "#BE185D";
                        setHsvState(hexToHsv(nextHex));
                        setHexDraft(nextHex);
                        haptics.medium();
                        sounds.click();
                      }}
                      class="min-h-[28px] px-2.5 py-0.5 rounded-full border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-[11px] font-black text-[#1e1714] shadow-[1.5px_1.5px_0_#1e1714] active:translate-y-[1px] transition-all"
                    >
                      ⚡ {isSpanish ? "Bloquear tono" : "Lock scan-safe"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {guardrailMessage && (
              <div
                role="status"
                aria-live="polite"
                data-contrast-guardrail
                class="bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-xl px-3 py-2 text-xs font-bold leading-snug"
              >
                {guardrailMessage}
              </div>
            )}
          </div>

          {/* 2. Fill Style + Curated Duo Recipes */}
          <div class="qr-menu-pod p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="qr-section-eyebrow">
                <span class="qr-section-pip" aria-hidden="true" />
                <span>{isSpanish ? "Modo de tinta" : "Fill style"}</span>
              </span>
              {fillMode !== "solid" && (
                <button
                  type="button"
                  onClick={reverseStops}
                  class="min-h-[28px] px-2.5 rounded-full border-[1.5px] border-[#1e1714]/30 hover:border-[#1e1714] bg-[#fbf1e4] text-[11px] font-black text-[#1e1714] transition-colors"
                >
                  ⇄ {isSpanish ? "Invertir" : "Flip stops"}
                </button>
              )}
            </div>

            <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]">
              {([
                { id: "solid", en: "Solid", es: "Sólido" },
                { id: "linear", en: "Linear", es: "Lineal" },
                { id: "radial", en: "Radial", es: "Radial" },
              ] as const).map((mode) => {
                const active = fillMode === mode.id;
                return (
                  <button
                    type="button"
                    key={mode.id}
                    aria-pressed={active}
                    onClick={() => {
                      setFillMode(mode.id);
                      if (mode.id === "solid" && target > 0) {
                        setTarget(0);
                      }
                      haptics.light();
                      sounds.click();
                    }}
                    class={`min-h-[36px] px-2 rounded-lg text-xs font-black transition-all border-2 ${
                      active
                        ? "bg-[#ffbe0b] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                        : "border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/60"
                    }`}
                  >
                    {isSpanish ? mode.es : mode.en}
                  </button>
                );
              })}
            </div>

            {fillMode === "linear" && (
              <div class="flex items-center gap-2 pt-0.5">
                <div class="flex items-center gap-1 shrink-0">
                  {ANGLE_PRESETS.map((preset) => {
                    const active = rotation === preset.deg;
                    return (
                      <button
                        key={preset.deg}
                        type="button"
                        onClick={() => {
                          setRotation(preset.deg);
                          haptics.light();
                        }}
                        title={`${preset.deg}°`}
                        aria-label={`Angle ${preset.deg} degrees`}
                        class={`w-8 h-8 rounded-lg border-2 text-xs font-black flex items-center justify-center transition-all ${
                          active
                            ? "border-[#1e1714] bg-[#fbf1e4] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                            : "border-[#1e1714]/20 bg-[#fffef7] text-[#4a3f39] hover:border-[#1e1714]"
                        }`}
                      >
                        {preset.glyph}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  aria-label="Gradient angle"
                  onInput={(e) =>
                    setRotation(parseInt((e.target as HTMLInputElement).value))}
                  class="flex-1 min-w-0 accent-[#1e1714]"
                />
                <span class="text-xs font-mono font-black text-[#1e1714] w-9 text-right shrink-0">
                  {rotation}°
                </span>
              </div>
            )}

            {/* Guided Curated Duo Recipes (visible in Linear/Radial or as 1-tap upgrade) */}
            {fillMode !== "solid" && (
              <div class="space-y-1.5 pt-1 border-t border-[#1e1714]/10">
                <span class="block text-[11px] font-black text-[#4a3f39]">
                  {isSpanish
                    ? "Dúos recomendados (1 toque)"
                    : "Curated ink duos (1-tap)"}
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CURATED_DUOS.map((duo) => {
                    const isCurrentDuo = colorStops.length === 2 &&
                      colorStops[0]?.color.toUpperCase() ===
                        duo.c1.toUpperCase() &&
                      colorStops[1]?.color.toUpperCase() ===
                        duo.c2.toUpperCase();
                    return (
                      <button
                        key={duo.id}
                        type="button"
                        onClick={() => selectDuoRecipe(duo)}
                        class={`min-h-[34px] px-2 py-1 rounded-xl border-2 text-left flex items-center gap-2 transition-all ${
                          isCurrentDuo
                            ? "border-[#1e1714] bg-[#fbf1e4] shadow-[0_1.5px_0_#1e1714]"
                            : "border-[#1e1714]/20 bg-[#fffef7] hover:border-[#1e1714]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          class="w-5 h-5 rounded-full border-[1.5px] border-[#1e1714] shrink-0"
                          style={{
                            background:
                              `linear-gradient(135deg, ${duo.c1} 0%, ${duo.c2} 100%)`,
                          }}
                        />
                        <span class="text-[11px] font-black text-[#1e1714] truncate">
                          {isSpanish ? duo.es : duo.en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Ink Pigments + Fine-Tune Shade Drawer */}
          <div class="qr-menu-pod p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="qr-section-eyebrow">
                <span class="qr-section-pip" aria-hidden="true" />
                <span>{isSpanish ? "Pigmento de tinta" : "Ink pigment"}</span>
              </span>

              {/* Stop Target Pills (capped at 3 stops so gradients never turn muddy) */}
              {fillMode !== "solid" && (
                <div class="flex items-center gap-1 flex-wrap">
                  {colorStops.map((stop, idx) => {
                    const active = safeStopIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setTarget(idx);
                          haptics.light();
                        }}
                        class={`min-h-[30px] inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 text-[11px] font-black transition-all ${
                          active
                            ? "border-[#1e1714] bg-[#fbf1e4] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                            : "border-[#1e1714]/20 bg-[#fffef7] text-[#4a3f39] hover:border-[#1e1714]"
                        }`}
                      >
                        <span
                          class="w-3 h-3 rounded-full border border-[#1e1714] shrink-0"
                          style={{ backgroundColor: stop.color }}
                        />
                        <span>
                          {isSpanish ? `P${idx + 1}` : `Stop ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                  {colorStops.length < 3 && (
                    <button
                      type="button"
                      onClick={addColorStop}
                      aria-label={isSpanish ? "Añadir parada" : "Add 3rd stop"}
                      class="min-h-[30px] px-2.5 py-0.5 rounded-full border-2 border-[#1e1714]/30 hover:border-[#1e1714] bg-[#fffef7] text-[11px] font-black text-[#1e1714] transition-all"
                    >
                      + {isSpanish ? "3ª" : "3rd"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3-Stop midpoint position & remove bar */}
            {fillMode !== "solid" && colorStops.length > 2 && (
              <div class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-[#fbf1e4] border border-[#1e1714]/15">
                <span class="text-[11px] font-black text-[#4a3f39] shrink-0">
                  {isSpanish ? "Posición" : "Stop pos"}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={colorStops[safeStopIndex]?.offset ?? 0}
                  aria-label={`Stop ${safeStopIndex + 1} position`}
                  onInput={(e) =>
                    updateStopOffset(
                      safeStopIndex,
                      parseFloat((e.target as HTMLInputElement).value),
                    )}
                  class="flex-1 accent-[#1e1714]"
                />
                <span class="text-xs font-mono font-black text-[#1e1714] w-9 text-right shrink-0">
                  {Math.round((colorStops[safeStopIndex]?.offset ?? 0) * 100)}%
                </span>
                <button
                  type="button"
                  aria-label={`Remove stop ${safeStopIndex + 1}`}
                  onClick={() => removeColorStop(safeStopIndex)}
                  class="w-6 h-6 rounded-full border-[1.5px] border-[#1e1714]/30 hover:border-[#1e1714] bg-[#fffef7] text-[#1e1714] text-[11px] font-black flex items-center justify-center shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 18 Calibrated Ink Pigments (Primary Guided Choice) */}
            <div class="grid grid-cols-9 gap-1.5">
              {QUICK_PICK_COLORS.map((chip) => {
                const isSelected =
                  activeHex.toLowerCase() === chip.color.toLowerCase();
                return (
                  <button
                    type="button"
                    key={chip.color}
                    title={chip.name}
                    aria-label={`Pick ${chip.name} (${chip.color})`}
                    onClick={() => {
                      setActiveSafeInk(chip.color);
                      haptics.light();
                      sounds.click();
                    }}
                    class={`aspect-square w-full min-h-[30px] rounded-full border-2 border-[#1e1714] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                      isSelected
                        ? "ring-2 ring-offset-1 ring-[#1e1714] ring-offset-[#fffef7] scale-105"
                        : ""
                    }`}
                    style={{ backgroundColor: chip.color }}
                  >
                    {isSelected && (
                      <span class="text-[#fffef7] text-[10px] font-black drop-shadow">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Progressive Disclosure: Scan-Locked Custom Hue / Shade / HEX */}
            <details class="group pt-1 border-t border-[#1e1714]/10">
              <summary class="list-none cursor-pointer flex items-center justify-between py-1 text-xs font-black text-[#4a3f39] hover:text-[#1e1714] select-none">
                <span class="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    class="w-3.5 h-3.5 rounded-full border border-[#1e1714]"
                    style={{ backgroundColor: activeHex }}
                  />
                  <span>
                    {isSpanish
                      ? "Ajustar matiz y código HEX"
                      : "Fine-tune shade & HEX"}
                  </span>
                </span>
                <span class="font-mono text-[11px] text-[#5c4f47] group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>

              <div class="pt-2.5 space-y-2.5">
                {/* Scan-Clamped 2D Ink Pad */}
                <div
                  ref={svPadRef}
                  role="slider"
                  tabIndex={0}
                  aria-label={isSpanish
                    ? "Lienzo de saturación e intensidad de tinta"
                    : "Scan-locked saturation and ink depth picker"}
                  aria-valuenow={Math.round(hsvState.v * 100)}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    updateSvFromPointer(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      updateSvFromPointer(e.clientX, e.clientY);
                    }
                  }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 0.08 : 0.03;
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      applyHsvChange({
                        ...hsvState,
                        s: Math.min(1, hsvState.s + step),
                      });
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      applyHsvChange({
                        ...hsvState,
                        s: Math.max(0, hsvState.s - step),
                      });
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      applyHsvChange({
                        ...hsvState,
                        v: Math.min(0.78, hsvState.v + step),
                      });
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      applyHsvChange({
                        ...hsvState,
                        v: Math.max(0.14, hsvState.v - step),
                      });
                    }
                  }}
                  class="relative w-full h-28 rounded-xl border-2 border-[#1e1714] overflow-hidden cursor-crosshair touch-none select-none shadow-[inset_0_1px_3px_rgba(30,23,20,0.2)]"
                  style={{
                    backgroundColor: pureHueHex,
                    backgroundImage:
                      "linear-gradient(to top, rgb(20 16 14), transparent), linear-gradient(to right, rgb(92 88 84), transparent)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-[#fffef7] ring-2 ring-[#1e1714] shadow-md"
                    style={{
                      left: `${hsvState.s * 100}%`,
                      top: `${
                        Math.max(
                          0,
                          Math.min(100, (1 - (hsvState.v - 0.14) / 0.62) * 100),
                        )
                      }%`,
                      backgroundColor: activeHex,
                    }}
                  />
                </div>

                {/* 360° Hue Slider */}
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[11px] font-black text-[#4a3f39]">
                    <span>{isSpanish ? "Matiz (360°)" : "Hue (360°)"}</span>
                    <span class="font-mono">{Math.round(hsvState.h)}°</span>
                  </div>
                  <div
                    class="h-5 rounded-full border-2 border-[#1e1714] px-1 flex items-center"
                    style={{
                      background:
                        "linear-gradient(to right, hsl(0 85% 42%), hsl(60 85% 34%), hsl(120 80% 30%), hsl(180 85% 32%), hsl(240 85% 48%), hsl(300 85% 40%), hsl(360 85% 42%))",
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={Math.round(hsvState.h)}
                      aria-label={isSpanish ? "Matiz de color" : "Color hue"}
                      onInput={(e) => {
                        const nextH = parseInt(
                          (e.target as HTMLInputElement).value,
                          10,
                        );
                        applyHsvChange({
                          h: nextH,
                          s: hsvState.s < 0.12 ? 0.78 : hsvState.s,
                          v: hsvState.v < 0.16 ? 0.58 : hsvState.v,
                        });
                      }}
                      class="w-full accent-[#1e1714] bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                {/* HEX Input + Pipette + System Color Wheel (all clamped to scan-safe ink) */}
                <div class="flex items-center gap-2">
                  <div class="flex-1 flex items-center min-h-[38px] rounded-xl border-2 border-[#1e1714]/25 focus-within:border-[#1e1714] bg-[#fbf1e4] px-2.5 gap-2">
                    <span
                      aria-hidden="true"
                      class="w-4 h-4 rounded border border-[#1e1714] shrink-0"
                      style={{ backgroundColor: activeHex }}
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={hexDraft}
                      aria-label={isSpanish ? "Código HEX" : "HEX color code"}
                      onInput={(e) => {
                        const raw = (e.target as HTMLInputElement).value;
                        setHexDraft(raw);
                      }}
                      onBlur={() => {
                        const norm = normalizeHexInput(hexDraft);
                        if (norm) {
                          setActiveSafeInk(norm);
                        } else {
                          setHexDraft(activeHex);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      class="min-w-0 flex-1 bg-transparent font-mono text-xs font-black uppercase text-[#1e1714] focus:outline-none"
                    />
                  </div>

                  {supportsEyeDropper && (
                    <button
                      type="button"
                      onClick={handleEyeDropper}
                      title={isSpanish
                        ? "Cuentagotas de pantalla"
                        : "Pick color from screen"}
                      aria-label={isSpanish
                        ? "Cuentagotas de pantalla"
                        : "Pick color from screen"}
                      class="min-h-[38px] px-2.5 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#fbf1e4] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] active:translate-y-[1px] transition-all shrink-0"
                    >
                      💧 {isSpanish ? "Gotero" : "Pipette"}
                    </button>
                  )}

                  <label
                    title={isSpanish
                      ? "Selector del sistema"
                      : "System color wheel"}
                    class="w-9 h-[38px] rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center cursor-pointer shadow-[0_1.5px_0_#1e1714] shrink-0 overflow-hidden relative"
                  >
                    <span class="text-xs font-black pointer-events-none">
                      🎨
                    </span>
                    <input
                      type="color"
                      value={activeHex}
                      aria-label={`Stop ${safeStopIndex + 1} color`}
                      onInput={(e) => {
                        const val = (e.target as HTMLInputElement).value;
                        const norm = normalizeHexInput(val);
                        if (norm) {
                          setActiveSafeInk(norm);
                        }
                      }}
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            </details>
          </div>

          {/* 4. Paper Ground (Strictly Locked to 6 Scan-Safe Stationery Stocks) */}
          <div class="qr-menu-pod p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="qr-section-eyebrow">
                <span class="qr-section-pip" aria-hidden="true" />
                <span>{isSpanish ? "Papel de fondo" : "Paper stock"}</span>
              </span>
              <span class="text-[11px] font-bold text-[#5c4f47]">
                {isSpanish ? activeGroundObj.es : activeGroundObj.name}
              </span>
            </div>

            <div class="grid grid-cols-6 gap-2">
              {GROUND_SWATCHES.map((swatch) => {
                const selected =
                  bgColor.toUpperCase() === swatch.color.toUpperCase();
                return (
                  <button
                    key={swatch.color}
                    type="button"
                    title={swatch.name}
                    aria-label={`Pick ${swatch.name} (${swatch.color}) paper stock`}
                    aria-pressed={selected}
                    onClick={() => selectGroundSwatch(swatch.color)}
                    class={`h-9 rounded-xl border-2 border-[#1e1714] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                      selected
                        ? "ring-2 ring-offset-2 ring-[#1e1714] ring-offset-[#fffef7] shadow-[0_1.5px_0_#1e1714]"
                        : ""
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  >
                    {selected && (
                      <span class="text-[#1e1714] text-xs font-black">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div class="flex gap-2.5 p-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5 bg-[#fbf1e4] border-t-2 border-[#1e1714]/10">
          <button
            type="button"
            onClick={() => {
              shell.requestClose();
              haptics.light();
            }}
            class="min-h-[48px] px-5 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#efe9dc] text-sm sm:text-base font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] active:translate-y-[1px] transition-all shrink-0"
          >
            {isSpanish ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!isScanSafe}
            onClick={applyCustomColors}
            class="qr-pitch-cta flex-1 disabled:opacity-45 disabled:pointer-events-none"
          >
            {isSpanish ? "Aplicar colores" : "Apply colors"}
          </button>
        </div>
      </div>
    </div>
  );
}

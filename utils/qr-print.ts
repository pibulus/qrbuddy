/**
 * Print surface (`utils/qr-print.ts`).
 *
 * A look decides who the subject is. Print decides what it was printed *with*.
 * The two are orthogonal: any look can come off a clean press, a sheet of rough
 * stock, or a two-drum risograph.
 *
 * - `clean` — vector-clean. What the studio has always shipped.
 * - `paper` — tooth on the plate. Ink-dark specks at low alpha, sitting *under*
 *   the code, so no module ever changes and the decoder never notices.
 * - `riso` — paper, plus a second spot plate. On a module code the eye plate is
 *   registered a hair off and the inks go flat; on a halftone the picture is
 *   separated into the same two spots. Misregistration is the tell, and it is a
 *   *colour* effect: nothing is removed, so density cannot fight it the way the
 *   old stamped bite did.
 *
 * Everything is seeded from the payload, so a link always prints the same sheet.
 */

import { escapeXml } from "./svg-export.ts";

export type PrintStyle = "clean" | "paper" | "riso";

/** FNV-1a, folded into the 0–999 range `feTurbulence` accepts as a seed. */
export function printSeed(payload: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 997;
}

export interface PrintOptions {
  style: PrintStyle;
  seed: number;
  /** Card size in user units, used to keep the tooth proportional at any size. */
  size: number;
  /** Ink colour for the tooth specks. */
  ink: string;
}

/**
 * `feTurbulence` alpha is roughly N(0.5, 0.066), so density is a threshold, not
 * a multiplier: a soft ramp gives a grey veil, a hard step gives specks. The
 * intercept is solved against that distribution rather than guessed, because
 * guessing turned a 3% tooth into a 7% wash the first time round.
 */
const NOISE_MEAN = 0.495;
const NOISE_SIGMA = 0.066;

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26, accurate to 1.5e-7 — plenty for a threshold.
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
          t +
        0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

/** Intercept for a soft ramp that averages `coverage` ink. */
function rampIntercept(slope: number, coverage: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const t = (lo + hi) / 2;
    const z = (t - NOISE_MEAN) / NOISE_SIGMA;
    const tail = 0.3989422804 * Math.exp(-0.5 * z * z);
    const expected = NOISE_SIGMA * tail +
      (NOISE_MEAN - t) * (1 - 0.5 * (1 + erf(z * 0.7071067812)));
    if (slope * Math.max(0, expected) > coverage) lo = t;
    else hi = t;
  }
  return -slope * ((lo + hi) / 2);
}

/** Tooth frequency, normalised so a 600px preview and a 3000px print match. */
function toothFrequency(size: number): number {
  return 0.6 * (1000 / Math.max(120, size));
}

export function printFilterDefs(options: PrintOptions): string {
  if (options.style === "clean") return "";
  return [
    `<filter id="qrb-tooth" x="0" y="0" width="100%" height="100%">`,
    `  <feTurbulence type="fractalNoise" baseFrequency="${
      toothFrequency(options.size).toFixed(5)
    }" numOctaves="4" seed="${options.seed}" stitchTiles="stitch" result="n"/>`,
    // Alpha carries the noise's own luminance, so the ramp works on one channel
    // and the specks keep the colour of the flood.
    `  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.33 0.33 0.33 0 0" result="a"/>`,
    `  <feComponentTransfer in="a" result="t">`,
    `    <feFuncA type="linear" slope="2.6" intercept="${
      rampIntercept(2.6, 0.035).toFixed(4)
    }"/>`,
    `  </feComponentTransfer>`,
    `  <feFlood flood-color="${escapeXml(options.ink)}" result="f"/>`,
    `  <feComposite in="f" in2="t" operator="in" result="s"/>`,
    `  <feComposite in="s" in2="SourceGraphic" operator="in"/>`,
    `</filter>`,
  ].join("\n    ");
}

/**
 * The tooth. Drawn *under* the ink, so specks only ever sit on paper and a
 * decoder's sample of a dark module is never touched.
 */
export function printTooth(
  options: PrintOptions,
  x: number,
  y: number,
  w: number,
  h: number,
  rx = 0,
): string {
  if (options.style === "clean") return "";
  const radius = rx > 0 ? ` rx="${rx}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${radius} fill="${
    escapeXml(options.ink)
  }" opacity="0.5" filter="url(#qrb-tooth)"/>`;
}

/** Plate misregistration for the spot drum: under 0.6% of the card, both axes. */
export interface RisoOffset {
  dx: number;
  dy: number;
  /** Degrees. A print drum never lands perfectly square either. */
  rotate: number;
}

export function risoOffset(seed: number, size: number): RisoOffset {
  // Two decorrelated draws from the same seed, kept small on purpose: at 1000px
  // this is 2.5–5.5px, which reads as a print run and never moves an eye far
  // enough for a locator to miss.
  const a = ((seed * 2654435761) % 1000) / 1000;
  const b = ((seed * 40503 + 12345) % 1000) / 1000;
  const c = ((seed * 69069 + 7) % 1000) / 1000;
  const reach = size * 0.0035;
  return {
    dx: (a * 2 - 1) * reach + Math.sign(a - 0.5) * size * 0.0012,
    dy: (b * 2 - 1) * reach + Math.sign(b - 0.5) * size * 0.0012,
    rotate: (c * 2 - 1) * 0.35,
  };
}

/* ─────────────────────────── Riso drums ─────────────────────────────── */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return "#" +
    rgb.map((v) =>
      Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
    ).join("");
}

function rgbToHsl(
  [r, g, b]: [number, number, number],
): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(
  [h, s, l]: [number, number, number],
): string {
  const hue = ((h % 1) + 1) % 1;
  if (s === 0) {
    const v = Math.round(l * 255);
    return toHex([v, v, v]);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return toHex([
    channel(hue + 1 / 3) * 255,
    channel(hue) * 255,
    channel(hue - 1 / 3) * 255,
  ]);
}

/**
 * A risograph prints two drums. Which two matters: the **data** drum has to
 * carry density, so it is the darkest ink the palette offers; the **spot** drum
 * is the accent, so it is whichever ink sits furthest from it. Reading the
 * gradient's first stop instead put vivid orange under the code at 2.6:1 and
 * printed a dud.
 *
 * When the palette only has one ink (Classic, Brutal, Matrix), the press mixes a
 * second drum from the same hue rather than printing the same colour twice and
 * calling the offset a design.
 */
export function risoInks(inks: string[], paper: string): [string, string] {
  const candidates = inks.length ? inks : ["#1e1714"];
  const lums = candidates.map(srgbLuminance);
  const darkest = candidates[lums.indexOf(Math.min(...lums))];
  let spot = darkest;
  let reach = -1;
  for (const ink of candidates) {
    const a = toRgb(darkest);
    const b = toRgb(ink);
    const gap = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (gap > reach) {
      reach = gap;
      spot = ink;
    }
  }
  const data = ensureContrast(darkest, paper);
  if (reach >= 60) return [data, ensureContrast(spot, paper)];
  const [h, s, l] = rgbToHsl(toRgb(spot));
  return [
    data,
    ensureContrast(
      hslToHex([h + 0.09, Math.max(s, 0.45), Math.max(l, 0.24)]),
      paper,
    ),
  ];
}

/* ─────────────────────────── Density ────────────────────────────────── */

function srgbLuminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function printContrast(a: string, b: string): number {
  const la = srgbLuminance(a);
  const lb = srgbLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Minimum ink-to-paper contrast a riso drum is allowed to land on. */
const MIN_CONTRAST = 4.6;

/**
 * A press mixes ink until it hits density; a palette built for a gradient is
 * not automatically a flat ink. Each drum walks away from the paper until it
 * clears the floor, so `riso` can never quietly print the low-contrast code the
 * gate exists to catch.
 */
export function ensureContrast(ink: string, paper: string): string {
  if (printContrast(ink, paper) >= MIN_CONTRAST) return ink;
  const dark = srgbLuminance(paper) > 0.5;
  let [h, s, l] = rgbToHsl(toRgb(ink));
  let out = ink;
  for (let i = 0; i < 24 && printContrast(out, paper) < MIN_CONTRAST; i++) {
    l = Math.max(0.02, Math.min(0.98, l + (dark ? -0.05 : 0.05)));
    out = hslToHex([h, Math.min(1, s * 1.04), l]);
  }
  return out;
}

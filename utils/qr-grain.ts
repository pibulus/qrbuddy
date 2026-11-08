/**
 * Print grain (`utils/qr-grain.ts`).
 *
 * Every look so far is vector-clean, which is exactly what makes it read as
 * *software* rather than as a printed thing. Grain is the surface axis: it
 * changes nothing about who the subject is, only whether the object looks
 * manufactured or made.
 *
 * Two levels, both seeded from the payload so a link always renders the same
 * picture:
 *
 * - `paper` — tooth on the plate. Ink-dark specks at low alpha, sitting *under*
 *   the code. Costs the decoder nothing because no module ever changes.
 * - `stamp` — paper, plus paper specks punched back out of the data ink, plus a
 *   small displacement warp on the classic module edges. The eyes stay sharp and
 *   the body gets rough; that split is the whole safety argument.
 *
 * The bite is drawn as a paper-coloured overlay clipped to the plate rather than
 * as a filter on the ink group. A filter on the halftone's sub-grid forces an
 * offscreen raster that loses enough fine detail to break the 250px probe — the
 * overlay gets the same picture without touching the geometry at all.
 */

import { escapeXml } from "./svg-export.ts";

export type GrainLevel = "none" | "paper" | "stamp";

/** FNV-1a, folded into the 0–999 range `feTurbulence` accepts as a seed. */
export function grainSeed(payload: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 997;
}

export interface GrainOptions {
  level: GrainLevel;
  seed: number;
  /** One module in user units — grain is measured against the code, not the card. */
  cell: number;
  /** Card size in user units, used to keep the tooth proportional at any export size. */
  size: number;
  /** Ink colour for the tooth specks. */
  ink: string;
  /** Paper colour for the bites. */
  paper: string;
  /** Test hook: displacement as a share of one module. */
  warpShare?: number;
  /** Test hook: noise threshold for the bite, 0–1. Higher leaves more ink. */
  biteDensity?: number;
  /** Test hook: bite clump size, as a multiple of one module. */
  biteScale?: number;
}

/**
 * Displacement is a fraction of a module, not of the card: 0.12 of a cell is
 * visible as bleed on a 22px module and invisible on an 8px preview, and it
 * never moves a module centre far enough for a decoder's sample to miss.
 */
const WARP_SHARE = 0.12;

/** Measured on the 250px probe: 5% of the ink removed still decodes clean. */
const BITE_DENSITY = 0.05;

/**
 * `feTurbulence` alpha is roughly N(0.5, 0.066), so density is a threshold, not
 * a multiplier: a soft ramp gives a grey veil, a hard step gives specks. Both
 * are calibrated against that distribution instead of guessed, because guessing
 * turned a 3% tooth into a 7% wash the first time round.
 */
const NOISE_MEAN = 0.495;
const NOISE_SIGMA = 0.066;

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

/** A discrete table that flips to full ink at `threshold`. */
function stepTable(threshold: number): string {
  const bins = 20;
  const k = Math.max(1, Math.min(bins - 1, Math.round(threshold * bins)));
  return [
    ...new Array(k).fill("0"),
    ...new Array(bins - k).fill("1"),
  ].join(" ");
}

/** Tooth frequency, normalised so a 600px preview and a 3000px print match. */
function toothFrequency(size: number): number {
  return 0.6 * (1000 / Math.max(120, size));
}

interface SpeckleSpec {
  id: string;
  freq: number;
  octaves: number;
  seed: number;
  ink: string;
  /** Soft ramp: average ink coverage. */
  coverage?: number;
  /** Hard step: share of the field punched to full ink. */
  threshold?: number;
  region?: number;
}

function speckle(spec: SpeckleSpec): string {
  const region = spec.region ?? 0;
  const pad = region.toFixed(1);
  const ramp = spec.coverage !== undefined
    ? `    <feFuncA type="linear" slope="2.6" intercept="${
      rampIntercept(2.6, spec.coverage).toFixed(4)
    }"/>`
    : `    <feFuncA type="discrete" tableValues="${
      stepTable(spec.threshold ?? 0.63)
    }"/>`;
  return [
    `<filter id="${spec.id}" x="${-pad}%" y="${-pad}%" width="${
      (100 + 2 * region).toFixed(1)
    }%" height="${(100 + 2 * region).toFixed(1)}%">`,
    `  <feTurbulence type="fractalNoise" baseFrequency="${
      spec.freq.toFixed(5)
    }" numOctaves="${spec.octaves}" seed="${spec.seed}" stitchTiles="stitch" result="n"/>`,
    // Alpha carries the noise's own luminance, so the transfer works on one
    // channel and the specks keep the colour of the flood.
    `  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.33 0.33 0.33 0 0" result="a"/>`,
    `  <feComponentTransfer in="a" result="t">`,
    ramp,
    `  </feComponentTransfer>`,
    `  <feFlood flood-color="${escapeXml(spec.ink)}" result="f"/>`,
    `  <feComposite in="f" in2="t" operator="in" result="s"/>`,
    `  <feComposite in="s" in2="SourceGraphic" operator="in"/>`,
    `</filter>`,
  ].join("\n    ");
}

export function grainFilterDefs(options: GrainOptions): string {
  if (options.level === "none") return "";
  const seed = options.seed;
  const defs = [
    speckle({
      id: "qrb-tooth",
      freq: toothFrequency(options.size),
      octaves: 4,
      seed,
      ink: options.ink,
      coverage: 0.035,
    }),
  ];
  if (options.level === "stamp") {
    // The bite is the seal: paper punched *out* of the ink, so the data field
    // reads as one rough impression. Clumps are about a module wide — finer
    // speckle averages into a grey haze when the probe downsamples, which is
    // exactly how a good-looking bite turns into a contrast failure.
    defs.push(
      speckle({
        id: "qrb-bite",
        freq: 1 / (options.cell * (options.biteScale ?? 2.2)),
        octaves: 3,
        seed: (seed + 53) % 997,
        ink: options.paper,
        threshold: options.biteDensity ?? 0.63,
        region: 2,
      }),
    );
    defs.push(
      `<filter id="qrb-warp" x="-6%" y="-6%" width="112%" height="112%">`,
      `  <feTurbulence type="fractalNoise" baseFrequency="${
        (1 / (options.cell * 2.6)).toFixed(4)
      }" numOctaves="2" seed="${(seed + 31) % 997}" result="n"/>`,
      `  <feDisplacementMap in="SourceGraphic" in2="n" scale="${
        (options.cell * (options.warpShare ?? WARP_SHARE)).toFixed(3)
      }" xChannelSelector="R" yChannelSelector="G"/>`,
      `</filter>`,
    );
  }
  return defs.join("\n    ");
}

/**
 * The tooth. Drawn *under* the ink, so specks only ever sit on paper and a
 * decoder's sample of a dark module is never touched.
 */
export function grainTooth(
  options: GrainOptions,
  x: number,
  y: number,
  w: number,
  h: number,
  rx = 0,
): string {
  if (options.level === "none") return "";
  const radius = rx > 0 ? ` rx="${rx}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${radius} fill="${
    escapeXml(options.ink)
  }" opacity="0.5" filter="url(#qrb-tooth)"/>`;
}

/**
 * The bite. Paper-coloured, so it is invisible wherever it lands on paper and a
 * clean hole wherever it lands on ink. Always drawn above the data modules and
 * below the finder patterns, timing and alignment: the eyes stay sharp.
 */
export function grainBite(
  options: GrainOptions,
  x: number,
  y: number,
  w: number,
  h: number,
  rx = 0,
): string {
  if (options.level !== "stamp") return "";
  const radius = rx > 0 ? ` rx="${rx}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${radius} fill="${
    escapeXml(options.paper)
  }" filter="url(#qrb-bite)"/>`;
}

/** Wraps the classic module ink in the warp. Finders are never passed here. */
export function grainWarp(options: GrainOptions, body: string): string {
  if (options.level !== "stamp") return body;
  return `<g filter="url(#qrb-warp)">${body}</g>`;
}

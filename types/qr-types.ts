// Type definitions for QR code styling

export interface ColorStop {
  offset: number;
  color: string;
}

export interface Gradient {
  type: "linear" | "radial";
  rotation?: number;
  colorStops: ColorStop[];
}

export type DotShape =
  | "diamond"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";

export type CornerSquareShape = "dot" | "square" | "extra-rounded" | "octagon";
export type CornerDotShape = "dot" | "square";

export interface DotsOptions {
  type?: string;
  shape?: DotShape;
  color?: string;
  gradient?: Gradient;
}

export interface BackgroundOptions {
  type?: string;
  color?: string;
  gradient?: Gradient;
}

export interface CornerOptions {
  type?: string;
  shape?: CornerSquareShape | CornerDotShape;
  color?: string;
  gradient?: Gradient;
}

/** Presentation layer — orthogonal to palette and geometry. */
export type RenderMode = "classic" | "halftone" | "foil";

/** Colour grid sampled from artwork at upload; see utils/qr-art-sample.ts. */
export interface ArtSample {
  n: number;
  data: string;
}

/** How the plate under the code is cut. Circle inscribes the code. */
export type PlateShape = "square" | "rounded" | "circle";

export interface QRStyle {
  centerShape?: "squircle" | "circle" | "knockout";
  dots: DotsOptions;
  background: BackgroundOptions;
  cornersSquare?: CornerOptions;
  cornersDot?: CornerOptions;
  /** Look: the flat matrix, the artwork-as-ink halftone, or the foil tile. */
  renderMode?: RenderMode;
  /** Sticker artwork, always a same-origin data: URL. */
  artImage?: string;
  /** Sampled colours from the artwork. Rendering never touches the image. */
  artSample?: ArtSample;
  halftoneTone?: "color" | "dmg" | "ink";
  halftoneShape?: PlateShape;
  /** Foil thickness: a real choice, not three colour slots. */
  foilDepth?: "thin" | "chunky";
}

/** Card label (banner) treatment. Auto-themed; never a font/colour picker. */
export type BannerTheme = "accent" | "ink" | "paper";

export interface FrameConfig {
  enabled: boolean;
  caption: string;
  theme?: BannerTheme;
}

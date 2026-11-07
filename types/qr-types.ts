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
export type RenderMode = "classic" | "foil" | "sticker" | "pocket";

/** Die-cut edge for the Sticker look. */
export type StickerShape = "squircle" | "circle" | "ticket";

/** Three ink slots for the extruded faces. */
export interface FoilColors {
  top?: string;
  left?: string;
  right?: string;
}

export interface QRStyle {
  centerShape?: "squircle" | "circle" | "knockout";
  dots: DotsOptions;
  background: BackgroundOptions;
  cornersSquare?: CornerOptions;
  cornersDot?: CornerOptions;
  /** Look: classic matrix, extruded foil, artwork sticker, 8-bit pocket. */
  renderMode?: RenderMode;
  /** Sticker artwork, always a same-origin data: URL. */
  artImage?: string;
  /** Foil face inks; each falls back to a palette-derived tone. */
  artColors?: FoilColors;
  stickerShape?: StickerShape;
  /** Pocket tone: the active palette or the four-green DMG set. */
  pocketTone?: "brand" | "dmg";
}

/** Card label (banner) treatment. Auto-themed; never a font/colour picker. */
export type BannerTheme = "accent" | "ink" | "paper";

export interface FrameConfig {
  enabled: boolean;
  caption: string;
  theme?: BannerTheme;
}

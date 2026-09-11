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
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";

export type CornerSquareShape = "dot" | "square" | "extra-rounded";
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

export interface QRStyle {
  dots: DotsOptions;
  background: BackgroundOptions;
  cornersSquare?: CornerOptions;
  cornersDot?: CornerOptions;
}

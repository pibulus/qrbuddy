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

export interface DotsOptions {
  type?: string;
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
  color?: string;
  gradient?: Gradient;
}

export interface QRStyle {
  dots: DotsOptions;
  background: BackgroundOptions;
  cornersSquare?: CornerOptions;
  cornersDot?: CornerOptions;
}

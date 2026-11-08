import type { QRStyle } from "../types/qr-types.ts";
import { buildQrSvgString } from "./qr-vector-svg.ts";

export interface RenderOptions {
  size: number;
  data: string;
  style: QRStyle;
  logoUrl?: string;
  /** Coarse grid for small thumbnails; exports leave this unset. */
  artVersionFloor?: number;
}

/** One source of geometry for the design preview, stage and every export. */
export function styledQrSvg(options: RenderOptions): string {
  const s = options.style;
  return buildQrSvgString({
    data: options.data,
    size: options.size,
    c1: s.dots.color ?? s.dots.gradient?.colorStops[0]?.color,
    c2: s.dots.color ?? s.dots.gradient?.colorStops.at(-1)?.color,
    bg: s.background.color ?? s.background.gradient?.colorStops[0]?.color,
    dotsGradient: s.dots.gradient,
    backgroundGradient: s.background.gradient,
    eyeGradient: s.cornersSquare?.gradient ?? s.dots.gradient,
    eyeColor: s.cornersSquare?.color ?? s.dots.color,
    dotShape: s.dots.shape,
    cornerSquareShape: s.cornersSquare?.shape,
    logoUrl: options.logoUrl,
    centerShape: s.centerShape,
    renderMode: s.renderMode,
    artSample: s.artSample,
    halftoneTone: s.halftoneTone,
    halftoneShape: s.halftoneShape,
    halftoneDetail: s.halftoneDetail,
    foilDepth: s.foilDepth,
    artVersionFloor: options.artVersionFloor,
  });
}

/** Small browser adapter; revision guards prevent slow image loads painting
 * an older design over a newer selection. No DOM work runs at import time. */
export default class QRRenderer {
  private options: RenderOptions;
  private canvas: HTMLCanvasElement | null = null;
  private revision = 0;
  constructor(options: RenderOptions, private onPaint?: () => void) {
    this.options = options;
  }
  append(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = 0;
    host.append(this.canvas);
    void this.paint();
  }
  update(options: RenderOptions) {
    this.options = options;
    void this.paint();
  }
  private async rasterize(): Promise<HTMLCanvasElement> {
    const options = this.options;
    const svg = styledQrSvg(options);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = options.size;
      canvas.height = options.size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  private async paint() {
    const revision = ++this.revision;
    try {
      const source = await this.rasterize();
      if (revision !== this.revision || !this.canvas) return;
      this.canvas.width = source.width;
      this.canvas.height = source.height;
      this.canvas.getContext("2d")?.drawImage(source, 0, 0);
      this.onPaint?.();
    } catch (error) {
      console.error("QR render failed", error);
    }
  }
  async getRawData(format: "png" | "svg"): Promise<Blob> {
    if (format === "svg") {
      return new Blob([styledQrSvg(this.options)], { type: "image/svg+xml" });
    }
    const canvas = await this.rasterize();
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("PNG unavailable")),
        "image/png",
      )
    );
  }
  dispose() {
    this.revision++;
    this.canvas = null;
    this.onPaint = undefined;
  }
}

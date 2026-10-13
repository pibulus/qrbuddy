export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let measureCanvasCtx: CanvasRenderingContext2D | null = null;

/**
 * Measures the rendered width of caption text.
 * In a browser/DOM environment, uses Canvas 2D ctx.measureText() with the exact font.
 * In headless/SSR/CLI environments without DOM, uses standard Unicode decomposition (NFD)
 * and East Asian/wide character metrics to determine advance width.
 */
export function measureCaptionWidth(text: string, fontSize: number): number {
  if (typeof document !== "undefined") {
    try {
      if (!measureCanvasCtx) {
        const canvas = document.createElement("canvas");
        measureCanvasCtx = canvas.getContext("2d");
      }
      if (measureCanvasCtx) {
        measureCanvasCtx.font =
          `900 ${fontSize}px "Inter Black", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        return measureCanvasCtx.measureText(text).width;
      }
    } catch {
      // Fall through to Unicode fallback
    }
  }
  return measureCaptionUnicodeFallback(text, fontSize);
}

/**
 * Unicode-aware advance width measurement fallback.
 * Decomposes characters via NFD so accented glyphs (e.g. Ŵ, É, Ñ) inherit the advance
 * width of their base character, while combining diacritics have zero width.
 * Wide Asian characters (Hanzi, Kanji, Kana, Hangul) are given full em-width.
 */
export function measureCaptionUnicodeFallback(
  text: string,
  fontSize: number,
): number {
  const norm = text.normalize("NFD");
  let emUnits = 0;
  for (const char of norm) {
    const code = char.charCodeAt(0);
    // Combining diacritical marks (U+0300..U+036F) add no advance width
    if (code >= 0x0300 && code <= 0x036f) continue;

    if (char === " " || char === "\u00A0") {
      emUnits += 0.32;
    } else if (
      /[\p{Unified_Ideograph}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
        .test(char)
    ) {
      emUnits += 1.01;
    } else if (/[WMwm@%&]/.test(char)) {
      emUnits += 1.06;
    } else if (/[Iijl!|:;.,'"\`\-]/.test(char)) {
      emUnits += 0.35;
    } else if (/[EFLTeflt1()\[\]]/.test(char)) {
      emUnits += 0.62;
    } else {
      emUnits += 0.72;
    }
  }
  return emUnits * fontSize;
}

/** Backward-compatible alias */
export const estimateCaptionWidth = measureCaptionWidth;

export function createFramedSvg(
  rawQrSvg: string,
  caption?: string | null,
  options?: { measuredWidth?: number },
): string {
  const pad = 64;
  const border = 20;
  const qrSize = 1000;
  const captionText = (caption ?? "").trim().toUpperCase();
  const hasCaption = captionText.length > 0;
  const capH = hasCaption ? 170 : 0;
  const totalWidth = qrSize + pad * 2; // 1128
  const totalHeight = qrSize + pad * 2 + capH; // 1298 with caption, 1128 without
  const cardX = border / 2; // 10
  const cardY = border / 2; // 10
  const cardWidth = totalWidth - border; // 1108
  const cardHeight = totalHeight - border; // 1278 with caption, 1108 without
  const cornerRadius = 56;

  // Clean raw SVG: remove XML declaration if present
  const cleanSvg = rawQrSvg.replace(/<\?xml[^>]*\?>\s*/i, "").trim();

  // Replace root <svg...> tag with nested <svg x="64" y="64" width="1000" height="1000" viewBox="0 0 1000 1000">
  const nestedSvg = cleanSvg.replace(
    /<svg\b[^>]*>/i,
    `<svg x="${pad}" y="${pad}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">`,
  );

  let captionElement = "";
  if (hasCaption) {
    const textY = qrSize + pad + capH / 2 + 12;
    const baseFontSize = 92;
    const maxTextWidth = totalWidth - pad * 2; // 1000
    const measuredWidth = options?.measuredWidth ??
      measureCaptionWidth(captionText, baseFontSize);
    const exceedsMax = measuredWidth > maxTextWidth;
    const fontSize = exceedsMax
      ? Math.max(38, Math.floor(baseFontSize * (maxTextWidth / measuredWidth)))
      : baseFontSize;
    const escapedCaption = escapeXml(captionText);

    captionElement = `  <text x="${
      totalWidth / 2
    }" y="${textY}" fill="#000000" font-family="'Inter Black', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central"${
      exceedsMax
        ? ` textLength="${maxTextWidth}" lengthAdjust="spacingAndGlyphs"`
        : ""
    }>${escapedCaption}</text>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#FFFBF5" stroke="#000000" stroke-width="${border}" />
  ${nestedSvg}
${captionElement}</svg>`;
}

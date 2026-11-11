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
  options?: {
    measuredWidth?: number;
    banner?: { bg: string; ink: string };
  },
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

  // Nest the QR inside the pass. A label is a banner on TOP of the same
  // card, never a second box below it.
  const qrY = hasCaption ? pad + capH : pad;
  const nestedSvg = cleanSvg.replace(
    /<svg\b[^>]*>/i,
    `<svg x="${pad}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">`,
  );

  let captionElement = "";
  const banner = options?.banner;
  if (hasCaption) {
    const textY = pad + capH / 2 + 6;
    const baseFontSize = 92;
    const maxTextWidth = totalWidth - pad * 2; // 1000
    const measuredWidth = options?.measuredWidth ??
      measureCaptionWidth(captionText, baseFontSize);
    const exceedsMax = measuredWidth > maxTextWidth;
    const fontSize = exceedsMax
      ? Math.max(38, Math.floor(baseFontSize * (maxTextWidth / measuredWidth)))
      : baseFontSize;
    const escapedCaption = escapeXml(captionText);

    captionElement = `  <text x="${totalWidth / 2}" y="${textY}" fill="${
      escapeXml(banner?.ink ?? "#1e1714")
    }" font-family="'Inter Black', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central"${
      exceedsMax
        ? ` textLength="${maxTextWidth}" lengthAdjust="spacingAndGlyphs"`
        : ""
    }>${escapedCaption}</text>\n`;
  }

  const bannerFill = hasCaption && banner
    ? (() => {
      const x = cardX, y = cardY, w = cardWidth;
      const h = pad + capH - y;
      const r = cornerRadius;
      return `  <path d="M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${
        y + r
      }V${y + h}H${x}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z" fill="${
        escapeXml(banner!.bg)
      }" />\n`;
    })()
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#FFFEF7" stroke="#1e1714" stroke-width="${border}" />
  ${bannerFill}${nestedSvg}
  ${
    hasCaption && banner
      ? `<rect x="${cardX}" y="${
        pad + capH - 8
      }" width="${cardWidth}" height="8" fill="#1e1714" />`
      : ""
  }
${captionElement}</svg>`;
}

function slugifySegment(value: string, maxLength = 36): string {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii.length <= maxLength) return ascii;
  return ascii.slice(0, maxLength).replace(/-+$/g, "");
}

function extractPayloadSlug(payload: string): string {
  const raw = (payload || "").trim();
  if (!raw) return "";

  if (/^WIFI:/i.test(raw)) {
    const body = raw.replace(/^WIFI:/i, "");
    const match = body.match(/(?:^|;)S:((?:\\.|[^;])*)/i);
    const ssid = match ? match[1].replace(/\\(.)/g, "$1").trim() : "";
    const ssidSlug = slugifySegment(ssid, 30);
    if (!ssidSlug) return "wifi";
    return ssidSlug.startsWith("wifi") || ssidSlug.startsWith("wi-fi")
      ? ssidSlug
      : `wifi-${ssidSlug}`;
  }

  if (/^BEGIN:VCARD/i.test(raw)) {
    const fnLine = raw.match(/^FN:(.+)$/im)?.[1] ??
      [raw.match(/^N:(.+)$/im)?.[1], raw.match(/^ORG:(.+)$/im)?.[1]]
        .filter(Boolean)
        .join(" ");
    const cleaned = (fnLine ?? "")
      .replace(/\\(.)/g, "$1")
      .replace(/;+/g, " ")
      .trim();
    return slugifySegment(cleaned) || "vcard";
  }

  if (/^mailto:/i.test(raw)) {
    const address = raw.slice(7).split("?")[0].trim();
    return slugifySegment(address) || "email";
  }

  if (/^tel:/i.test(raw)) {
    const digits = raw.slice(4).replace(/[^\d]/g, "");
    return digits ? `tel-${digits.slice(0, 20)}` : "phone";
  }

  if (/^(?:SMSTO:|sms:)/i.test(raw)) {
    const rest = raw.replace(/^(?:SMSTO:|sms:)/i, "");
    const recipient = rest.split(/[:?]/)[0].replace(/[^\d]/g, "");
    return recipient ? `sms-${recipient.slice(0, 20)}` : "sms";
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./i, "");
      const path = parsed.pathname === "/" ? "" : parsed.pathname;
      return slugifySegment(`${host}${path}`);
    } catch {
      return slugifySegment(raw.replace(/^https?:\/\//i, ""));
    }
  }

  return slugifySegment(raw.split(/\r?\n/)[0]);
}

/**
 * Builds a deterministic, filesystem-safe semantic filename for QR exports
 * (e.g. `qrbuddy-guest-pass-sunset.png` or `qrbuddy-pibulus-com-sunset.svg`).
 */
export function buildQrFilename(
  payload: string,
  style: string,
  frameText?: string,
  ext: "png" | "svg" = "png",
): string {
  const safeExt = ext === "svg" ? "svg" : "png";
  const styleSlug = slugifySegment(style || "sunset", 20) || "sunset";
  const captionSlug = frameText ? slugifySegment(frameText, 32) : "";
  const subjectSlug = captionSlug || extractPayloadSlug(payload);

  return subjectSlug
    ? `qrbuddy-${subjectSlug}-${styleSlug}.${safeExt}`
    : `qrbuddy-${styleSlug}.${safeExt}`;
}

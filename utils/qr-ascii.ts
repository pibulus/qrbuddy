// Render a QR as terminal-friendly text art using half-block characters.
// Uses qrcode-generator directly (the same encoder qr-code-styling wraps),
// so the matrix matches what the canvas renders for the same payload.

import qrcode from "qrcode-generator";

/**
 * Encode `data` and return a Unicode block-character QR, two modules per
 * character row (▀▄█), with a quiet zone. Dark modules are drawn as blocks,
 * so it scans when pasted somewhere with a light background (terminal with
 * light theme, README, chat). Returns null if the payload won't fit.
 */
export function qrToTextArt(data: string): string | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(data);
    qr.make();

    const size = qr.getModuleCount();
    const QUIET = 2;
    const total = size + QUIET * 2;

    const dark = (row: number, col: number): boolean => {
      const r = row - QUIET;
      const c = col - QUIET;
      if (r < 0 || c < 0 || r >= size || c >= size) return false;
      return qr.isDark(r, c);
    };

    const lines: string[] = [];
    for (let row = 0; row < total; row += 2) {
      let line = "";
      for (let col = 0; col < total; col++) {
        const top = dark(row, col);
        const bottom = row + 1 < total ? dark(row + 1, col) : false;
        line += top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " ";
      }
      lines.push(line);
    }
    return lines.join("\n");
  } catch {
    // Payload too large for the symbol, or encoder hiccup — no text art.
    return null;
  }
}

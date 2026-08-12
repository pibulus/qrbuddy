/** Loose "is this a link?" check for UI guidance — accepts bare domains
 * (qrbuddy.app) by trying an https:// prefix. Not a security boundary;
 * server-side redirect validation owns that. */
export function looksLikeUrl(s: string): boolean {
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

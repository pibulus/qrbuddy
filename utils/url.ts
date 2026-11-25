/** Loose "is this a link?" check for UI guidance — accepts bare domains
 * (qrbuddy.app) by trying an https:// prefix, as well as common action schemes.
 * Not a security boundary; server-side redirect validation owns that. */
export function looksLikeUrl(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;

  // Known utility schemes first (e.g. `tel:12345` has digits after `:` so check before host:port).
  const utilityMatch = /^(mailto|tel|sms|wifi|facetime|geo):/i.exec(trimmed);
  if (utilityMatch) {
    return trimmed.slice(utilityMatch[0].length).trim().length > 0;
  }

  // Distinguish bare host:port (example.com:8080) from explicit disallowed schemes.
  const looksLikeHostPort = /^[a-zA-Z][a-zA-Z0-9+.-]*:\d+(?:[/?#]|$)/.test(
    trimmed,
  );
  const schemeMatch = !looksLikeHostPort
    ? /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
    : null;

  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      return false;
    }
  }

  try {
    const url = new URL(
      schemeMatch ? trimmed : `https://${trimmed}`,
    );
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL string.
 * If the string does not have a scheme (e.g. "google.com", "sub.domain.co/path"),
 * prepends "https://". Preserves existing schemes like "http://", "https://", "mailto:", etc.
 */
export function normalizeUrl(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";

  // "example.com:8080" looks like a scheme to the regex below but is a
  // host:port — a scheme is never followed by only digits. Checked first so
  // bare host:port still gets https://, while mailto:/tel:/sms: are preserved.
  const looksLikeHostPort = /^[a-zA-Z][a-zA-Z0-9+.-]*:\d+(?:[/?#]|$)/.test(
    trimmed,
  );

  // Check if it already has a protocol scheme
  if (!looksLikeHostPort && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  // Prepend https:// for bare domains/paths
  return `https://${trimmed}`;
}

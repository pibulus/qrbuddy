/** Loose "is this a link?" check for UI guidance — accepts bare domains
 * (qrbuddy.app) by trying an https:// prefix, as well as common action schemes.
 * Not a security boundary; server-side redirect validation owns that. */
export function looksLikeUrl(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;

  // Custom known utility schemes
  if (/^(mailto|tel|sms|wifi|facetime):/i.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
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

  // Check if it already has a protocol scheme
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  // Prepend https:// for bare domains/paths
  return `https://${trimmed}`;
}

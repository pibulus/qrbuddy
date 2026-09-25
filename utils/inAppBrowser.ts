/**
 * In-app browser detection and user rescue system for QRBuddy.
 * Detects embedded webviews (Instagram, Threads, Discord, TikTok, etc.)
 * that block camera access, file system access, or downloads.
 */

export const IN_APP_BROWSERS = [
  { pattern: /FB_IAB\/MESSENGER|Messenger/i, name: "Messenger" },
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /FBAN|FBAV|FB_IAB/i, name: "Facebook" },
  { pattern: /TikTok|musical_ly|BytedanceWebview/i, name: "TikTok" },
  { pattern: /Threads|Barcelona/i, name: "Threads" },
  { pattern: /Discord/i, name: "Discord" },
  { pattern: /LinkedInApp/i, name: "LinkedIn" },
  { pattern: /Snapchat/i, name: "Snapchat" },
  { pattern: /\bLine\//i, name: "LINE" },
  { pattern: /Twitter|TwitterAndroid/i, name: "X" },
  { pattern: /Pinterest/i, name: "Pinterest" },
  { pattern: /Reddit/i, name: "Reddit" },
];

/**
 * Return the name of the in-app browser we appear to be running inside, if any.
 */
export function getInAppBrowserName(userAgent?: string): string | null {
  const ua = userAgent ??
    (typeof navigator === "undefined" ? "" : navigator.userAgent || "");
  if (!ua) return null;

  for (const { pattern, name } of IN_APP_BROWSERS) {
    if (pattern.test(ua)) return name;
  }
  return null;
}

/**
 * Check if the current browser environment lacks camera access support.
 */
export function isCameraUnsupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as unknown as {
    mediaDevices?: { getUserMedia?: unknown };
  };
  return !nav.mediaDevices?.getUserMedia;
}

/**
 * Actionable copy for an environment where camera access is blocked or broken.
 */
export function getUnsupportedCameraMessage(userAgent?: string): string {
  const app = getInAppBrowserName(userAgent);
  return app
    ? `${app}'s built-in browser blocks the camera. Tap ••• and choose "Open in Safari" or "Open in Chrome".`
    : "This browser blocks camera access. Drop an image or paste a screenshot instead.";
}

/**
 * Generic helper for any app feature blocked inside an in-app webview.
 */
export function getInAppFeatureWarning(
  featureName = "this feature",
  userAgent?: string,
): string {
  const app = getInAppBrowserName(userAgent);
  return app
    ? `${app}'s built-in browser may restrict ${featureName}. For best results, tap ••• and open in Safari or Chrome.`
    : `Your browser may restrict ${featureName}. Open in Safari or Chrome for full support.`;
}

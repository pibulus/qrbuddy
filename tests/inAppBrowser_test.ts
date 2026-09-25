import { assertEquals } from "$std/assert/mod.ts";
import {
  getInAppBrowserName,
  getUnsupportedCameraMessage,
  getInAppFeatureWarning
} from "../utils/inAppBrowser.ts";

Deno.test("inAppBrowser detects Threads user agent", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 315.0.0.19.109";
  assertEquals(getInAppBrowserName(ua), "Threads");
  assertEquals(
    getUnsupportedCameraMessage(ua),
    "Threads's built-in browser blocks the camera. Tap ••• and choose \"Open in Safari\" or \"Open in Chrome\"."
  );
});

Deno.test("inAppBrowser detects Discord user agent", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Discord/189.0";
  assertEquals(getInAppBrowserName(ua), "Discord");
  assertEquals(
    getInAppFeatureWarning("file downloads", ua),
    "Discord's built-in browser may restrict file downloads. For best results, tap ••• and open in Safari or Chrome."
  );
});

Deno.test("inAppBrowser returns null for Safari", () => {
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
  assertEquals(getInAppBrowserName(ua), null);
});

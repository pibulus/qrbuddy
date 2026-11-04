// Tests for utils/history.ts payload summarization.
//
// The Time Machine used to print raw QR payloads straight into the drawer —
// `WIFI:T:WPA;S:...` as both the title and the subtitle. These cases pin the
// human-readable form so it cannot regress.

import { assertEquals } from "$std/testing/asserts.ts";
import { summarizeQrPayload } from "../utils/history.ts";

Deno.test("wifi payload becomes SSID + security label", () => {
  const summary = summarizeQrPayload("WIFI:T:WPA;S:Cafe Lumen;P:hunter2;;");
  assertEquals(summary.type, "wifi");
  assertEquals(summary.title, "Wi-Fi: Cafe Lumen");
  assertEquals(summary.subtitle, "WPA");
});

Deno.test("open wifi reads as an open network", () => {
  const summary = summarizeQrPayload("WIFI:T:nopass;S:Guest;P:;;");
  assertEquals(summary.type, "wifi");
  assertEquals(summary.title, "Wi-Fi: Guest");
  assertEquals(summary.subtitle, "Open network");
});

Deno.test("wifi unescapes special characters in the SSID", () => {
  const summary = summarizeQrPayload("WIFI:T:WPA;S:Bar\\; Grill;P:x;;");
  assertEquals(summary.title, "Wi-Fi: Bar; Grill");
});

Deno.test("vcard payload becomes a contact name", () => {
  const payload = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Ada Lovelace",
    "N:Lovelace;Ada;;;",
    "ORG:Analytical Engines",
    "END:VCARD",
  ].join("\n");
  const summary = summarizeQrPayload(payload);
  assertEquals(summary.type, "vcard");
  assertEquals(summary.title, "Contact: Ada Lovelace");
  assertEquals(summary.subtitle, "Analytical Engines");
});

Deno.test("mailto payload keeps the address and subject", () => {
  const summary = summarizeQrPayload(
    "mailto:hello@qrbuddy.app?subject=Say%20hello",
  );
  assertEquals(summary.type, "email");
  assertEquals(summary.title, "Email: hello@qrbuddy.app");
  assertEquals(summary.subtitle, "Say hello");
});

Deno.test("tel payload reads as a phone call", () => {
  const summary = summarizeQrPayload("tel:+61412345678");
  assertEquals(summary.type, "phone");
  assertEquals(summary.title, "Call: +61412345678");
});

Deno.test("sms payload previews the message", () => {
  const summary = summarizeQrPayload("SMSTO:+61412345678:Table for two?");
  assertEquals(summary.type, "sms");
  assertEquals(summary.title, "Text: +61412345678");
  assertEquals(summary.subtitle, "Table for two?");
});

Deno.test("url payload shows host and path", () => {
  const summary = summarizeQrPayload("https://www.qrbuddy.app/menu?ref=qr");
  assertEquals(summary.type, "url");
  assertEquals(summary.title, "qrbuddy.app/menu");
  assertEquals(summary.subtitle, "https://www.qrbuddy.app/menu?ref=qr");
});

Deno.test("plain text uses the first line", () => {
  const summary = summarizeQrPayload(
    "Wifi password is hunter2\nAsk at the bar",
  );
  assertEquals(summary.type, "text");
  assertEquals(summary.title, "Wifi password is hunter2");
  assertEquals(summary.subtitle, "Multi-line text");
});

Deno.test("empty input still returns a usable row", () => {
  const summary = summarizeQrPayload("   ");
  assertEquals(summary.type, "text");
  assertEquals(summary.title, "Text");
});

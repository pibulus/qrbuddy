// Pure-logic unit tests — no backend required, always runnable.
//
// These cover the deterministic building blocks of QRBuddy: QR-payload
// formatters/validators, file validation (incl. the null-byte + last-extension
// hardening), splash_config validation (the H-1 fix), and short-code
// generation. The existing edge-functions_test.ts hits a live Supabase and is
// skipped by default; this file runs offline so correctness is actually locked.

import { assert, assertEquals, assertMatch } from "$std/assert/mod.ts";

import {
  formatEmail,
  formatSMS,
  formatVCard,
  formatWiFi,
  validateEmail,
  validateSMS,
  validateVCard,
  validateWiFi,
} from "../types/qr-templates.ts";

import { formatFileSize, validateFile } from "../utils/file-validation.ts";

import { validateSplashConfig } from "../supabase/functions/_shared/splash-validation.ts";

// ---------------------------------------------------------------------------
// Helper: build a fake File without touching disk
// ---------------------------------------------------------------------------
function fakeFile(name: string, sizeBytes = 1024, type = ""): File {
  // Construct with a small body, then override size for the >50MB case so we
  // don't actually allocate huge buffers.
  const f = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(f, "size", { value: sizeBytes });
  return f;
}

// ===========================================================================
// WiFi
// ===========================================================================
Deno.test("formatWiFi - builds WIFI: payload with escaped special chars", () => {
  const out = formatWiFi({
    ssid: "My;Net",
    password: "p,a:ss\\word",
    encryption: "WPA",
    hidden: false,
  });
  // ssid/password special chars (; , : \) must be backslash-escaped
  assertMatch(out, /^WIFI:T:WPA;S:My\\;Net;P:p\\,a\\:ss\\\\word;;$/);
});

Deno.test("formatWiFi - nopass omits encryption type", () => {
  const out = formatWiFi({
    ssid: "Open",
    password: "",
    encryption: "nopass",
    hidden: false,
  });
  assertEquals(out, "WIFI:T:;S:Open;P:;;");
});

Deno.test("formatWiFi - hidden network adds H:true", () => {
  const out = formatWiFi({
    ssid: "Ghost",
    password: "secret",
    encryption: "WPA",
    hidden: true,
  });
  assertMatch(out, /;H:true;$/);
});

Deno.test("validateWiFi - requires ssid, and password for secured", () => {
  assertEquals(
    validateWiFi({ ssid: "", password: "x", encryption: "WPA", hidden: false }),
    "Network name (SSID) is required",
  );
  assertEquals(
    validateWiFi({ ssid: "N", password: "", encryption: "WPA", hidden: false }),
    "Password is required for secured networks",
  );
  assertEquals(
    validateWiFi({
      ssid: "N",
      password: "",
      encryption: "nopass",
      hidden: false,
    }),
    null,
  );
});

// ===========================================================================
// vCard / SMS / Email
// ===========================================================================
Deno.test("formatVCard - includes only provided optional fields", () => {
  const out = formatVCard({
    firstName: "Ada",
    lastName: "Lovelace",
    organization: "",
    jobTitle: "",
    phone: "123",
    email: "",
    website: "",
    address: "",
  });
  assert(out.startsWith("BEGIN:VCARD"));
  assert(out.endsWith("END:VCARD"));
  assert(out.includes("FN:Ada Lovelace"));
  assert(out.includes("TEL:123"));
  assert(!out.includes("ORG:"), "empty org should be omitted");
});

Deno.test("validateVCard - needs a name and a contact method", () => {
  const base = {
    firstName: "",
    lastName: "",
    organization: "",
    jobTitle: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  };
  assertEquals(validateVCard(base), "Name is required");
  assertEquals(
    validateVCard({ ...base, firstName: "A" }),
    "Phone or Email is required",
  );
  assertEquals(
    validateVCard({ ...base, firstName: "A", email: "a@b.c" }),
    null,
  );
});

Deno.test("formatSMS / validateSMS", () => {
  assertEquals(formatSMS({ phone: "555", message: "yo" }), "SMSTO:555:yo");
  assertEquals(
    validateSMS({ phone: "", message: "x" }),
    "Phone number is required",
  );
  assertEquals(validateSMS({ phone: "1", message: "" }), "Message is required");
  assertEquals(validateSMS({ phone: "1", message: "x" }), null);
});

Deno.test("formatEmail - URL-encodes subject and body", () => {
  const out = formatEmail({
    email: "a@b.c",
    subject: "hi there",
    body: "a&b=c",
  });
  assertEquals(out, "mailto:a@b.c?subject=hi%20there&body=a%26b%3Dc");
});

Deno.test("validateEmail - needs email and subject-or-body", () => {
  assertEquals(
    validateEmail({ email: "", subject: "s", body: "" }),
    "Email address is required",
  );
  assertEquals(
    validateEmail({ email: "a@b.c", subject: "", body: "" }),
    "Subject or Body is required",
  );
  assertEquals(validateEmail({ email: "a@b.c", subject: "s", body: "" }), null);
});

// ===========================================================================
// File validation (incl. the hardening we added)
// ===========================================================================
Deno.test("validateFile - accepts a normal image", () => {
  assertEquals(
    validateFile(fakeFile("photo.jpg", 1024, "image/jpeg")).valid,
    true,
  );
});

Deno.test("validateFile - rejects files over 50MB", () => {
  const r = validateFile(fakeFile("big.jpg", 51 * 1024 * 1024));
  assertEquals(r.valid, false);
  assertMatch(r.error ?? "", /too large/i);
});

Deno.test("validateFile - blocks a plain executable extension", () => {
  assertEquals(validateFile(fakeFile("virus.exe")).valid, false);
});

Deno.test("validateFile - blocks on the LAST extension (jpg.exe is an exe)", () => {
  const r = validateFile(fakeFile("photo.jpg.exe"));
  assertEquals(r.valid, false);
  assertMatch(r.error ?? "", /\.exe/);
});

Deno.test("validateFile - does NOT block a safe double extension", () => {
  // "report.exe.jpg" ends in .jpg — the real type — so it's allowed.
  assertEquals(
    validateFile(fakeFile("report.exe.jpg", 1024, "image/jpeg")).valid,
    true,
  );
});

Deno.test("validateFile - rejects null-byte / control chars in filename", () => {
  const r = validateFile(fakeFile("evil.php\x00.jpg"));
  assertEquals(r.valid, false);
  assertMatch(r.error ?? "", /invalid characters/i);
});

Deno.test("formatFileSize - human-readable units", () => {
  assertEquals(formatFileSize(0), "0 Bytes");
  assertEquals(formatFileSize(1024), "1 KB");
  assertEquals(formatFileSize(1536), "1.5 KB");
  assertEquals(formatFileSize(1048576), "1 MB");
});

// ===========================================================================
// Splash config validation (H-1 fix — the TypeError-500 vector)
// ===========================================================================
Deno.test("validateSplashConfig - null/undefined pass as null", () => {
  assertEquals(validateSplashConfig(null), { ok: true, value: null });
  assertEquals(validateSplashConfig(undefined), { ok: true, value: null });
});

Deno.test("validateSplashConfig - disabled splash normalises to null", () => {
  assertEquals(
    validateSplashConfig({ enabled: false, title: "whatever" }),
    { ok: true, value: null },
  );
});

Deno.test("validateSplashConfig - rejects non-string title (the 500 vector)", () => {
  const r = validateSplashConfig({
    enabled: true,
    title: ["not", "a", "string"],
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertMatch(r.error, /title must be a string/);
});

Deno.test("validateSplashConfig - enforces max lengths", () => {
  const long = "x".repeat(101);
  const r = validateSplashConfig({ enabled: true, title: long });
  assertEquals(r.ok, false);
  if (!r.ok) assertMatch(r.error, /<= 100/);
});

Deno.test("validateSplashConfig - rejects non-http imageUrl", () => {
  const r = validateSplashConfig({
    enabled: true,
    title: "Hi",
    imageUrl: "javascript:alert(1)",
  });
  assertEquals(r.ok, false);
  if (!r.ok) assertMatch(r.error, /imageUrl/);
});

Deno.test("validateSplashConfig - accepts a valid splash and defaults text", () => {
  const r = validateSplashConfig({
    enabled: true,
    title: "Welcome",
    description: "hi & bye",
    imageUrl: "https://example.com/x.png",
  });
  assertEquals(r.ok, true);
  if (r.ok && r.value) {
    assertEquals(r.value.title, "Welcome");
    assertEquals(r.value.buttonText, "Continue"); // default
    assertEquals(r.value.imageUrl, "https://example.com/x.png");
  }
});

Deno.test("validateSplashConfig - rejects array/non-object payloads", () => {
  assertEquals(validateSplashConfig([1, 2, 3]).ok, false);
  assertEquals(validateSplashConfig("a string").ok, false);
});

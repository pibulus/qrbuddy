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
import { shareKindOf } from "../islands/smart-input/FileUploadOptions.tsx";
import {
  buildCards,
  cardKpis,
  nextStatsRange,
  reorderItems,
} from "../utils/share-stats.ts";
import { deriveQRStatus } from "../islands/edit-qr/QRStatusCard.tsx";
import {
  buildSevenDayActivity,
  formatRelativeVisit,
} from "../islands/edit-qr/AnalyticsDashboard.tsx";

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

Deno.test("validateFile - accepts audio files (mp3, wav, flac)", () => {
  assertEquals(
    validateFile(fakeFile("track01.mp3", 4 * 1024 * 1024, "audio/mpeg")).valid,
    true,
  );
  assertEquals(
    validateFile(fakeFile("synth.wav", 2 * 1024 * 1024, "audio/wav")).valid,
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

// ===========================================================================
// Crypto & Sync Phrase
// ===========================================================================
import {
  decryptText,
  encryptText,
  generateRandomPasskey,
} from "../utils/crypto.ts";
import {
  generateSyncPhrase,
  isValidSyncPhrase,
  normalizeSyncPhrase,
} from "../utils/sync-phrase.ts";

Deno.test("crypto - encryptText and decryptText roundtrip seamlessly", async () => {
  const secretMessage = "Meet me under the neon clock at midnight 🕰️";
  const passkey = generateRandomPasskey();

  const encrypted = await encryptText(secretMessage, passkey);
  assertEquals(encrypted.isEncrypted, true);
  assert(encrypted.ciphertext.length > 0);
  assert(encrypted.ciphertext !== secretMessage);

  const decrypted = await decryptText(encrypted, passkey);
  assertEquals(decrypted, secretMessage);
});

Deno.test("crypto - wrong passkey fails decryption", async () => {
  const secretMessage = "Top secret QR payload";
  const passkey1 = "velvet-sunset-passkey-1";
  const passkey2 = "wrong-different-passkey-2";

  const encrypted = await encryptText(secretMessage, passkey1);

  let failed = false;
  try {
    await decryptText(encrypted, passkey2);
  } catch {
    failed = true;
  }
  assertEquals(failed, true);
});

Deno.test("sync-phrase - generates 4-word phrase and normalizes cleanly", () => {
  const phrase = generateSyncPhrase();
  assertEquals(isValidSyncPhrase(phrase), true);
  assertEquals(phrase.split("-").length, 4);

  const messy = "  VELVET   wombat,  waltzes!   SEASIDE   ";
  assertEquals(normalizeSyncPhrase(messy), "velvet-wombat-waltzes-seaside");
  assertEquals(isValidSyncPhrase(messy), true);
});

// ===========================================================================
// URL Normalization & Detection
// ===========================================================================
import { looksLikeUrl, normalizeUrl } from "../utils/url.ts";

Deno.test("normalizeUrl - prepends https:// to bare domains and paths", () => {
  assertEquals(normalizeUrl("example.com"), "https://example.com");
  assertEquals(
    normalizeUrl("qrbuddy.app/gallery"),
    "https://qrbuddy.app/gallery",
  );
  assertEquals(
    normalizeUrl("  sub.domain.org/path?q=1  "),
    "https://sub.domain.org/path?q=1",
  );
});

Deno.test("normalizeUrl - bare host:port is a host, not a scheme", () => {
  // Found by feeding the real function garbage: the scheme regex cannot tell
  // "https:" from "example.com:" so host:port survived unchanged and saved an
  // unusable destination into dynamic-QR routing. A scheme is never followed
  // by only digits.
  assertEquals(normalizeUrl("example.com:8080"), "https://example.com:8080");
  assertEquals(normalizeUrl("localhost:3000"), "https://localhost:3000");
  assertEquals(
    normalizeUrl("myapp.io:3000/path?q=1"),
    "https://myapp.io:3000/path?q=1",
  );
  // ...while real schemeless schemes must still survive untouched.
  assertEquals(normalizeUrl("mailto:a@b.com"), "mailto:a@b.com");
  assertEquals(normalizeUrl("tel:+61400000000"), "tel:+61400000000");
  assertEquals(normalizeUrl("geo:37.78,-122.4"), "geo:37.78,-122.4");
});

Deno.test("normalizeUrl - preserves existing schemes", () => {
  assertEquals(normalizeUrl("http://old-site.com"), "http://old-site.com");
  assertEquals(normalizeUrl("https://new-site.com"), "https://new-site.com");
  assertEquals(
    normalizeUrl("mailto:pablo@qrbuddy.app"),
    "mailto:pablo@qrbuddy.app",
  );
  assertEquals(normalizeUrl("tel:+61400000000"), "tel:+61400000000");
  assertEquals(normalizeUrl("sms:+61400000000"), "sms:+61400000000");
  assertEquals(
    normalizeUrl("wifi:T:WPA;S:MyNet;P:secret;;"),
    "wifi:T:WPA;S:MyNet;P:secret;;",
  );
  assertEquals(
    normalizeUrl("facetime:user@example.com"),
    "facetime:user@example.com",
  );
  assertEquals(normalizeUrl(""), "");
});

Deno.test("looksLikeUrl - detects standard URLs, bare domains, and utility protocols", () => {
  assertEquals(looksLikeUrl("https://example.com"), true);
  assertEquals(looksLikeUrl("http://example.com"), true);
  assertEquals(looksLikeUrl("google.com"), true);
  assertEquals(looksLikeUrl("my.subdomain.org/path"), true);
  assertEquals(looksLikeUrl("mailto:test@example.com"), true);
  assertEquals(looksLikeUrl("tel:12345"), true);
  assertEquals(looksLikeUrl("sms:12345"), true);
  assertEquals(looksLikeUrl("wifi:T:WPA;S:Net;P:pass;;"), true);
  assertEquals(looksLikeUrl("facetime:user@domain.com"), true);
  assertEquals(looksLikeUrl("not a url"), false);
  assertEquals(looksLikeUrl(""), false);
});

Deno.test("shareKindOf - classifies files correctly into file, slideshow, playlist, or pack", () => {
  assertEquals(
    shareKindOf([fakeFile("single.png", 1024, "image/png")]),
    "file",
  );
  assertEquals(
    shareKindOf([
      fakeFile("photo1.jpg", 1024, "image/jpeg"),
      fakeFile("photo2.png", 1024, "image/png"),
    ]),
    "slideshow",
  );
  assertEquals(
    shareKindOf([
      fakeFile("track1.mp3", 1024, "audio/mpeg"),
      fakeFile("track2.wav", 1024, "audio/wav"),
    ]),
    "playlist",
  );
  assertEquals(
    shareKindOf([
      fakeFile("photo.jpg", 1024, "image/jpeg"),
      fakeFile("song.mp3", 1024, "audio/mpeg"),
    ]),
    "pack",
  );
  assertEquals(
    shareKindOf([
      fakeFile("document.pdf", 1024, "application/pdf"),
      fakeFile("notes.txt", 1024, "text/plain"),
    ]),
    "pack",
  );
});

// ===========================================================================
// Dynamic QR Status & Analytics Formatting
// ===========================================================================
Deno.test("deriveQRStatus - computes Active, Paused, Exhausted, and Expired states accurately", () => {
  const nowMs = Date.parse("2026-10-20T18:00:00Z");

  // 1. Active unlimited QR
  const activeUnlimited = deriveQRStatus({
    is_active: true,
    max_scans: null,
    scan_count: 42,
    expires_at: null,
  }, nowMs);
  assertEquals(activeUnlimited.status, "Active ✓");
  assertEquals(activeUnlimited.scansRemaining, "∞");
  assertEquals(activeUnlimited.isActive, true);

  // 2. Paused QR
  const paused = deriveQRStatus({
    is_active: false,
    max_scans: 10,
    scan_count: 3,
    expires_at: null,
  }, nowMs);
  assertEquals(paused.status, "Paused");
  assertEquals(paused.scansRemaining, 7);
  assertEquals(paused.isActive, false);

  // 3. Exhausted QR (scan_count >= max_scans)
  const exhausted = deriveQRStatus({
    is_active: true,
    max_scans: 5,
    scan_count: 8,
    expires_at: null,
  }, nowMs);
  assertEquals(exhausted.status, "Exhausted");
  assertEquals(exhausted.scansRemaining, 0);
  assertEquals(exhausted.isActive, false);

  // 4. Expired QR
  const expired = deriveQRStatus({
    is_active: true,
    max_scans: 100,
    scan_count: 10,
    expires_at: "2026-10-19T12:00:00Z",
  }, nowMs);
  assertEquals(expired.status, "Expired");
  assertEquals(expired.scansRemaining, 90);
  assertEquals(expired.isActive, false);
});

Deno.test("formatRelativeVisit & buildSevenDayActivity - formats visit timestamps and 7-day bars", () => {
  const nowMs = Date.parse("2026-10-20T18:00:00Z");

  assertEquals(formatRelativeVisit(null, nowMs), {
    relative: "None recorded",
    localDateTime: null,
  });

  const twoHoursAgo = formatRelativeVisit("2026-10-20T16:00:00Z", nowMs);
  assertEquals(twoHoursAgo.relative, "2 hours ago");
  assert(twoHoursAgo.localDateTime !== null);

  const justNow = formatRelativeVisit("2026-10-20T17:59:45Z", nowMs);
  assertEquals(justNow.relative, "Just now");

  const bars = buildSevenDayActivity([0, 2, 5, 1, 0, 10, 4], nowMs);
  assertEquals(bars.length, 7);
  assertEquals(bars[5].count, 10);
  assertEquals(bars[5].heightPx, 56);
  assertEquals(bars[0].count, 0);
  assertEquals(bars[0].heightPx, 6);
  for (const bar of bars) {
    assert(["S", "M", "T", "W", "T", "F", "S"].includes(bar.dayInitial));
  }
});

// ===========================================================================
// Share Stats KPI Header, Tablist Keyboard Nav, and Item Reordering
// ===========================================================================
Deno.test("reorderItems - moves items up/down within bounds without mutating input", () => {
  const original = ["track-1", "track-2", "track-3"];
  assertEquals(reorderItems(original, 0, -1), [
    "track-1",
    "track-2",
    "track-3",
  ]);
  assertEquals(reorderItems(original, 2, 1), ["track-1", "track-2", "track-3"]);
  assertEquals(reorderItems(original, 0, 1), ["track-2", "track-1", "track-3"]);
  assertEquals(reorderItems(original, 2, -1), [
    "track-1",
    "track-3",
    "track-2",
  ]);
  assertEquals(original, ["track-1", "track-2", "track-3"]);
});

Deno.test("nextStatsRange - cycles Today / 7 days / All time on Left/Right/Home/End", () => {
  assertEquals(nextStatsRange("today", "ArrowRight"), "week");
  assertEquals(nextStatsRange("week", "ArrowRight"), "all");
  assertEquals(nextStatsRange("all", "ArrowRight"), "today");
  assertEquals(nextStatsRange("today", "ArrowLeft"), "all");
  assertEquals(nextStatsRange("all", "ArrowLeft"), "week");
  assertEquals(nextStatsRange("week", "Home"), "today");
  assertEquals(nextStatsRange("today", "End"), "all");
  assertEquals(nextStatsRange("week", "Enter"), null);
});

Deno.test("cardKpis - builds 3-tile KPI header for Today, 7 days, and All time", () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const prevWeekDay = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(
    0,
    10,
  );
  const cards = buildCards(
    {
      views: 50,
      devices: { mobile: 40, desktop: 10 },
      items: { "song-1": 18 },
      downloads: 7,
      shares: 3,
    },
    [
      {
        day: prevWeekDay,
        views: 10,
        people: 8,
        returns: 1,
        countries: { AU: 10 },
        cities: { Melbourne: 10 },
        devices: { mobile: 8, desktop: 2 },
        hours: new Array(24).fill(0),
        items: { "song-1": 4 },
        dwell_s: 120,
        dwell_n: 5,
        completions: 3,
        shares: 1,
        downloads: 2,
        referred: 0,
      },
      {
        day: todayStr,
        views: 15,
        people: 12,
        returns: 2,
        countries: { AU: 15 },
        cities: { Melbourne: 15 },
        devices: { mobile: 12, desktop: 3 },
        hours: new Array(24).fill(0),
        items: { "song-1": 9 },
        dwell_s: 200,
        dwell_n: 10,
        completions: 6,
        shares: 2,
        downloads: 4,
        referred: 0,
      },
    ],
  );

  const todayKpis = cardKpis(cards.today, "playlist");
  assertEquals(todayKpis[0].label, "Page Opens");
  assertEquals(todayKpis[0].value, "15");
  assertEquals(todayKpis[1].label, "Visitors");
  assertEquals(todayKpis[1].value, "~12 today");
  assertEquals(todayKpis[1].badge, "2 repeat");
  assertEquals(todayKpis[2].label, "Top Track");
  assertEquals(todayKpis[2].value, "9 plays");

  const weekKpis = cardKpis(cards.week, "playlist");
  assertEquals(weekKpis[0].label, "Page Opens");
  assertEquals(weekKpis[0].value, "15");
  assertEquals(weekKpis[0].badge, "↑ 50%");
  assertEquals(weekKpis[1].label, "Device Split");
  assertEquals(weekKpis[1].value, "📱 80% phones");
  assertEquals(weekKpis[2].value, "9 plays");

  const allFileKpis = cardKpis(cards.all, "file");
  assertEquals(allFileKpis[0].value, "50");
  assertEquals(allFileKpis[1].value, "📱 80% phones");
  assertEquals(allFileKpis[2].label, "Downloads");
  assertEquals(allFileKpis[2].value, "7");
});

// ===========================================================================
// i18n: getClientLocale & getLanguageSwitchHref
// ===========================================================================
import { getClientLocale, getLanguageSwitchHref } from "../utils/i18n.ts";

Deno.test("getClientLocale - respects explicit lang and falls back cleanly on server", () => {
  assertEquals(getClientLocale("es"), "es");
  assertEquals(getClientLocale("en"), "en");
  assertEquals(getClientLocale(undefined), "en");
});

Deno.test("getLanguageSwitchHref - maps home and vertical routes symmetrically between EN and ES", () => {
  assertEquals(getLanguageSwitchHref("/", "es"), "/es");
  assertEquals(getLanguageSwitchHref("/es", "en"), "/");
  assertEquals(getLanguageSwitchHref("/for/menus", "es"), "/es/menus");
  assertEquals(getLanguageSwitchHref("/es/menus", "en"), "/for/menus");
  assertEquals(getLanguageSwitchHref("/for/weddings", "es"), "/es/bodas");
  assertEquals(getLanguageSwitchHref("/es/bodas", "en"), "/for/weddings");
  assertEquals(getLanguageSwitchHref("/for/music", "es"), "/es/musica");
  assertEquals(getLanguageSwitchHref("/es/musica", "en"), "/for/music");
  assertEquals(getLanguageSwitchHref("/for/lockers", "es"), "/es/archivos");
  assertEquals(getLanguageSwitchHref("/es/archivos", "en"), "/for/lockers");
  assertEquals(getLanguageSwitchHref("/why", "es"), "/es/por-que");
  assertEquals(getLanguageSwitchHref("/es/por-que", "en"), "/why");
  assertEquals(
    getLanguageSwitchHref("/guide/printing", "es"),
    "/es/guia/impresion",
  );
  assertEquals(
    getLanguageSwitchHref("/es/guia/impresion", "en"),
    "/guide/printing",
  );
});

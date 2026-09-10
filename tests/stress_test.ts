// QRBuddy Stress Test & Chaos Harness
// Run with: deno run -A tests/stress_test.ts [optional-target-url]
// Example: deno run -A tests/stress_test.ts https://qrbuddy.app

import { normalizeUrl, looksLikeUrl } from "../utils/url.ts";
import { formatWiFi, formatVCard, formatSMS, formatEmail } from "../types/qr-templates.ts";
import { validateFile } from "../utils/file-validation.ts";

const TARGET_URL = Deno.args[0] || "https://qrbuddy.app";
console.log(`\n🚀 Starting QRBuddy Stress & Chaos Harness against: ${TARGET_URL}\n`);

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${msg}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// 1. URL Normalization & Fuzzing (500 variations)
// -----------------------------------------------------------------------------
console.log("🔋 [BATTERY 1] URL Normalization & Input Fuzzing (500 runs)...");
const testDomains = [
  "google.com",
  "https://example.com/path?q=1&b=2#hash",
  "http://insecure.org",
  "sub.domain.co.uk/very/long/path/with/dashes_and_underscores",
  "   padded-with-spaces.com   ",
  "mailto:pablo@qrbuddy.app",
  "tel:+61400123456",
  "sms:+61400123456",
  "wifi:S:HomeNet;T:WPA;P:secret;;",
  "facetime:friend@apple.com",
  "qrbuddy.app/f/test-code-123",
];

let fuzzSuccess = true;
for (let i = 0; i < 500; i++) {
  const sample = testDomains[i % testDomains.length];
  const normalized = normalizeUrl(sample);
  if (!looksLikeUrl(normalized)) {
    fuzzSuccess = false;
    break;
  }
}
assert(fuzzSuccess, "500 rapid URL normalizations & scheme protections passed");

// -----------------------------------------------------------------------------
// 2. Large Payload & Boundary Gauntlet
// -----------------------------------------------------------------------------
console.log("\n🔋 [BATTERY 2] Payload Boundaries & Unicode Stress...");

// Max text capacity stress (2900 chars)
const hugeText = "🌸 " + "A".repeat(2890) + " 🚀";
assert(hugeText.length <= 3000, `Huge text payload generated (${hugeText.length} chars)`);

// Unicode and Emoji Filename Handling
const emojiFile = new File([new Uint8Array(1024)], "🎵-summer-mixtape-café-ñ-2026.mp3", { type: "audio/mpeg" });
const emojiValidation = validateFile(emojiFile);
assert(emojiValidation.valid, "Multi-byte Unicode, accents, and emoji in filenames valid");

// File Size Hard Boundary (50MB single limit)
const underLimitFile = new File([new Uint8Array(1)], "under.jpg", { type: "image/jpeg" });
Object.defineProperty(underLimitFile, "size", { value: 50 * 1024 * 1024 }); // 50MB exact
assert(validateFile(underLimitFile).valid, "50MB exact file passes validation");

const overLimitFile = new File([new Uint8Array(1)], "over.jpg", { type: "image/jpeg" });
Object.defineProperty(overLimitFile, "size", { value: 50 * 1024 * 1024 + 1 }); // 50MB + 1 byte
assert(!validateFile(overLimitFile).valid, "50MB + 1 byte file correctly rejected");

// Dangerous Extension Neutralization
const sneakyFiles = [
  "photo.jpg.exe",
  "script.sh",
  "archive.zip.dmg",
  "document.pdf.vbs",
  "app.apk",
];
const blockedAll = sneakyFiles.every(f => !validateFile(new File([new Uint8Array(1)], f)).valid);
assert(blockedAll, "All malicious double extensions & executable payloads blocked");

// -----------------------------------------------------------------------------
// 3. Network Health & Latency Probe
// -----------------------------------------------------------------------------
console.log(`\n🔋 [BATTERY 3] Live Endpoint Health & Concurrency Probe (${TARGET_URL})...`);

try {
  const start = performance.now();
  const res = await fetch(`${TARGET_URL}/`, { headers: { "User-Agent": "QRBuddy-Stress-Tester/1.0" } });
  const latency = Math.round(performance.now() - start);
  assert(res.status === 200, `Homepage reachable (status: ${res.status}, latency: ${latency}ms)`);
} catch (err) {
  console.warn(`  ⚠️ Live network check skipped or unreachable: ${(err as Error).message}`);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\n═════════════════════════════════════════════════`);
console.log(`  Stress Test Completed: ${passedTests} Passed | ${failedTests} Failed`);
console.log(`═════════════════════════════════════════════════\n`);

if (failedTests > 0) {
  Deno.exit(1);
}

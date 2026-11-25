import { assert, assertEquals } from "$std/assert/mod.ts";
import { buildDynamicQRUpdatePayload } from "../hooks/useDynamicQR.ts";
import {
  FREE_SLIDESHOW_FILE_SIZE,
  PASSPORT_SLIDESHOW_FILE_SIZE,
} from "../hooks/useFileUpload.ts";

const read = (p: string) =>
  Deno.readTextFile(new URL(`../${p}`, import.meta.url));

Deno.test("V3-A: Passport retention (365d) & 25MB mixtape limits wired in edge functions", async () => {
  const uploadFile = await read("supabase/functions/upload-file/index.ts");
  assert(
    uploadFile.includes("PASSPORT_RETENTION_DAYS = 365"),
    "upload-file must grant 365-day retention for Passport",
  );
  assert(
    uploadFile.includes("FREE_RETENTION_DAYS = 30"),
    "upload-file must keep 30-day retention for free shares",
  );
  assert(
    uploadFile.includes("PASSPORT_MULTI_ITEM_SIZE = 25 * 1024 * 1024"),
    "upload-file must allow 25MB per item on Passport multi-file drops",
  );

  const finalizeUpload = await read(
    "supabase/functions/finalize-upload/index.ts",
  );
  assert(
    finalizeUpload.includes("PASSPORT_RETENTION_DAYS = 365") &&
      finalizeUpload.includes("expires_at: passportExpiresAt"),
    "finalize-upload must extend R2 Passport drops to 365 days",
  );

  const updateFile = await read("supabase/functions/update-file/index.ts");
  assert(
    updateFile.includes("PASSPORT_ITEM_BYTES = 25 * 1024 * 1024") &&
      updateFile.includes("PASSPORT_RETENTION_DAYS = 365"),
    "update-file must support 25MB appends and 365-day Passport retention",
  );

  const cleanup = await read("supabase/functions/cleanup-expired/index.ts");
  assert(
    cleanup.includes("PASSPORT_RETENTION_DAYS = 365") &&
      cleanup.includes('.eq("unbranded", false)'),
    "cleanup-expired must protect Passport reusable lockers for 365 days",
  );

  assertEquals(FREE_SLIDESHOW_FILE_SIZE, 5 * 1024 * 1024);
  assertEquals(PASSPORT_SLIDESHOW_FILE_SIZE, 25 * 1024 * 1024);
});

Deno.test("V3-A: Dynamic QR edge functions lift Passport rate limits and persist title", async () => {
  const createQr = await read("supabase/functions/create-dynamic-qr/index.ts");
  assert(
    createQr.includes("sanitizeTitle") &&
      createQr.includes("title: cleanTitle"),
    "create-dynamic-qr must sanitize and persist title across paths",
  );

  const updateQr = await read("supabase/functions/update-dynamic-qr/index.ts");
  assert(
    updateQr.includes("maxRequests: hasPass ? 300 : 60"),
    "update-dynamic-qr must lift hourly rate limit for Passport holders",
  );
  assert(
    updateQr.includes("updates.title = sanitizeTitle(title)") &&
      updateQr.includes("title: data.title ?? null"),
    "update-dynamic-qr must accept and return title",
  );

  const getQr = await read("supabase/functions/get-dynamic-qr/index.ts");
  assert(
    getQr.includes("requestHasValidPass") &&
      getQr.includes("maxRequests: hasPass ? 300 : 60") &&
      getQr.includes("title: data.title ?? null"),
    "get-dynamic-qr must lift Passport read limit and return title",
  );
});

Deno.test("V3-A: buildDynamicQRUpdatePayload forwards sanitized title cleanly", () => {
  const withTitle = buildDynamicQRUpdatePayload({
    ownerToken: "tok_123",
    title: "  Brunswick Lunch Menu  ",
    destinationUrl: "https://example.com/lunch",
    isSequential: false,
    sequentialUrls: ["", ""],
    loopSequence: false,
    splashConfig: null,
    scanLimit: null,
    expiryDate: "",
    isActive: true,
  });
  assert(withTitle.ok);
  assertEquals(withTitle.payload.title, "Brunswick Lunch Menu");

  const cleared = buildDynamicQRUpdatePayload({
    ownerToken: "tok_123",
    title: "   ",
    destinationUrl: "https://example.com/lunch",
    isSequential: false,
    sequentialUrls: ["", ""],
    loopSequence: false,
    splashConfig: null,
    scanLimit: null,
    expiryDate: "",
    isActive: true,
  });
  assert(cleared.ok);
  assertEquals(cleared.payload.title, null);
});

Deno.test("V3-Gate: geo: redirect routing + untouched limited chunked append work cleanly", async () => {
  const redirectQr = await read("supabase/functions/redirect-qr/index.ts");
  assert(
    redirectQr.includes('"geo:"'),
    "redirect-qr must allow geo: redirects",
  );

  const routingConfig = await read(
    "supabase/functions/_shared/routing-config.ts",
  );
  assert(
    routingConfig.includes('"geo:"'),
    "routing-config must allow geo: in multi-link/time/device rules",
  );

  const updateFile = await read("supabase/functions/update-file/index.ts");
  assert(
    updateFile.includes('action !== "append" || hasBeenDownloaded'),
    "update-file must allow initial chunked append on 0-download shares",
  );
});

// R2 big-files logic checks: path routing, pass-aware size validation, and
// presigned URL shape (signed offline with dummy creds — no network).

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { isR2Path } from "../supabase/functions/_shared/r2.ts";
import {
  MAX_FILE_SIZE,
  SUPPORTER_MAX_FILE_SIZE,
  validateFile,
} from "../supabase/functions/_shared/file-validation.ts";

Deno.test("isR2Path routes backends by prefix", () => {
  assert(isR2Path("r2/bucket-abc123-uuid"));
  assert(isR2Path("r2/main-id/file-id.mp4"));
  assertEquals(isR2Path("bucket-abc123-uuid"), false);
  assertEquals(isR2Path("main-id/file-id.mp4"), false);
  assertEquals(isR2Path(null), false);
  assertEquals(isR2Path(undefined), false);
});

Deno.test("validateFile default cap stays 50MB, supporter cap lifts it", () => {
  const bigFile = new File(
    [new Uint8Array(1)],
    "video.mp4",
    { type: "video/mp4" },
  );
  // Fake the size — building a real 60MB blob in a test is silly.
  Object.defineProperty(bigFile, "size", { value: 60 * 1024 * 1024 });

  assertEquals(validateFile(bigFile).valid, false);
  assertEquals(validateFile(bigFile, SUPPORTER_MAX_FILE_SIZE).valid, true);

  const tooBigEvenForSupporters = new File([], "huge.zip");
  Object.defineProperty(tooBigEvenForSupporters, "size", {
    value: SUPPORTER_MAX_FILE_SIZE + 1,
  });
  assertEquals(
    validateFile(tooBigEvenForSupporters, SUPPORTER_MAX_FILE_SIZE).valid,
    false,
  );

  // Blocked extensions stay blocked at any size.
  const evil = new File([], "totally-a-video.exe");
  assertEquals(validateFile(evil, SUPPORTER_MAX_FILE_SIZE).valid, false);

  assertEquals(SUPPORTER_MAX_FILE_SIZE > MAX_FILE_SIZE, true);
});

Deno.test("presign mints SigV4 query URLs against the R2 endpoint", async () => {
  Deno.env.set("R2_ACCOUNT_ID", "testaccount");
  Deno.env.set("R2_ACCESS_KEY_ID", "testkey");
  Deno.env.set("R2_SECRET_ACCESS_KEY", "testsecret");
  Deno.env.set("R2_BUCKET", "qrbuddy-files");

  const { presignGet, presignPut } = await import(
    "../supabase/functions/_shared/r2.ts"
  );

  const putUrl = new URL(await presignPut("r2/main/file.mp4", 3600));
  assertEquals(
    putUrl.hostname,
    "testaccount.r2.cloudflarestorage.com",
  );
  assertEquals(putUrl.pathname, "/qrbuddy-files/r2/main/file.mp4");
  assertEquals(putUrl.searchParams.get("X-Amz-Expires"), "3600");
  assert(putUrl.searchParams.get("X-Amz-Signature"));

  const getUrl = new URL(
    await presignGet("r2/main/file.mp4", 60, "holiday video.mp4", "video/mp4"),
  );
  assertEquals(getUrl.searchParams.get("X-Amz-Expires"), "60");
  assert(getUrl.searchParams.get("X-Amz-Signature"));
  assert(
    getUrl.searchParams.get("response-content-disposition")?.startsWith(
      "attachment;",
    ),
  );
  assertEquals(
    getUrl.searchParams.get("response-content-type"),
    "video/mp4",
  );
});

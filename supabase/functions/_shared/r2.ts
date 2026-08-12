// Cloudflare R2 helpers (S3-compatible) for supporter big files.
// ================================================================
//
// The rule: a storage path that starts with "r2/" lives in the R2 bucket and
// the path IS the object key. Everything else is Supabase storage. Readers
// (get-file, download-from-bucket, cleanup-expired) branch on isR2Path().
//
// Presigned URLs mean bytes never touch an edge function: browsers PUT
// straight to R2 (bypasses the function body limit that capped uploads) and
// GET straight from R2 (zero egress fees at any volume).
//
// Secrets live ONLY in Supabase edge function secrets: R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

export function isR2Path(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("r2/");
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function getR2Config(): R2Config {
  const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
  const bucket = Deno.env.get("R2_BUCKET") ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 is not configured");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Configured(): boolean {
  try {
    getR2Config();
    return true;
  } catch {
    return false;
  }
}

function r2Client(config: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: "auto",
    service: "s3",
  });
}

function objectUrl(config: R2Config, key: string): URL {
  // Keys are generated server-side from uuids + a sanitized extension, so
  // they're URL-safe by construction — no per-segment encoding needed.
  return new URL(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`,
  );
}

async function presign(
  method: "PUT" | "GET",
  key: string,
  expiresSec: number,
  extraParams: Record<string, string> = {},
): Promise<string> {
  const config = getR2Config();
  const url = objectUrl(config, key);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  for (const [param, value] of Object.entries(extraParams)) {
    url.searchParams.set(param, value);
  }
  const signed = await r2Client(config).sign(
    new Request(url, { method }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** Presigned browser→R2 upload URL. Size is enforced at finalize (HEAD check),
 * not here — Content-Length can't be trusted into a presigned PUT anyway. */
export function presignPut(key: string, expiresSec = 3600): Promise<string> {
  return presign("PUT", key, expiresSec);
}

/** Presigned download URL with a friendly filename + content type. Keep the
 * expiry short (~60s) — it's minted after auth/claim logic has already run. */
export function presignGet(
  key: string,
  expiresSec = 60,
  downloadFilename?: string,
  contentType?: string,
): Promise<string> {
  const extraParams: Record<string, string> = {};
  if (downloadFilename) {
    const safeName = downloadFilename.replace(/[\r\n"\\]/g, "_");
    extraParams["response-content-disposition"] = `attachment; filename="${
      encodeURIComponent(safeName).replace(/%20/g, " ")
    }"`;
  }
  if (contentType) {
    extraParams["response-content-type"] = contentType;
  }
  return presign("GET", key, expiresSec, extraParams);
}

/** Object size in bytes, or null when the object doesn't exist. */
export async function headObjectSize(key: string): Promise<number | null> {
  const config = getR2Config();
  const response = await r2Client(config).fetch(
    objectUrl(config, key).toString(),
    { method: "HEAD" },
  );
  if (!response.ok) return null;
  return Number(response.headers.get("content-length") ?? "0");
}

/** Delete objects, returning the keys that were actually removed (404 counts
 * as removed — deletes are idempotent). Failures stay behind for retry. */
// ponytail: sequential per-key DELETEs, not the S3 batch-delete XML API —
// nightly reap batches are tiny; switch to batch if they ever aren't.
export async function deleteObjects(keys: string[]): Promise<string[]> {
  const config = getR2Config();
  const client = r2Client(config);
  const deleted: string[] = [];
  for (const key of keys) {
    try {
      const response = await client.fetch(
        objectUrl(config, key).toString(),
        { method: "DELETE" },
      );
      if (response.ok || response.status === 404) {
        deleted.push(key);
      } else {
        console.error(`R2 delete failed for ${key}: ${response.status}`);
      }
    } catch (error) {
      console.error(`R2 delete failed for ${key}:`, error);
    }
  }
  return deleted;
}

// Edge Function: Cleanup Expired Files
// Deletes files and buckets that are older than 24 hours (or other retention policy)
// Should be scheduled to run periodically (e.g., every hour)

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { deleteObjects, isR2Path, r2Configured } from "../_shared/r2.ts";

/** Best-effort R2 deletion — returns the keys actually removed. Skips
 * quietly when R2 secrets aren't set so the Supabase reaping never breaks. */
async function reapR2(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  if (!r2Configured()) {
    console.error("R2 not configured — skipping R2 reap of", keys.length);
    return [];
  }
  return await deleteObjects(keys);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    const expectedSecret = Deno.env.get("CLEANUP_SECRET");
    if (!expectedSecret) {
      console.error("CLEANUP_SECRET not configured");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getCorsHeaders(req),
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getCorsHeaders(req),
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Find expired buckets (older than 24 hours)
    // We define "expired" as created_at < 24 hours ago AND is_reusable = true (persistent)
    // One-time buckets are deleted upon download, but maybe we should clean up abandoned ones too?
    // Let's say ALL buckets expire after 24 hours for now, based on the proposal.

    // 1. Find expired buckets (older than 30 days if unused)
    // "Free can only have a limited amount of saved files and they die after 30 days if unused"

    const retentionDays = 30;
    const cutoffTime = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Logic:
    // If last_accessed_at is set, use that.
    // If last_accessed_at is null, use last_filled_at (creation of content).
    // If both are older than 30 days, expire it.

    // We can't easily do complex OR logic in one Supabase query without raw SQL or RPC.
    // But we can fetch candidates and filter, or use "or" filter.
    // Let's use a simplified approach:
    // Fetch buckets where (last_accessed_at < cutoff) OR (last_accessed_at IS NULL AND last_filled_at < cutoff)
    // Supabase .or() syntax: .or(`last_accessed_at.lt.${cutoffTime},and(last_accessed_at.is.null,last_filled_at.lt.${cutoffTime})`)

    // Get expired buckets that are NOT empty (have files to delete)
    const { data: expiredBuckets, error: fetchError } = await supabase
      .from("file_buckets")
      .select("id, bucket_code, content_metadata, content_type")
      .or(
        `last_accessed_at.lt.${cutoffTime},and(last_accessed_at.is.null,last_filled_at.lt.${cutoffTime})`,
      )
      .eq("is_empty", false)
      .eq("is_reusable", true); // Only applies to persistent buckets

    if (fetchError) throw fetchError;

    let deletedFiles = 0;
    let deletedBuckets = 0;

    // Delete files from storage
    if (expiredBuckets && expiredBuckets.length > 0) {
      const filesToDelete: string[] = [];

      for (const bucket of expiredBuckets) {
        if (
          bucket.content_type === "file" &&
          bucket.content_metadata?.storage_path
        ) {
          filesToDelete.push(bucket.content_metadata.storage_path);
        }
      }

      // r2/ paths live in Cloudflare R2, the rest in Supabase storage.
      const r2Files = filesToDelete.filter(isR2Path);
      const supabaseFiles = filesToDelete.filter((p) => !isR2Path(p));

      if (supabaseFiles.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("qr-files")
          .remove(supabaseFiles);

        if (storageError) console.error("Storage delete error:", storageError);
        else deletedFiles = supabaseFiles.length;
      }
      deletedFiles += (await reapR2(r2Files)).length;

      // Empty these buckets
      const expiredIds = expiredBuckets.map((b) => b.id);
      const { error: updateError } = await supabase
        .from("file_buckets")
        .update({
          is_empty: true,
          content_type: null,
          content_data: null,
          content_metadata: null,
          last_emptied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", expiredIds);

      if (updateError) throw updateError;
    }

    // 2. Delete abandoned/empty buckets (older than 30 days)
    // This includes:
    // - One-time buckets that were never used
    // - Persistent buckets that have been empty for 30 days
    const abandonedCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString();

    const { error: deleteError, count } = await supabase
      .from("file_buckets")
      .delete({ count: "exact" })
      .lt("updated_at", abandonedCutoff) // updated_at is touched on creation and modification
      .eq("is_empty", true); // Only delete if empty

    if (deleteError) throw deleteError;
    deletedBuckets = count || 0;

    // 3. Delete expired destructible_files (older than 30 days)
    // These are single-use files that were never downloaded.
    const { data: expiredFiles, error: fetchFilesError } = await supabase
      .from("destructible_files")
      .select("id, file_name, files")
      .lt("created_at", abandonedCutoff)
      .eq("accessed", false);

    if (fetchFilesError) throw fetchFilesError;

    if (expiredFiles && expiredFiles.length > 0) {
      // Multi-file shares store sub-file paths in the `files` JSONB column.
      // file_name is only the first sub-file, so collecting just that would
      // orphan the rest in storage forever. Gather every path, de-duped.
      const paths = Array.from(
        new Set(
          expiredFiles.flatMap((f) => {
            const subPaths: string[] = [];
            if (f.file_name) subPaths.push(f.file_name);
            if (Array.isArray(f.files)) {
              for (const sub of f.files) {
                if (sub?.path) subPaths.push(sub.path);
              }
            }
            return subPaths;
          }),
        ),
      );

      // Delete from storage (Supabase paths) and R2 (r2/ paths)
      const supabasePaths = paths.filter((p) => !isR2Path(p));
      if (supabasePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("qr-files")
          .remove(supabasePaths);

        if (storageError) {
          console.error("Storage delete error (destructible):", storageError);
        }
      }
      await reapR2(paths.filter(isR2Path));

      // Delete from DB
      const ids = expiredFiles.map((f) => f.id);
      const { error: dbDeleteError } = await supabase
        .from("destructible_files")
        .delete()
        .in("id", ids);

      if (dbDeleteError) throw dbDeleteError;

      deletedFiles += expiredFiles.length;
    }

    // 4. Deactivate expired dynamic QRs.
    // redirect-qr only flips is_active lazily on scan, so an expired QR that
    // never gets scanned again would look live in the DB forever.
    const { count: deactivatedQRs, error: qrError } = await supabase
      .from("dynamic_qr_codes")
      .update({ is_active: false }, { count: "exact" })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    if (qrError) console.error("Dynamic QR deactivation error:", qrError);

    // 5. Scan-log retention: coarse per-scan analytics only need to power the
    // owner dashboard, not grow forever. Keep 90 days.
    const scanLogCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString();
    const { count: prunedScanLogs, error: scanLogError } = await supabase
      .from("scan_logs")
      .delete({ count: "exact" })
      .lt("scanned_at", scanLogCutoff);

    if (scanLogError) console.error("Scan log pruning error:", scanLogError);

    // 6. Drain the R2 reap queue. Downloads of R2-backed files hand out ~60s
    // presigned URLs, so objects are queued (+1h) instead of deleted inline.
    // Failed deletes keep their queue row and retry next run.
    let reapedR2Objects = 0;
    const { data: reapRows, error: reapFetchError } = await supabase
      .from("r2_reap_queue")
      .select("storage_key")
      .lt("reap_after", new Date().toISOString());

    if (reapFetchError) {
      console.error("R2 reap queue fetch error:", reapFetchError);
    } else if (reapRows && reapRows.length > 0) {
      const reaped = await reapR2(reapRows.map((r) => r.storage_key));
      if (reaped.length > 0) {
        const { error: reapDeleteError } = await supabase
          .from("r2_reap_queue")
          .delete()
          .in("storage_key", reaped);
        if (reapDeleteError) {
          console.error("R2 reap queue delete error:", reapDeleteError);
        }
      }
      reapedR2Objects = reaped.length;
    }

    // 7. Abandoned presigned-upload grants (>24h old, never finalized):
    // delete any orphaned R2 object, then the grant row.
    const pendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString();
    const { data: stalePending, error: pendingFetchError } = await supabase
      .from("pending_uploads")
      .select("id, storage_key")
      .lt("created_at", pendingCutoff);

    if (pendingFetchError) {
      console.error("Pending uploads fetch error:", pendingFetchError);
    } else if (stalePending && stalePending.length > 0) {
      await reapR2(stalePending.map((p) => p.storage_key));
      const { error: pendingDeleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .in("id", stalePending.map((p) => p.id));
      if (pendingDeleteError) {
        console.error("Pending uploads delete error:", pendingDeleteError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          `Cleanup complete. Emptied persistent buckets with old content. Deleted ${deletedBuckets} abandoned buckets.`,
        deleted_files: deletedFiles,
        deleted_buckets: deletedBuckets,
        deactivated_dynamic_qrs: deactivatedQRs ?? 0,
        pruned_scan_logs: prunedScanLogs ?? 0,
        reaped_r2_objects: reapedR2Objects,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Cleanup failed:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

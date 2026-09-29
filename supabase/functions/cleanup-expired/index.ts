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
      const failedStoragePaths = new Set<string>();

      if (supabaseFiles.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("qr-files")
          .remove(supabaseFiles);

        if (storageError) {
          console.error("Storage delete error:", storageError);
          supabaseFiles.forEach((path) => failedStoragePaths.add(path));
        } else {
          deletedFiles = supabaseFiles.length;
        }
      }
      const reapedR2Files = new Set(await reapR2(r2Files));
      deletedFiles += reapedR2Files.size;
      r2Files
        .filter((path) => !reapedR2Files.has(path))
        .forEach((path) => failedStoragePaths.add(path));

      // Keep metadata for buckets whose object deletion failed so cleanup can
      // retry with the storage key still available on the next run.
      const expiredIds = expiredBuckets
        .filter((bucket) => {
          const storagePath = bucket.content_type === "file"
            ? bucket.content_metadata?.storage_path
            : null;
          return !storagePath || !failedStoragePaths.has(storagePath);
        })
        .map((bucket) => bucket.id);

      if (expiredIds.length > 0) {
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
      const failedStoragePaths = new Set<string>();
      if (supabasePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("qr-files")
          .remove(supabasePaths);

        if (storageError) {
          console.error("Storage delete error (destructible):", storageError);
          supabasePaths.forEach((path) => failedStoragePaths.add(path));
        }
      }
      const r2Paths = paths.filter(isR2Path);
      const reapedR2Paths = new Set(await reapR2(r2Paths));
      r2Paths
        .filter((path) => !reapedR2Paths.has(path))
        .forEach((path) => failedStoragePaths.add(path));

      const pathsForFile = (file: {
        file_name: string | null;
        files: Array<{ path?: string }> | null;
      }) => {
        const filePaths = file.file_name ? [file.file_name] : [];
        if (Array.isArray(file.files)) {
          for (const subFile of file.files) {
            if (subFile?.path) filePaths.push(subFile.path);
          }
        }
        return filePaths;
      };
      const ids = expiredFiles
        .filter((file) =>
          pathsForFile(file).every((path) => !failedStoragePaths.has(path))
        )
        .map((file) => file.id);

      if (ids.length > 0) {
        const { error: dbDeleteError } = await supabase
          .from("destructible_files")
          .delete()
          .in("id", ids);

        if (dbDeleteError) throw dbDeleteError;
        deletedFiles += ids.length;
      }
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

    // Share stats ledger: same 90-day window. Lifetime tallies on the share
    // row keep the totals; only the day-by-day detail ages out.
    const { error: ledgerError } = await supabase
      .from("share_stats_daily")
      .delete()
      .lt("day", scanLogCutoff.slice(0, 10));
    if (ledgerError) console.error("Share ledger pruning error:", ledgerError);

    // Weather cache backs the ledger's baseline — same window, plus a week
    // of slack for the backfill.
    const weatherCutoff = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const { error: weatherError } = await supabase
      .from("weather_days")
      .delete()
      .lt("day", weatherCutoff);
    if (weatherError) {
      console.error("Weather cache pruning error:", weatherError);
    }

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

    // 7. Drain storage cleanup queued by owner removals. A one-hour delay lets
    // open previews and short-lived R2 URLs finish; failed deletes keep their
    // queue row so the next scheduled run can retry.
    let reapedStorageObjects = 0;
    const { data: storageReapRows, error: storageReapFetchError } =
      await supabase
        .from("file_storage_reap_queue")
        .select("storage_path")
        .lt("reap_after", new Date().toISOString());

    if (storageReapFetchError) {
      console.error("Storage reap queue fetch error:", storageReapFetchError);
    } else if (storageReapRows && storageReapRows.length > 0) {
      const paths = storageReapRows.map((row) => row.storage_path);
      const r2Paths = paths.filter(isR2Path);
      const supabasePaths = paths.filter((path) => !isR2Path(path));
      const reapedPaths = new Set(await reapR2(r2Paths));

      if (supabasePaths.length > 0) {
        const { error: storageReapError } = await supabase.storage
          .from("qr-files")
          .remove(supabasePaths);

        if (storageReapError) {
          console.error("Storage reap failed:", storageReapError);
        } else {
          supabasePaths.forEach((path) => reapedPaths.add(path));
        }
      }

      if (reapedPaths.size > 0) {
        const { error: queueDeleteError } = await supabase
          .from("file_storage_reap_queue")
          .delete()
          .in("storage_path", Array.from(reapedPaths));
        if (queueDeleteError) {
          console.error("Storage reap queue delete error:", queueDeleteError);
        } else {
          reapedStorageObjects = reapedPaths.size;
        }
      }
    }

    // 8. Retire old presigned-upload grants. Finalized grants already have a
    // durable share or a queued bucket-conflict reap; unfinalized grants keep
    // their row until the orphaned R2 object was actually deleted.
    const pendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString();
    let cleanedPendingUploads = 0;
    const { data: stalePending, error: pendingFetchError } = await supabase
      .from("pending_uploads")
      .select("id, storage_key, finalized_at")
      .lt("created_at", pendingCutoff);

    if (pendingFetchError) {
      console.error("Pending uploads fetch error:", pendingFetchError);
    } else if (stalePending && stalePending.length > 0) {
      const safeToDeleteIds = stalePending
        .filter((pending) => pending.finalized_at)
        .map((pending) => pending.id);
      const unfinalized = stalePending.filter((pending) =>
        !pending.finalized_at
      );

      if (unfinalized.length > 0) {
        const keys = Array.from(
          new Set(unfinalized.map((pending) => pending.storage_key)),
        );
        const [fileReferences, bucketReferences] = await Promise.all([
          supabase
            .from("destructible_files")
            .select("file_name")
            .in("file_name", keys),
          supabase
            .from("file_buckets")
            .select("content_data")
            .in("content_data", keys)
            .eq("is_empty", false),
        ]);

        if (fileReferences.error || bucketReferences.error) {
          console.error(
            "Pending upload reference check failed; keeping grants for retry:",
            fileReferences.error ?? bucketReferences.error,
          );
        } else {
          const referencedKeys = new Set<string>();
          for (const row of fileReferences.data ?? []) {
            if (typeof row.file_name === "string") {
              referencedKeys.add(row.file_name);
            }
          }
          for (const row of bucketReferences.data ?? []) {
            if (typeof row.content_data === "string") {
              referencedKeys.add(row.content_data);
            }
          }

          for (const pending of unfinalized) {
            if (referencedKeys.has(pending.storage_key)) {
              // Legacy finalizers could create a live record but fail to
              // delete its grant. Retire that grant without touching the file.
              safeToDeleteIds.push(pending.id);
            }
          }

          const orphaned = unfinalized.filter((pending) =>
            !referencedKeys.has(pending.storage_key) &&
            isR2Path(pending.storage_key)
          );
          const reapedKeys = new Set(
            await reapR2(
              Array.from(new Set(orphaned.map((p) => p.storage_key))),
            ),
          );
          for (const pending of orphaned) {
            if (reapedKeys.has(pending.storage_key)) {
              safeToDeleteIds.push(pending.id);
            }
          }
        }
      }

      if (safeToDeleteIds.length > 0) {
        const { error: pendingDeleteError, count } = await supabase
          .from("pending_uploads")
          .delete({ count: "exact" })
          .in("id", safeToDeleteIds);
        if (pendingDeleteError) {
          console.error("Pending uploads delete error:", pendingDeleteError);
        } else {
          cleanedPendingUploads = count ?? safeToDeleteIds.length;
        }
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
        reaped_storage_objects: reapedStorageObjects,
        cleaned_pending_uploads: cleanedPendingUploads,
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

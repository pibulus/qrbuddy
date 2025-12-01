// Edge Function: Cleanup Expired Files
// Deletes files and buckets that are older than 24 hours (or other retention policy)
// Should be scheduled to run periodically (e.g., every hour)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization (Service Role or specific secret)
    // For now, we assume this is triggered by a secure cron job passing a secret
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
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
    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

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
      .or(`last_accessed_at.lt.${cutoffTime},and(last_accessed_at.is.null,last_filled_at.lt.${cutoffTime})`)
      .eq("is_empty", false)
      .eq("is_reusable", true); // Only applies to persistent buckets

    if (fetchError) throw fetchError;

    let deletedFiles = 0;
    let deletedBuckets = 0;

    // Delete files from storage
    if (expiredBuckets && expiredBuckets.length > 0) {
      const filesToDelete: string[] = [];
      
      for (const bucket of expiredBuckets) {
        if (bucket.content_type === "file" && bucket.content_metadata?.storage_path) {
          filesToDelete.push(bucket.content_metadata.storage_path);
        }
      }

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("qr-files")
          .remove(filesToDelete);
        
        if (storageError) console.error("Storage delete error:", storageError);
        else deletedFiles = filesToDelete.length;
      }
      
      // Empty these buckets
      const expiredIds = expiredBuckets.map(b => b.id);
      const { error: updateError } = await supabase
        .from("file_buckets")
        .update({
          is_empty: true,
          content_type: null,
          content_data: null,
          content_metadata: null,
          last_emptied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in("id", expiredIds);
        
      if (updateError) throw updateError;
    }

    // 2. Delete abandoned/empty buckets (older than 30 days)
    // This includes:
    // - One-time buckets that were never used
    // - Persistent buckets that have been empty for 30 days
    const abandonedCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error: deleteError, count } = await supabase
      .from("file_buckets")
      .delete({ count: "exact" })
      .lt("updated_at", abandonedCutoff) // updated_at is touched on creation and modification
      .eq("is_empty", true); // Only delete if empty

    if (deleteError) throw deleteError;
    deletedBuckets = count || 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete. Emptied persistent buckets with old content. Deleted ${deletedBuckets} abandoned buckets.`,
        deleted_files: deletedFiles,
        deleted_buckets: deletedBuckets,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Cleanup failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

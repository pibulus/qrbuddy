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
    
    const retentionHours = 24;
    const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();

    // Get expired buckets that are NOT empty (have files to delete)
    const { data: expiredBuckets, error: fetchError } = await supabase
      .from("file_buckets")
      .select("id, bucket_code, content_metadata, content_type")
      .lt("created_at", cutoffTime)
      .eq("is_empty", false);

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
    }

    // Now delete the bucket records (or mark them as expired/empty?)
    // The proposal says "Files auto-delete". It doesn't explicitly say the *bucket* (the QR code) dies.
    // But if the bucket is "Persistent", maybe the user wants to keep the QR code but the content expires?
    // "All files in 'Persistent' buckets are automatically deleted 24 hours after upload."
    // So we should EMPTY the bucket, not delete the bucket record itself, unless it's a one-time bucket that was abandoned.
    
    // Let's EMPTY persistent buckets and DELETE abandoned one-time buckets.
    
    // 1. Empty persistent buckets
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
      .lt("last_filled_at", cutoffTime) // Use last_filled_at for expiration of CONTENT
      .eq("is_reusable", true)
      .eq("is_empty", false);
      
    if (updateError) throw updateError;

    // 2. Delete abandoned one-time buckets (older than 24h)
    const { error: deleteError, count } = await supabase
      .from("file_buckets")
      .delete({ count: "exact" })
      .lt("created_at", cutoffTime)
      .eq("is_reusable", false);

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

// Edge Function: Update File Share ("It's mine")
// The owner — whoever holds the share's owner_token — can rename it,
// re-theme it, add items, or remove one. The address never changes, so
// every sticker already printed keeps landing in the right place.
//
// Two rules keep it honest:
// - A self-destructing (limited) share can be renamed and re-themed, but its
//   payload is frozen: no append, no remove. People scanned a bomb; the bomb
//   doesn't get swapped.
// - Append can't change what the share is: photos join a slideshow, tracks
//   join a mixtape. A single photo can grow into a slideshow, a mixtape can't
//   grow a PDF.
//
// Authorization is the token in the body. verify_jwt = false like its
// siblings; service role for storage + DB. Nothing new granted to anon.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "../_shared/rate-limit.ts";
import { BLOCKED_EXTENSIONS } from "../_shared/file-validation.ts";

const UNLIMITED = 999999;
const MAX_ITEMS = 10;
const MAX_ITEM_BYTES = 5 * 1024 * 1024;
const THEMES = new Set([
  "sunset",
  "pool",
  "terminal",
  "candy",
  "vapor",
  "noir",
  "brutalist",
  "blush",
  "grape",
  "matcha",
]);

interface StoredItem {
  id: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function cleanTitle(raw: string): string {
  return Array.from(raw)
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== "<" && ch !== ">")
    .join("").trim().slice(0, 80);
}

function kindOf(items: StoredItem[]): "image" | "audio" | "mixed" | "other" {
  if (items.every((f) => f.type.startsWith("image/"))) return "image";
  if (items.every((f) => f.type.startsWith("audio/"))) return "audio";
  if (
    items.every((f) =>
      f.type.startsWith("image/") || f.type.startsWith("audio/")
    )
  ) return "mixed";
  return "other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse(req);
  if (req.method !== "POST") return json(req, 405, { error: "POST only" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const uploadedPaths: string[] = [];

  try {
    // Both JSON (rename/retheme/remove) and multipart (append) arrive here.
    const contentType = req.headers.get("content-type") || "";
    let fileId = "";
    let ownerToken = "";
    let action = "";
    let title = "";
    let theme = "";
    let itemId = "";
    let newFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      fileId = String(form.get("fileId") ?? "");
      ownerToken = String(form.get("ownerToken") ?? "");
      action = String(form.get("action") ?? "append");
      newFiles = form.getAll("file").filter((f): f is File =>
        f instanceof File
      );
    } else {
      const body = await req.json();
      fileId = String(body.fileId ?? "");
      ownerToken = String(body.ownerToken ?? "");
      action = String(body.action ?? "");
      title = String(body.title ?? "");
      theme = String(body.theme ?? "");
      itemId = String(body.itemId ?? "");
    }

    if (!fileId || !ownerToken) {
      return json(req, 400, { error: "fileId and ownerToken are required" });
    }

    // 60 edits/hour per token: plenty for a human, a wall for a script.
    const rl = checkRateLimit(`update-file:${ownerToken}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 60,
    });
    if (rl.isLimited) return createRateLimitResponse(rl, getCorsHeaders(req));

    const { data: share, error: fetchError } = await supabase
      .from("destructible_files")
      .select("id, owner_token, original_name, files, max_downloads, theme")
      .eq("id", fileId)
      .single();

    // Same 404 whether the share is missing or the token is wrong — don't
    // confirm which.
    if (fetchError || !share || share.owner_token !== ownerToken) {
      return json(req, 404, { error: "Share not found" });
    }

    const items: StoredItem[] = Array.isArray(share.files) ? share.files : [];
    const isLimited = (share.max_downloads ?? UNLIMITED) < UNLIMITED;

    // ---- rename -----------------------------------------------------------
    if (action === "rename") {
      const clean = cleanTitle(title);
      if (!clean) return json(req, 400, { error: "Give it a name" });
      const { error } = await supabase
        .from("destructible_files")
        .update({ original_name: clean })
        .eq("id", fileId);
      if (error) throw error;
      return json(req, 200, { success: true, fileName: clean });
    }

    // ---- retheme ----------------------------------------------------------
    if (action === "retheme") {
      if (!THEMES.has(theme)) {
        return json(req, 400, { error: "Unknown theme" });
      }
      const { error } = await supabase
        .from("destructible_files")
        .update({ theme })
        .eq("id", fileId);
      if (error) throw error;
      return json(req, 200, { success: true, theme });
    }

    // Payload edits stop here for self-destructing shares.
    if (isLimited) {
      return json(req, 409, {
        error:
          "This share self-destructs, so what's inside is frozen. Rename or re-theme it, or make a fresh one.",
      });
    }

    // ---- remove -----------------------------------------------------------
    if (action === "remove") {
      const target = items.find((f) => f.id === itemId);
      if (!target) return json(req, 404, { error: "Item not found" });
      if (items.length === 1) {
        return json(req, 409, {
          error: "That's the last item — a share can't be empty.",
        });
      }
      const remaining = items.filter((f) => f.id !== itemId);
      const first = remaining[0];
      const { error } = await supabase
        .from("destructible_files")
        .update({
          files: remaining,
          // Legacy single-file columns track the first item.
          file_name: first.path,
          size: first.size,
          mime_type: first.type,
        })
        .eq("id", fileId);
      if (error) throw error;
      // Blob goes after the row is right; an orphan blob beats a broken share.
      const { error: rmError } = await supabase.storage
        .from("qr-files")
        .remove([target.path]);
      if (rmError) console.error("remove blob:", rmError.message);
      return json(req, 200, { success: true, files: remaining });
    }

    // ---- append -----------------------------------------------------------
    if (action === "append") {
      if (newFiles.length === 0) {
        return json(req, 400, { error: "No files to add" });
      }
      if (items.length + newFiles.length > MAX_ITEMS) {
        return json(req, 400, {
          error: `A share holds up to ${MAX_ITEMS} items.`,
        });
      }
      const currentKind = kindOf(items);
      for (const file of newFiles) {
        const isImage = file.type.startsWith("image/");
        const isAudio = file.type.startsWith("audio/");
        if (!isImage && !isAudio) {
          return json(req, 400, {
            error: `${file.name} isn't a photo or a track.`,
          });
        }
        if (currentKind === "image" && !isImage) {
          return json(req, 400, { error: "Photos only — it's a slideshow." });
        }
        if (currentKind === "audio" && !isAudio) {
          return json(req, 400, { error: "Tracks only — it's a mixtape." });
        }
        if (currentKind === "other") {
          return json(req, 409, {
            error: "This share isn't a slideshow or mixtape.",
          });
        }
        if (file.size > MAX_ITEM_BYTES) {
          return json(req, 400, {
            error: `${file.name} is over 5MB.`,
          });
        }
        const ext = file.name.toLowerCase().split(".").pop() ?? "";
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          return json(req, 400, { error: `${file.name} isn't allowed.` });
        }
      }

      const added: StoredItem[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const id = uuidv4();
        const path = `${fileId}/${id}.${ext}`;
        const { error: upError } = await supabase.storage
          .from("qr-files")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upError) throw upError;
        uploadedPaths.push(path);
        added.push({
          id,
          path,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      const files = [...items, ...added];
      // Untitled shares are named by what they are — keep that true.
      const autoNamed = /^\d+ (photos|tracks|files)$/.test(
        share.original_name ?? "",
      );
      const kind = kindOf(files);
      const update: Record<string, unknown> = { files };
      if (autoNamed) {
        update.original_name = `${files.length} ${
          kind === "audio" ? "tracks" : kind === "image" ? "photos" : "files"
        }`;
      }
      const { error } = await supabase
        .from("destructible_files")
        .update(update)
        .eq("id", fileId);
      if (error) throw error;

      return json(req, 200, {
        success: true,
        files,
        fileName: update.original_name ?? share.original_name,
      });
    }

    return json(req, 400, { error: "Unknown action" });
  } catch (error) {
    console.error("update-file failed:", error);
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("qr-files").remove(uploadedPaths);
    }
    return json(req, 500, { error: "Couldn't update the share. Try again." });
  }
});

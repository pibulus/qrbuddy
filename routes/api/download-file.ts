import { Handlers } from "$fresh/server.ts";
import { getAuthHeaders, getSupabaseUrl } from "../../utils/api.ts";

// API route to download file and redirect to boom page
export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");
    const pathParam = url.searchParams.get("path");

    if (!fileId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }

    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Download from edge function
    const downloadUrl = new URL(
      `${supabaseUrl}/functions/v1/get-file`,
    );
    downloadUrl.searchParams.set("id", fileId);
    if (pathParam) {
      downloadUrl.searchParams.set("path", pathParam);
    }
    const authHeaders = getAuthHeaders();

    // Check if browser is requesting a byte range (for video/audio scrubbing)
    const rangeHeader = req.headers.get("Range");

    try {
      const edgeFunctionHeaders = {
        ...authHeaders,
        ...(rangeHeader && { "Range": rangeHeader }),
      };

      const response = await fetch(downloadUrl.toString(), {
        headers: edgeFunctionHeaders,
        redirect: "manual", // Important: Handle redirects manually
      });

      // If the edge function redirects (e.g. to /boom), we should follow or handle it
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get("Location");
        return new Response(null, {
          status: 302,
          headers: { Location: location || "/boom" },
        });
      }

      if (!response.ok) {
        // File doesn't exist or already exploded
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      // Stream the file
      const contentType = response.headers.get("Content-Type") ||
        "application/octet-stream";
      const contentDisposition = response.headers.get("Content-Disposition") ||
        "attachment";
      const downloadsRemaining = response.headers.get("X-Downloads-Remaining");

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", contentDisposition);

      // Add Content-Length header for proper media playback and download progress
      const contentLength = response.headers.get("Content-Length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      // Handle range requests for video/audio scrubbing (206 Partial Content)
      if (response.status === 206) {
        const acceptRanges = response.headers.get("Accept-Ranges");
        const contentRange = response.headers.get("Content-Range");

        if (acceptRanges) {
          headers.set("Accept-Ranges", acceptRanges);
        }
        if (contentRange) {
          headers.set("Content-Range", contentRange);
        }

        return new Response(response.body, {
          status: 206,
          headers,
        });
      }

      // Add script to redirect to boom after download starts
      // Only explode if explicitly 0. If null/undefined, assume unlimited/safe.
      const willExplode = downloadsRemaining === "0";

      if (willExplode) {
        // Redirect to boom page after download
        headers.set("Refresh", "1; url=/boom");
      }

      return new Response(response.body, { headers });
    } catch (error) {
      console.error("Download error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }
  },
};

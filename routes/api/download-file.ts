import { Handlers } from "$fresh/server.ts";
import { getAuthHeaders, getSupabaseUrl } from "../../utils/api.ts";

// API route to download file and redirect to boom page
export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

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
    const downloadUrl = `${supabaseUrl}/functions/v1/get-file?id=${fileId}`;
    const authHeaders = getAuthHeaders();

    try {
      const response = await fetch(downloadUrl, {
        headers: authHeaders,
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
      const downloadsRemaining =
        response.headers.get("X-Downloads-Remaining");

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", contentDisposition);

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

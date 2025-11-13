import { Handlers } from "$fresh/server.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Download from edge function
    const downloadUrl = `${supabaseUrl}/functions/v1/get-file?id=${fileId}`;

    try {
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        // File doesn't exist or already exploded
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      // Get file data
      const fileData = await response.blob();
      const contentType = response.headers.get("Content-Type") ||
        "application/octet-stream";
      const contentDisposition = response.headers.get("Content-Disposition") ||
        "attachment";
      const downloadsRemaining =
        response.headers.get("X-Downloads-Remaining") ||
        "0";

      // Serve the file
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", contentDisposition);

      // Add script to redirect to boom after download starts
      const willExplode = parseInt(downloadsRemaining) === 0;

      if (willExplode) {
        // Redirect to boom page after download
        headers.set("Refresh", "1; url=/boom");
      }

      return new Response(fileData, { headers });
    } catch (error) {
      console.error("Download error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }
  },
};

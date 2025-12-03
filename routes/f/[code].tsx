import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAuthHeaders, getSupabaseUrl } from "../../utils/api.ts";

interface FileData {
  fileId: string;
  fileName: string;
  fileSize: number;
  maxDownloads: number;
  downloadCount: number;
  remainingDownloads: number;
  isExpired: boolean;
  mimeType?: string;
  files?: Array<{
    id: string;
    path: string;
    name: string;
    size: number;
    type: string;
  }>;
}

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { code } = ctx.params;

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }

    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      console.error("Supabase not configured");
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Fetch file metadata without downloading yet
    try {
      const metadataUrl =
        `${supabaseUrl}/functions/v1/get-file-metadata?id=${code}`;
      const authHeaders = getAuthHeaders();

      const response = await fetch(metadataUrl, {
        headers: authHeaders,
      });

      if (!response.ok) {
        // File doesn't exist or already exploded
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      const fileData: FileData = await response.json();

      // If already expired/exploded, redirect to boom
      if (fileData.isExpired || fileData.remainingDownloads <= 0) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      return ctx.render(fileData);
    } catch (error) {
      console.error("File metadata error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }
  },
};

import FileSlideshow from "../../islands/FileSlideshow.tsx";

export default function FilePage({ data }: PageProps<FileData>) {
  return (
    <>
      <Head>
        <title>{data.fileName} | QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <FileSlideshow {...data} />

      <style>
        {`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }

          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
          }

          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .animate-fade-in { animation: fade-in 0.6s ease-out; }
          .animate-scale-in { animation: scale-in 0.4s ease-out; }
          .animate-pulse-glow { animation: pulse-glow 2s infinite; }
          .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
        `}
      </style>
    </>
  );
}

import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import {
  fetchWithTimeout,
  getAuthHeaders,
  getSupabaseUrl,
} from "../../utils/api.ts";

interface FileData {
  fileId: string;
  fileName: string;
  fileSize: number;
  maxDownloads: number;
  downloadCount: number;
  remainingDownloads: number;
  isExpired: boolean;
  mimeType?: string;
  theme?: string;
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
      // `code` is a raw URL path segment (Fresh decodes it before ctx.params
      // sees it) — an attacker can put `&`, `#`, or `=` in it. Unencoded, that
      // pollutes or truncates this query string. r.tsx already does this for
      // its own `code` param; this route didn't.
      const metadataUrl = `${supabaseUrl}/functions/v1/get-file-metadata?id=${
        encodeURIComponent(code)
      }`;
      const authHeaders = getAuthHeaders();

      const response = await fetchWithTimeout(metadataUrl, {
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
import ErrorBoundary from "../../islands/ErrorBoundary.tsx";

export default function FilePage({ data }: PageProps<FileData>) {
  const isAllAudio = Boolean(
    data.files && data.files.length > 1 &&
      data.files.every((f) => f.type.startsWith("audio/")),
  );
  const isAllImages = Boolean(
    data.files && data.files.length > 1 &&
      data.files.every((f) => f.type.startsWith("image/")),
  );
  const titleEmoji = isAllAudio
    ? "🎵 "
    : isAllImages
    ? "🖼️ "
    : data.mimeType?.startsWith("audio/")
    ? "🎵 "
    : data.mimeType?.startsWith("image/")
    ? "🖼️ "
    : "";

  const pageTitle = `${titleEmoji}${data.fileName} | QRBuddy`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={isAllAudio
            ? `Listen to ${data.fileName} on QRBuddy.`
            : isAllImages
            ? `View ${data.fileName} on QRBuddy.`
            : `Download ${data.fileName} from QRBuddy.`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content={data.remainingDownloads >= 999999
            ? (isAllAudio
              ? "A shared QRBuddy mixtape playlist is ready to play."
              : isAllImages
              ? "A shared QRBuddy photo slideshow is ready to view."
              : "A shared QRBuddy file is ready to download.")
            : `A limited QRBuddy share is ready. ${data.remainingDownloads} use${
              data.remainingDownloads === 1 ? "" : "s"
            } left.`}
        />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {
        /* The file-download path had no crash containment while the homepage
          QR preview had three. A throw here strands someone mid-scan on a
          link that may be one-shot. */
      }
      <ErrorBoundary>
        <FileSlideshow {...data} />
      </ErrorBoundary>

      <style>
        {`
          /* animate-scale-in has no Tailwind counterpart (tailwind.config.ts
             defines fade-in/pulse-glow only) — kept here, feeds
             FileSlideshow.tsx's image transition. */
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-scale-in { animation: scale-in 0.4s ease-out; }

          /* animate-pulse-glow: deliberate override, not drift. Tailwind's
             global pulse-glow glows PINK (rgba(255,105,180,...)) but both
             consumers of this class (BucketQR.tsx's CTA and the
             self-destruct download button below) are red/orange gradients —
             a pink glow clashes with both. Red keeps the "explosive" file
             theme intact. If tailwind.config.ts's pulse-glow color is ever
             corrected to red/orange, delete this block. */
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
          }
          .animate-pulse-glow { animation: pulse-glow 2s infinite; }
        `}
      </style>
    </>
  );
}

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

export default function FilePage({ data }: PageProps<FileData>) {
  const {
    fileId,
    fileName,
    fileSize,
    remainingDownloads,
    maxDownloads,
    mimeType,
  } = data;

  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  const isUnlimited = maxDownloads >= 999999;
  const isOneTime = maxDownloads === 1;
  const downloadUrl = `/api/download-file?id=${fileId}`;

  // Helper to determine media type
  const isImage = mimeType?.startsWith("image/");
  const isAudio = mimeType?.startsWith("audio/");
  const isVideo = mimeType?.startsWith("video/");
  const showPreview = isUnlimited && (isImage || isAudio || isVideo);

  return (
    <>
      <Head>
        <title>Self-Destructing File | QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div class="w-full max-w-md">
          {/* Main card */}
          <div class="bg-white border-4 border-black rounded-2xl p-8 shadow-chunky text-center space-y-6 animate-slide-in">
            {/* Icon with animation */}
            <div class="text-7xl animate-pulse-slow">
              {isUnlimited ? "📦" : "💣"}
            </div>

            {/* Title */}
            <div>
              <h1 class="text-3xl font-black text-black mb-2">
                {isUnlimited ? "Shared File" : "Self-Destructing File"}
              </h1>
              <p class="text-sm text-gray-600">
                {isUnlimited
                  ? "Ready to download anytime"
                  : "This message will self-destruct..."}
              </p>
            </div>

            {/* Media Preview (Only for unlimited files) */}
            {showPreview && (
              <div class="rounded-xl overflow-hidden border-4 border-black bg-gray-100 mb-4">
                {isImage && (
                  <img
                    src={downloadUrl}
                    alt={fileName}
                    class="w-full h-auto object-contain max-h-64"
                  />
                )}
                {isAudio && (
                  <div class="p-4">
                    <audio controls class="w-full">
                      <source src={downloadUrl} type={mimeType} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {isVideo && (
                  <video controls class="w-full max-h-64 bg-black">
                    <source src={downloadUrl} type={mimeType} />
                    Your browser does not support the video element.
                  </video>
                )}
              </div>
            )}

            {/* File info */}
            <div class="py-6 px-6 bg-gradient-to-r from-red-50 to-orange-50 border-3 border-red-200 rounded-xl space-y-3">
              <div class="flex items-center justify-center gap-2">
                <span class="text-2xl">📄</span>
                <p class="font-bold text-lg text-gray-800 break-all">
                  {fileName}
                </p>
              </div>

              <div class="flex justify-center gap-4 text-sm text-gray-600">
                <div>
                  <span class="font-bold">Size:</span> {fileSizeMB} MB
                </div>
                <div>
                  <span class="font-bold">Uses left:</span>{" "}
                  {remainingDownloads === 999999
                    ? "∞"
                    : `${remainingDownloads}/${maxDownloads}`}
                </div>
              </div>
            </div>

            {/* Warning/Info message */}
            {!isUnlimited && (
              <div class="py-4 px-4 bg-yellow-100 border-3 border-yellow-400 rounded-xl">
                <p class="text-sm font-bold text-yellow-900 flex items-center justify-center gap-2">
                  <span>⚠️</span>
                  {isOneTime
                    ? "This file will self-destruct after download!"
                    : `This file will self-destruct after ${maxDownloads} downloads!`}
                </p>
              </div>
            )}

            {isUnlimited && (
              <div class="py-4 px-4 bg-blue-100 border-3 border-blue-400 rounded-xl">
                <p class="text-sm font-bold text-blue-900 flex items-center justify-center gap-2">
                  <span>♾️</span>
                  This file can be downloaded unlimited times!
                </p>
              </div>
            )}

            {/* Download button */}
            <a
              href={downloadUrl}
              download={fileName}
              class={`inline-block w-full px-6 py-4 ${
                isUnlimited
                  ? "bg-gradient-to-r from-blue-500 to-purple-500"
                  : "bg-gradient-to-r from-red-500 to-orange-500"
              } text-white border-4 border-black rounded-xl font-black text-lg shadow-chunky transition-all hover:scale-105 active:scale-95 ${
                isUnlimited ? "" : "animate-pulse-glow"
              }`}
            >
              {isUnlimited ? "📥 Download File →" : "💥 Download & Destroy →"}
            </a>

            {/* Countdown */}
            <div class="pt-4">
              <p class="text-xs text-gray-500">
                Good luck, Agent 86.
              </p>
            </div>

            {/* QRBuddy credit */}
            <div class="pt-4 border-t-2 border-gray-200">
              <p class="text-xs text-gray-400 mb-2">
                Powered by QRBuddy
              </p>
              <a
                href="/?utm_source=file_download&utm_medium=destructible"
                class="inline-block px-3 py-1 text-xs bg-white text-black border-2 border-black rounded-lg font-bold transition-all hover:scale-105"
              >
                Create Your Own →
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse-slow {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
            }
            50% {
              box-shadow: 0 0 40px rgba(239, 68, 68, 0.6);
            }
          }

          .animate-slide-in {
            animation: slide-in 0.4s ease-out;
          }

          .animate-pulse-slow {
            animation: pulse-slow 2s ease-in-out infinite;
          }

          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}
      </style>
    </>
  );
}

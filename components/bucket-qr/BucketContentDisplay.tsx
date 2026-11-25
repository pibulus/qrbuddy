import { TEXT_CARD_THEMES } from "../../utils/bucket-qr-themes.ts";
import type { BucketContentMetadata } from "../../types/bucket-types.ts";

interface BucketContentDisplayProps {
  contentType: string | null;
  contentMetadata: BucketContentMetadata | null;
  style: string;
  isPasswordProtected: boolean;
  hasUnlockInput: boolean;
  previewUrl: string | null;
  previewMime: string;
  bucketFileGlyph: string;
  bucketFileKind: string;
  bucketFileSizeLabel: string | null;
}

/** What's currently sitting in a non-empty locker: text card, title/desc
 * metadata, and file/media preview. Rendered only when the bucket has
 * content — the isEmpty gate lives in the parent. */
export default function BucketContentDisplay({
  contentType,
  contentMetadata,
  style,
  isPasswordProtected,
  hasUnlockInput,
  previewUrl,
  previewMime,
  bucketFileGlyph,
  bucketFileKind,
  bucketFileSizeLabel,
}: BucketContentDisplayProps) {
  return (
    <>
      {/* Metadata Display (Title, Desc, Creator) */}
      {contentMetadata &&
        (contentMetadata.title || contentMetadata.description ||
          contentMetadata.creator) &&
        (
          <div class="text-center space-y-2 animate-slide-down">
            {typeof contentMetadata.title === "string" &&
              contentMetadata.title && (
              <h1 class="text-3xl font-black text-[#1e1714] leading-tight">
                {contentMetadata.title}
              </h1>
            )}
            {typeof contentMetadata.creator === "string" &&
              contentMetadata.creator && (
              <p class="text-sm font-bold text-[#6e6058] uppercase tracking-wide">
                By {contentMetadata.creator}
              </p>
            )}
            {typeof contentMetadata.description === "string" &&
              contentMetadata.description && (
              <p class="text-lg text-[#4a3f39] max-w-md mx-auto leading-relaxed">
                {contentMetadata.description}
              </p>
            )}
          </div>
        )}

      {/* Media Preview */}
      <div class="space-y-4">
        {/* Text Preview */}
        {contentType === "text" && contentMetadata?.content && (
          <div
            class={`border-4 border-black rounded-xl p-6 shadow-chunky relative overflow-hidden ${
              TEXT_CARD_THEMES[style]?.card ?? "bg-white"
            }`}
          >
            <div
              class={`absolute top-0 left-0 w-full h-2 ${
                TEXT_CARD_THEMES[style]?.bar ?? "bg-[#efe9dc]"
              }`}
            />
            <div
              class={`font-mono text-lg md:text-xl whitespace-pre-wrap break-words leading-relaxed ${
                TEXT_CARD_THEMES[style]?.text ?? "text-[#4a3f39]"
              }`}
            >
              {(!isPasswordProtected ||
                  (isPasswordProtected && hasUnlockInput))
                ? (
                  contentMetadata.content
                )
                : (
                  <div class="text-center py-8 opacity-50">
                    <span class="text-4xl block mb-2">🔒</span>
                    Hidden Message
                  </div>
                )}
            </div>
          </div>
        )}

        {/* File Preview (Image/Audio/Video) */}
        {contentType === "file" && (
          <div class="space-y-4">
            {/* If metadata is redacted (null), show generic locked state */}
            {!contentMetadata && !previewUrl && (
              <div class="bg-[#fbf1e4] border-4 border-black rounded-xl p-8 text-center shadow-chunky">
                <span class="text-5xl block mb-4">🔒</span>
                <h3 class="text-xl font-bold text-[#4a3f39] mb-2">
                  Secure File
                </h3>
                <p class="text-[#574c44]">
                  Enter password to view details and download
                </p>
              </div>
            )}

            {/* Inline media preview (open lockers only — non-destructive) */}
            {previewUrl && (
              <div class="bg-white border-4 border-black rounded-xl p-3 shadow-chunky animate-scale-in">
                {previewMime.startsWith("image/") && (
                  <img
                    src={previewUrl}
                    alt={contentMetadata?.filename ?? "Shared image"}
                    class="w-full max-h-[70vh] object-contain rounded-lg"
                  />
                )}
                {previewMime.startsWith("video/") && (
                  <video
                    controls
                    src={previewUrl}
                    class="w-full max-h-[70vh] rounded-lg bg-black"
                  />
                )}
                {previewMime.startsWith("audio/") && (
                  <div class="p-4 text-center space-y-3">
                    <span class="text-5xl block">🎵</span>
                    <audio controls src={previewUrl} class="w-full" />
                  </div>
                )}
                {contentMetadata?.filename && (
                  <p class="text-xs text-[#6e6058] text-center mt-2 truncate">
                    {contentMetadata.filename}
                  </p>
                )}
              </div>
            )}

            {/* File Info Card - shows file details without destructive preview */}
            {contentMetadata && !previewUrl && (
              <div class="bg-white border-4 border-black rounded-xl p-6 shadow-chunky text-center">
                <span class="text-5xl block mb-3">{bucketFileGlyph}</span>
                <p class="text-xs font-black uppercase tracking-wide text-[#8a7d74] mb-1">
                  {bucketFileKind}
                </p>
                <p class="font-bold text-lg truncate">
                  {contentMetadata.filename}
                </p>
                {bucketFileSizeLabel && (
                  <p class="text-sm text-[#6e6058] mt-1">
                    {bucketFileSizeLabel}
                  </p>
                )}
                <p class="text-xs text-[#8a7d74] mt-1">
                  {contentMetadata.mimetype}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "preact/hooks";
import QRCodeStyling from "qr-code-styling";

import { useBucketStatus } from "../hooks/useBucketStatus.ts";
import { useLockerUnlock } from "../hooks/useLockerUnlock.ts";
import { getAuthHeaders } from "../utils/api.ts";
import { apiRequestFormDataWithProgress } from "../utils/api-request.ts";
import {
  formatFileSize,
  MAX_FILE_SIZE,
  SUPPORTER_MAX_FILE_SIZE,
  validateFile,
} from "../utils/file-validation.ts";
import { haptics } from "../utils/haptics.ts";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { uploadViaR2 } from "../utils/r2-upload.ts";
import { getSupporterPass } from "../utils/supporter-pass.ts";
import { getOwnerToken, removeOwnerToken } from "../utils/token-vault.ts";
import type { BucketContentMetadata } from "../types/bucket-types.ts";
import BucketContentDisplay from "./bucket-qr/BucketContentDisplay.tsx";
import PasswordUnlock from "./bucket-qr/PasswordUnlock.tsx";
import { addToast } from "./ToastManager.tsx";

// Repeated chunky-CTA button idioms — used 3x, 3x, and 2x below.
const BTN_PRIMARY_UPLOAD =
  "w-full py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50";
const BTN_PRIMARY_DOWNLOAD =
  "w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50";
const BTN_SECONDARY =
  "w-full min-h-[52px] py-3 bg-white text-gray-900 font-black rounded-xl border-3 border-black shadow-chunky hover:-translate-y-0.5 transition disabled:opacity-50";

interface BucketQRProps {
  bucketUrl: string;
  bucketCode: string;
  style: string;
  isEmpty: boolean;
  contentType: string | null;
  contentMetadata: BucketContentMetadata | null;
  isPasswordProtected: boolean;
  isReusable: boolean;
  deleteOnDownload: boolean;
  apiUrl: string;
}

export default function BucketQR({
  bucketUrl,
  bucketCode,
  style,
  isEmpty: initialIsEmpty,
  contentType: initialContentType,
  contentMetadata: initialContentMetadata,
  isPasswordProtected,
  isReusable,
  deleteOnDownload,
  apiUrl,
}: BucketQRProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isEmpty,
    setIsEmpty,
    contentType,
    setContentType,
    contentMetadata,
    setContentMetadata,
    refreshBucketStatus,
  } = useBucketStatus(bucketCode, apiUrl, {
    isEmpty: initialIsEmpty,
    contentType: initialContentType,
    contentMetadata: initialContentMetadata,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Revoke the preview object URL when it's replaced or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Shared PIN/password unlock state — used by upload, download, and preview.
  const {
    showPasswordInput,
    setShowPasswordInput,
    useManualPassword,
    manualPassword,
    setManualPassword,
    pinDigits,
    handleKeypadPress,
    pinValue,
    unlockPassword,
    hasUnlockInput,
    toggleManualPassword,
    resetUnlock,
  } = useLockerUnlock();

  const uploadStatusText = uploadProgress >= 99
    ? "Processing..."
    : "Uploading...";
  const bucketFileKind = contentMetadata?.mimetype?.startsWith("image/")
    ? "Image"
    : contentMetadata?.mimetype?.startsWith("audio/")
    ? "Audio"
    : contentMetadata?.mimetype?.startsWith("video/")
    ? "Video"
    : contentMetadata?.mimetype?.includes("pdf")
    ? "PDF"
    : "File";
  const bucketFileGlyph = contentMetadata?.mimetype?.startsWith("image/")
    ? "🖼️"
    : contentMetadata?.mimetype?.startsWith("audio/")
    ? "🎵"
    : contentMetadata?.mimetype?.startsWith("video/")
    ? "🎬"
    : contentMetadata?.mimetype?.includes("pdf")
    ? "📕"
    : contentMetadata?.mimetype?.includes("zip") ||
        contentMetadata?.mimetype?.includes("archive")
    ? "📦"
    : "📄";
  const bucketFileSizeLabel = typeof contentMetadata?.size === "number"
    ? formatFileSize(contentMetadata.size)
    : null;
  const isMediaFile = Boolean(
    contentMetadata?.mimetype?.startsWith("image/") ||
      contentMetadata?.mimetype?.startsWith("audio/") ||
      contentMetadata?.mimetype?.startsWith("video/"),
  );
  // Preview is only offered when downloading is non-destructive: open
  // (keep-file) lockers. Ping-pong and one-shot lockers would consume the
  // content just to show it. PIN-locked buckets redact metadata, so the
  // media check happens against the response Content-Type instead.
  const canPreview = contentType === "file" && isReusable &&
    !deleteOnDownload && !isEmpty &&
    (isMediaFile || (isPasswordProtected && !contentMetadata));

  // Get QR style based on empty/full state
  const getQRStyle = () => {
    if (isEmpty) {
      // Empty: Use user's chosen style (soft, inviting)
      return QR_STYLES[style as keyof typeof QR_STYLES] || QR_STYLES.sunset;
    } else {
      // Full: Orange to red gradient (urgent, action needed)
      return {
        dots: {
          type: "gradient",
          gradient: {
            type: "linear" as const,
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: "#FF6B35" },
              { offset: 0.5, color: "#FF4500" },
              { offset: 1, color: "#DC143C" },
            ],
          },
        },
        background: { color: "#FFF5F0" },
        cornersSquare: {
          gradient: {
            type: "linear" as const,
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: "#FF6B35" },
              { offset: 1, color: "#DC143C" },
            ],
          },
        },
        cornersDot: {
          gradient: {
            type: "linear" as const,
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: "#FF6B35" },
              { offset: 1, color: "#DC143C" },
            ],
          },
        },
      };
    }
  };

  // Initialize QR code
  useEffect(() => {
    if (!canvasRef.current) return;

    const currentStyle = getQRStyle();

    const qrCode = new QRCodeStyling({
      width: 500,
      height: 500,
      data: bucketUrl,
      margin: 20,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: "Q",
      },
      dotsOptions: {
        type: "rounded",
        color: "color" in currentStyle.dots
          ? currentStyle.dots.color
          : undefined,
        gradient: "gradient" in currentStyle.dots
          ? currentStyle.dots.gradient
          : undefined,
      },
      backgroundOptions: {
        color: "color" in currentStyle.background
          ? currentStyle.background.color
          : undefined,
        gradient: "gradient" in currentStyle.background
          ? currentStyle.background.gradient
          : undefined,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color:
          currentStyle.cornersSquare && "color" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.color
            : undefined,
        gradient:
          currentStyle.cornersSquare && "gradient" in currentStyle.cornersSquare
            ? currentStyle.cornersSquare.gradient
            : undefined,
      },
      cornersDotOptions: {
        type: "dot",
        color: currentStyle.cornersDot && "color" in currentStyle.cornersDot
          ? currentStyle.cornersDot.color
          : undefined,
        gradient:
          currentStyle.cornersDot && "gradient" in currentStyle.cornersDot
            ? currentStyle.cornersDot.gradient
            : undefined,
      },
    });

    canvasRef.current.innerHTML = "";
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
  }, [isEmpty, bucketUrl, style]);

  // Hide owner_token from URL if present
  useEffect(() => {
    if (typeof globalThis.window !== "undefined") {
      const url = new URL(globalThis.window.location.href);
      if (url.searchParams.has("owner_token")) {
        url.searchParams.delete("owner_token");
        globalThis.window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Handle file upload
  const handleUpload = async (file?: File, text?: string, link?: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError("");
      haptics.medium();

      // The creator has an owner token in local storage. Scanned locker guests
      // can still upload to an empty locker without that token.
      const ownerToken = await getOwnerToken("bucket", bucketCode);
      const uploadUrl = new URL(`${apiUrl}/upload-to-bucket`);
      uploadUrl.searchParams.set("bucket_code", bucketCode);
      if (ownerToken) {
        uploadUrl.searchParams.set("owner_token", ownerToken);
      }

      if (isPasswordProtected && !ownerToken && !hasUnlockInput) {
        setShowPasswordInput(true);
        throw new Error("Enter the locker PIN before uploading.");
      }

      const authHeaders = getAuthHeaders();
      let response: Response | undefined;

      if (file) {
        // Supporter pass lifts the size ceiling (R2-backed big files).
        const pass = getSupporterPass();
        const validation = validateFile(
          file,
          pass ? SUPPORTER_MAX_FILE_SIZE : MAX_FILE_SIZE,
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        if (pass && file.size > MAX_FILE_SIZE) {
          // Presigned browser→R2 upload with real progress.
          await uploadViaR2(
            {
              kind: "bucket",
              bucket_code: bucketCode,
              owner_token: ownerToken ?? undefined,
              password: isPasswordProtected && !ownerToken
                ? unlockPassword
                : undefined,
            },
            file,
            setUploadProgress,
          );
        } else {
          // Upload file
          const formData = new FormData();
          formData.append("file", file);
          if (isPasswordProtected && !ownerToken) {
            formData.append("password", unlockPassword);
          }
          await apiRequestFormDataWithProgress(
            uploadUrl.toString(),
            formData,
            setUploadProgress,
            "Upload failed",
          );
        }
      } else if (text || link) {
        // Upload text or link
        response = await fetch(uploadUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            type: text ? "text" : "link",
            content: text || link,
            ...(isPasswordProtected && !ownerToken
              ? { password: unlockPassword }
              : {}),
          }),
        });
      } else {
        throw new Error("No content selected for upload.");
      }

      if (response && !response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Upload failed");
      }

      // Success! Update state
      setIsEmpty(false);
      setContentType(file ? "file" : text ? "text" : "link");
      if (file) {
        setContentMetadata({
          filename: file.name,
          size: file.size,
          mimetype: file.type,
        });
      }

      await refreshBucketStatus({ preserveLocalMetadata: true });

      haptics.success();
      setIsUploading(false);
      setUploadProgress(0);
      resetUnlock();
    } catch (err) {
      console.error("Upload error:", err);
      await refreshBucketStatus();
      setError(err instanceof Error ? err.message : String(err));
      setIsUploading(false);
      setUploadProgress(0);
      haptics.error();
    }
  };

  // Handle file input
  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleUpload(input.files[0]).finally(() => {
        input.value = "";
      });
    }
  };

  // Handle download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError("");
      haptics.medium();

      if (isPasswordProtected) {
        if (useManualPassword) {
          if (!manualPassword.trim()) {
            setError("Enter the password to unlock this bucket.");
            setIsDownloading(false);
            haptics.error();
            return;
          }
        } else if (pinValue.length !== 4) {
          setError("Enter the 4-digit PIN.");
          setIsDownloading(false);
          haptics.error();
          return;
        }
      }

      const downloadUrl = `${apiUrl}/download-from-bucket`;

      const authHeaders = getAuthHeaders();

      // Use POST with password in body for security (not in URL)
      const response = await fetch(downloadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          bucket_code: bucketCode,
          password: isPasswordProtected ? unlockPassword : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      if (contentType === "file") {
        const responseMime = response.headers.get("Content-Type") ?? "";
        if (responseMime.includes("application/json")) {
          // R2-backed big file: the function answers with a short-lived
          // presigned URL — the browser downloads straight from R2.
          const presignedDownload = await response.json();
          const a = document.createElement("a");
          a.href = presignedDownload.download_url;
          a.download = contentMetadata?.filename || "download";
          a.click();
        } else {
          // Download file
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = contentMetadata?.filename || "download";
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Show text/link content
        const downloadedContent = await response.json();
        // Copy content to clipboard instead of using alert
        try {
          await navigator.clipboard.writeText(downloadedContent.content);
          haptics.success();
          addToast("✅ Content copied to clipboard!");
        } catch {
          // Fallback: show a preview of the content if clipboard fails
          addToast(
            "Content: " + downloadedContent.content.substring(0, 50) +
              (downloadedContent.content.length > 50 ? "..." : ""),
            4000,
          );
        }
      }

      // Update state based on server response
      const isEmptied = response.headers.get("X-Bucket-Emptied") === "true";

      if (isEmptied) {
        setIsEmpty(true);
        setContentType(null);
        setContentMetadata(null);
        if (!isReusable) {
          removeOwnerToken("bucket", bucketCode);
        }
      }

      await refreshBucketStatus({ preserveLocalMetadata: !isEmptied });

      haptics.success();
      setIsDownloading(false);
      resetUnlock();
    } catch (err) {
      console.error("Download error:", err);
      await refreshBucketStatus();
      setError(err instanceof Error ? err.message : String(err));
      setIsDownloading(false);
      haptics.error();
    }
  };

  // Fetch the file once and show it inline. Only wired up for open
  // (keep-file) lockers, where a download doesn't consume anything.
  const handlePreview = async () => {
    if (isPreviewLoading || !canPreview) return;

    setError("");

    if (isPasswordProtected && !hasUnlockInput) {
      setError(
        useManualPassword
          ? "Enter the password to unlock this locker."
          : "Enter the 4-digit PIN.",
      );
      haptics.error();
      return;
    }

    try {
      setIsPreviewLoading(true);
      haptics.light();

      const response = await fetch(`${apiUrl}/download-from-bucket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          bucket_code: bucketCode,
          password: isPasswordProtected ? unlockPassword : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Preview failed");
      }

      let mime = response.headers.get("Content-Type") ?? "";
      let blob: Blob;
      if (mime.includes("application/json")) {
        // R2-backed big file: fetch the bytes from the presigned URL
        // (R2 CORS allows GET from our origins).
        const presignedPreview = await response.json();
        const fileResponse = await fetch(presignedPreview.download_url);
        if (!fileResponse.ok) {
          throw new Error("Preview failed");
        }
        mime = fileResponse.headers.get("Content-Type") ?? "";
        blob = await fileResponse.blob();
      } else {
        blob = await response.blob();
      }

      if (/^(image|video|audio)\//.test(mime)) {
        setPreviewMime(mime);
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        // Not previewable (e.g. PDF behind a PIN) — hand it over as a
        // download instead of failing.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = contentMetadata?.filename || "download";
        a.click();
        URL.revokeObjectURL(url);
      }
      haptics.success();
    } catch (err) {
      console.error("Preview error:", err);
      setError(err instanceof Error ? err.message : String(err));
      haptics.error();
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    haptics.light();
    try {
      await navigator.clipboard.writeText(bucketUrl);
      addToast("Bucket URL copied! 📋");
    } catch (err) {
      console.error("Failed to copy URL:", err);
      addToast("Failed to copy URL ❌", 3000);
    }
  };

  return (
    <div class="space-y-6">
      {/* Status Badge */}
      <div class="text-center">
        <span
          class={`inline-block px-6 py-3 rounded-full border-3 border-black text-lg font-black shadow-chunky ${
            isEmpty
              ? "bg-gradient-to-r from-green-400 to-blue-400 text-white"
              : "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse"
          }`}
        >
          {isEmpty ? "🪣 Ready for upload" : "💥 File ready"}
        </span>
        <p class="text-sm text-gray-600 mt-3 leading-relaxed">
          {isEmpty ? "Waiting for content." : "Current locker contents."}
        </p>
      </div>

      {!isEmpty && (
        <BucketContentDisplay
          contentType={contentType}
          contentMetadata={contentMetadata}
          style={style}
          isPasswordProtected={isPasswordProtected}
          hasUnlockInput={hasUnlockInput}
          previewUrl={previewUrl}
          previewMime={previewMime}
          bucketFileGlyph={bucketFileGlyph}
          bucketFileKind={bucketFileKind}
          bucketFileSizeLabel={bucketFileSizeLabel}
        />
      )}

      {/* Action Button */}
      {isEmpty
        ? (
          <div class="space-y-3">
            {isPasswordProtected && !showPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                class={BTN_PRIMARY_UPLOAD}
              >
                🔒 Unlock to Upload
              </button>
            )}

            {isPasswordProtected && showPasswordInput && (
              <div class="space-y-4">
                <PasswordUnlock
                  pinDigits={pinDigits}
                  onKeypadPress={handleKeypadPress}
                  useManualPassword={useManualPassword}
                  manualPassword={manualPassword}
                  onManualPasswordChange={setManualPassword}
                  onToggleMode={toggleManualPassword}
                  onCancel={resetUnlock}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !hasUnlockInput}
                  class={BTN_PRIMARY_UPLOAD}
                >
                  {isUploading ? "Uploading..." : "📤 Upload File"}
                </button>
              </div>
            )}

            {!isPasswordProtected && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                class={BTN_PRIMARY_UPLOAD}
              >
                {isUploading ? "Uploading..." : "📤 Upload File"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              class="hidden"
              onChange={handleFileInput}
            />

            {isUploading && (
              <div class="bg-white border-3 border-black rounded-xl p-3 shadow-chunky">
                <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p class="text-center text-xs font-bold text-purple-700 mt-2">
                  {uploadStatusText} {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        )
        : (
          <div class="space-y-3">
            {isPasswordProtected && !showPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                class={BTN_PRIMARY_DOWNLOAD}
              >
                🔒 Unlock to View & Download
              </button>
            )}

            {isPasswordProtected && showPasswordInput && (
              <div class="space-y-4">
                <PasswordUnlock
                  pinDigits={pinDigits}
                  onKeypadPress={handleKeypadPress}
                  useManualPassword={useManualPassword}
                  manualPassword={manualPassword}
                  onManualPasswordChange={setManualPassword}
                  onToggleMode={toggleManualPassword}
                  onCancel={resetUnlock}
                />

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading ||
                    (useManualPassword
                      ? !manualPassword.trim()
                      : pinValue.length !== 4)}
                  class={BTN_PRIMARY_DOWNLOAD}
                >
                  {isDownloading
                    ? "Downloading..."
                    : (!isReusable || deleteOnDownload)
                    ? "💥 Download & Empty"
                    : "⬇️ Download File"}
                </button>

                {canPreview && !previewUrl && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isPreviewLoading ||
                      (useManualPassword
                        ? !manualPassword.trim()
                        : pinValue.length !== 4)}
                    class={BTN_SECONDARY}
                  >
                    {isPreviewLoading
                      ? "Loading preview..."
                      : `👁️ Preview ${bucketFileKind}`}
                  </button>
                )}
              </div>
            )}

            {!isPasswordProtected && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  class={`${BTN_PRIMARY_DOWNLOAD} animate-pulse-glow`}
                >
                  {isDownloading
                    ? "Downloading..."
                    : (!isReusable || deleteOnDownload)
                    ? "💥 Download & Empty"
                    : "⬇️ Download File"}
                </button>

                {canPreview && !previewUrl && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    class={BTN_SECONDARY}
                  >
                    {isPreviewLoading
                      ? "Loading preview..."
                      : `👁️ Preview ${bucketFileKind}`}
                  </button>
                )}
              </>
            )}

            {contentMetadata && contentType === "file" && (
              <p class="text-center text-sm text-gray-600">
                📄 {contentMetadata.filename ?? "File"}
                {bucketFileSizeLabel ? ` ${bucketFileSizeLabel}` : ""}
              </p>
            )}

            {(!isReusable || deleteOnDownload) && (
              <p class="text-center text-xs text-orange-700 leading-relaxed">
                Starting this download empties the locker, even if the browser
                later cancels the handoff.
              </p>
            )}
          </div>
        )}

      <section class="bg-white border-3 border-black rounded-2xl p-4 shadow-chunky space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-black uppercase tracking-wide text-gray-500">
              Share this locker
            </h2>
            <p class="text-sm text-gray-600">
              Link and QR ready.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyUrl}
            class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-black bg-black text-white text-sm font-black shadow-chunky hover:-translate-y-0.5 transition"
          >
            Copy
          </button>
        </div>
        <div
          ref={canvasRef}
          class="bg-white rounded-2xl border-4 border-black shadow-chunky-hover cursor-pointer hover:scale-[1.02] transition-all duration-300 mx-auto w-full max-w-[220px] [&>canvas]:max-w-full [&>canvas]:h-auto"
          role="button"
          tabIndex={0}
          aria-label="Copy bucket URL to clipboard"
          onClick={handleCopyUrl}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCopyUrl();
            }
          }}
          title="Click to copy URL"
        />
      </section>

      {/* Error Message */}
      {error && (
        <div class="bg-red-50 border-3 border-red-400 rounded-xl p-4 text-center">
          <p class="text-red-700 font-semibold">❌ {error}</p>
        </div>
      )}
    </div>
  );
}

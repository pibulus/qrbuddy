import { useEffect, useRef, useState } from "preact/hooks";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { haptics } from "../utils/haptics.ts";
import { getOwnerToken, removeOwnerToken } from "../utils/token-vault.ts";
import { getAuthHeaders } from "../utils/api.ts";
import { useKeypad } from "../hooks/useKeypad.ts";

interface BucketContentMetadata {
  filename?: string;
  size?: number;
  mimetype?: string;
  storage_path?: string;
  content?: string;
  [key: string]: unknown;
}

interface BucketQRProps {
  bucketUrl: string;
  bucketCode: string;
  style: string;
  isEmpty: boolean;
  contentType: string | null;
  contentMetadata: BucketContentMetadata | null;
  isPasswordProtected: boolean;
  isReusable: boolean;
  supabaseUrl: string;
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
  supabaseUrl,
}: BucketQRProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEmpty, setIsEmpty] = useState(initialIsEmpty);
  const [contentType, setContentType] = useState(initialContentType);
  const [contentMetadata, setContentMetadata] = useState<
    BucketContentMetadata | null
  >(initialContentMetadata);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [useManualPassword, setUseManualPassword] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [error, setError] = useState("");

  // Use shared keypad hook for PIN entry
  const {
    digits: pinDigits,
    handlePress: handleKeypadPress,
    reset: resetPinDigits,
    value: pinValue,
  } = useKeypad(4);

  const hasUnlockInput = useManualPassword
    ? manualPassword.trim().length > 0
    : pinValue.length === 4;

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
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("owner_token")) {
        url.searchParams.delete("owner_token");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Handle file upload
  const handleUpload = async (file?: File, text?: string, link?: string) => {
    try {
      setIsUploading(true);
      setError("");
      haptics.medium();

      // Get owner token from secure storage
      const ownerToken = await getOwnerToken("bucket", bucketCode);
      if (!ownerToken) {
        throw new Error(
          "Owner token not found. You may not have permission to upload.",
        );
      }

      const uploadUrl =
        `${supabaseUrl}/functions/v1/upload-to-bucket?bucket_code=${bucketCode}&owner_token=${ownerToken}`;

      const authHeaders = getAuthHeaders();
      let response;

      if (file) {
        // Upload file
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            ...authHeaders,
          },
          body: formData,
        });
      } else if (text || link) {
        // Upload text or link
        response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            type: text ? "text" : "link",
            content: text || link,
          }),
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json();
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

      haptics.success();
      setIsUploading(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsUploading(false);
      haptics.error();
    }
  };

  // Handle file input
  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleUpload(input.files[0]);
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

      const downloadUrl = `${supabaseUrl}/functions/v1/download-from-bucket`;

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
          password: isPasswordProtected
            ? (useManualPassword ? manualPassword.trim() : pinValue)
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      if (contentType === "file") {
        // Download file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = contentMetadata?.filename || "download";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Show text/link content
        const data = await response.json();
        // Copy content to clipboard instead of using alert
        try {
          await navigator.clipboard.writeText(data.content);
          haptics.success();
          const event = new CustomEvent("show-toast", {
            detail: {
              message: "✅ Content copied to clipboard!",
              type: "success",
            },
          });
          globalThis.dispatchEvent(event);
        } catch {
          // Fallback: show in console if clipboard fails
          console.log("Content:", data.content);
          const event = new CustomEvent("show-toast", {
            detail: {
              message: "Content: " + data.content.substring(0, 50) +
                (data.content.length > 50 ? "..." : ""),
              type: "info",
            },
          });
          globalThis.dispatchEvent(event);
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

      haptics.success();
      setIsDownloading(false);
      setShowPasswordInput(false);
      setUseManualPassword(false);
      setManualPassword("");
      resetPinDigits();
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setIsDownloading(false);
      haptics.error();
    }
  };

  return (
    <div class="space-y-6">
      {/* Giant Interactive QR Code */}
      <div
        ref={canvasRef}
        class="bg-white rounded-chunky border-4 border-black shadow-chunky-hover cursor-pointer hover:scale-[1.02] transition-all duration-300 mx-auto max-w-full [&>canvas]:max-w-full [&>canvas]:h-auto"
        onClick={async () => {
          haptics.light();
          // Copy URL on click
          try {
            await navigator.clipboard.writeText(bucketUrl);
            const event = new CustomEvent("show-toast", {
              detail: {
                message: "Bucket URL copied! 📋",
                type: "success",
              },
            });
            globalThis.dispatchEvent(event);
          } catch (err) {
            console.error("Failed to copy URL:", err);
            const event = new CustomEvent("show-toast", {
              detail: {
                message: "Failed to copy URL ❌",
                type: "error",
              },
            });
            globalThis.dispatchEvent(event);
          }
        }}
        title="Click to copy URL"
      />

      {/* Status Badge */}
      <div class="text-center">
        <span
          class={`inline-block px-6 py-3 rounded-full border-3 border-black text-lg font-black shadow-chunky ${
            isEmpty
              ? "bg-gradient-to-r from-green-400 to-blue-400 text-white"
              : "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse"
          }`}
        >
          {isEmpty
            ? "🪣 Empty - Ready for Upload"
            : "💥 Full - Ready to Download"}
        </span>
      </div>

      {/* Content Display (if text and full) */}
      {!isEmpty && contentType === "text" && contentMetadata && (
        <div class="bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-300 rounded-xl p-6 shadow-chunky">
          <p class="text-2xl font-bold text-center break-words">
            {contentMetadata.content}
          </p>
        </div>
      )}

      {/* Media Preview */}
      {!isEmpty && (
        <div class="space-y-4">
          {/* Text Preview */}
          {contentType === "text" && contentMetadata?.content && (
            <div
              class={`
              border-4 border-black rounded-xl p-6 shadow-chunky relative overflow-hidden
              ${
                style === "sunset"
                  ? "bg-gradient-to-br from-orange-50 to-pink-50"
                  : ""
              }
              ${
                style === "ocean"
                  ? "bg-gradient-to-br from-blue-50 to-cyan-50"
                  : ""
              }
              ${style === "neon" ? "bg-gray-900 text-white" : ""}
              ${
                style === "forest"
                  ? "bg-gradient-to-br from-green-50 to-emerald-50"
                  : ""
              }
              ${
                !["sunset", "ocean", "neon", "forest"].includes(style)
                  ? "bg-white"
                  : ""
              }
            `}
            >
              <div
                class={`
                absolute top-0 left-0 w-full h-2
                ${
                  style === "sunset"
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                    : ""
                }
                ${
                  style === "ocean"
                    ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                    : ""
                }
                ${
                  style === "neon"
                    ? "bg-gradient-to-r from-pink-500 to-purple-500"
                    : ""
                }
                ${
                  style === "forest"
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : ""
                }
                ${
                  !["sunset", "ocean", "neon", "forest"].includes(style)
                    ? "bg-gray-200"
                    : ""
                }
              `}
              />
              <div
                class={`
                font-mono text-lg md:text-xl whitespace-pre-wrap break-words leading-relaxed
                ${style === "neon" ? "text-green-400" : "text-gray-800"}
              `}
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
              {!contentMetadata && (
                <div class="bg-gray-100 border-4 border-black rounded-xl p-8 text-center shadow-chunky">
                   <span class="text-5xl block mb-4">🔒</span>
                   <h3 class="text-xl font-bold text-gray-800 mb-2">Secure File</h3>
                   <p class="text-gray-600">Enter password to view details and download</p>
                </div>
              )}

              {/* Image Preview */}
              {contentMetadata?.mimetype?.startsWith("image/") && (
                <div class="relative rounded-xl overflow-hidden border-4 border-black shadow-chunky bg-white">
                  {isPasswordProtected
                    ? (
                      <div class="h-48 flex items-center justify-center bg-gray-100 text-gray-400">
                        <span class="text-4xl">🔒</span>
                        <p class="text-sm ml-2">Download to view</p>
                      </div>
                    )
                    : (
                      <img
                        src={`${supabaseUrl}/functions/v1/download-from-bucket?bucket_code=${bucketCode}`}
                        alt="Bucket content"
                        class="w-full h-auto object-cover"
                      />
                    )}
                </div>
              )}

              {/* Audio Preview */}
              {contentMetadata?.mimetype?.startsWith("audio/") && (
                <div class="bg-white border-4 border-black rounded-xl p-4 shadow-chunky">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl animate-bounce">🎵</span>
                    <span class="font-bold text-sm truncate">
                      {contentMetadata.filename}
                    </span>
                  </div>
                  {isPasswordProtected
                    ? (
                      <div class="text-center text-sm text-gray-500 py-2">
                        Download to listen 🔒
                      </div>
                    )
                    : (
                      <audio
                        controls
                        src={`${supabaseUrl}/functions/v1/download-from-bucket?bucket_code=${bucketCode}`}
                        class="w-full"
                      />
                    )}
                </div>
              )}

              {/* Video Preview */}
              {contentMetadata?.mimetype?.startsWith("video/") && (
                <div class="rounded-xl overflow-hidden border-4 border-black shadow-chunky bg-black">
                  {isPasswordProtected
                    ? (
                      <div class="h-48 flex items-center justify-center text-gray-500">
                        <span class="text-4xl">🔒</span>
                        <p class="text-sm ml-2">Download to view</p>
                      </div>
                    )
                    : (
                      <video
                        controls
                        src={`${supabaseUrl}/functions/v1/download-from-bucket?bucket_code=${bucketCode}`}
                        class="w-full"
                      />
                    )}
                </div>
              )}

               {/* Generic File Preview (if mimetype not handled above but metadata exists) */}
               {contentMetadata && !contentMetadata.mimetype?.startsWith("image/") && !contentMetadata.mimetype?.startsWith("audio/") && !contentMetadata.mimetype?.startsWith("video/") && (
                  <div class="bg-white border-4 border-black rounded-xl p-6 shadow-chunky text-center">
                    <span class="text-4xl block mb-2">📄</span>
                    <p class="font-bold text-lg">{contentMetadata.filename}</p>
                    <p class="text-sm text-gray-500">{contentMetadata.mimetype}</p>
                  </div>
               )}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {isEmpty
        ? (
          <div class="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              class="w-full py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "📤 Upload File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              class="hidden"
              onChange={handleFileInput}
            />
          </div>
        )
        : (
          <div class="space-y-3">
            {isPasswordProtected && !showPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                🔒 Unlock to View & Download
              </button>
            )}

            {isPasswordProtected && showPasswordInput && (
              <div class="space-y-4">
                {!useManualPassword && (
                  <div class="space-y-3">
                    <div class="flex justify-center gap-4">
                      {pinDigits.map((digit, index) => (
                        <div
                          key={`pin-${index}`}
                          class="w-12 h-14 bg-white border-3 border-black rounded-2xl flex items-center justify-center text-3xl font-black"
                        >
                          {digit ? "•" : ""}
                        </div>
                      ))}
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                      {[
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "clear",
                        "0",
                        "back",
                      ].map(
                        (key) => (
                          <button
                            key={`keypad-${key}`}
                            type="button"
                            class={`py-3 rounded-2xl text-lg font-black border-3 border-black bg-white hover:-translate-y-0.5 transition ${
                              key === "clear" || key === "back"
                                ? "text-gray-600"
                                : "text-gray-900"
                            }`}
                            onClick={() => handleKeypadPress(String(key))}
                          >
                            {key === "clear"
                              ? "Clear"
                              : key === "back"
                              ? "⌫"
                              : key}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {useManualPassword && (
                  <input
                    type="password"
                    value={manualPassword}
                    onInput={(e) =>
                      setManualPassword((e.target as HTMLInputElement).value)}
                    placeholder="Enter password"
                    class="w-full px-4 py-3 border-3 border-black rounded-xl text-lg"
                  />
                )}

                <div class="flex items-center justify-between text-[11px] text-gray-500">
                  <button
                    type="button"
                    class="underline"
                    onClick={() => {
                      setUseManualPassword((prev) => {
                        const next = !prev;
                        if (next) {
                          resetPinDigits();
                        } else {
                          setManualPassword("");
                        }
                        return next;
                      });
                      haptics.light();
                    }}
                  >
                    {useManualPassword ? "Use keypad" : "Use keyboard"}
                  </button>
                  <button
                    type="button"
                    class="underline"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setUseManualPassword(false);
                      setManualPassword("");
                      resetPinDigits();
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading ||
                    (useManualPassword
                      ? !manualPassword.trim()
                      : pinValue.length !== 4)}
                  class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isDownloading ? "Downloading..." : "💥 Download & Empty"}
                </button>
              </div>
            )}

            {!isPasswordProtected && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 animate-pulse-glow"
              >
                {isDownloading ? "Downloading..." : "💥 Download & Empty"}
              </button>
            )}

            {contentMetadata && contentType === "file" && (
              <p class="text-center text-sm text-gray-600">
                📄 {contentMetadata.filename ?? "File"}
                {typeof contentMetadata.size === "number"
                  ? ` ${(contentMetadata.size / 1024 / 1024).toFixed(2)} MB`
                  : ""}
              </p>
            )}
          </div>
        )}

      {/* Error Message */}
      {error && (
        <div class="bg-red-50 border-3 border-red-400 rounded-xl p-4 text-center">
          <p class="text-red-700 font-semibold">❌ {error}</p>
        </div>
      )}
    </div>
  );
}

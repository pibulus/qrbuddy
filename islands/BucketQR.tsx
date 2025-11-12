import { useEffect, useRef, useState } from "preact/hooks";
import QRCodeStyling from "qr-code-styling";
import { QR_STYLES } from "../utils/qr-styles.ts";
import { haptics } from "../utils/haptics.ts";

interface BucketQRProps {
  bucketUrl: string;
  bucketCode: string;
  style: string;
  isEmpty: boolean;
  contentType: string | null;
  contentMetadata: any;
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
  const [contentMetadata, setContentMetadata] = useState(initialContentMetadata);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState("");

  // Get QR style based on empty/full state
  const getQRStyle = () => {
    if (isEmpty) {
      // Empty: Use user's chosen style (soft, inviting)
      return QR_STYLES[style as keyof typeof QR_STYLES] || QR_STYLES.sunset;
    } else {
      // Full: Orange to red gradient (urgent, action needed)
      return {
        dots: {
          gradient: {
            type: "linear",
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
            type: "linear",
            rotation: 0.785,
            colorStops: [
              { offset: 0, color: "#FF6B35" },
              { offset: 1, color: "#DC143C" },
            ],
          },
        },
        cornersDot: {
          gradient: {
            type: "linear",
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
        color: "color" in currentStyle.dots ? currentStyle.dots.color : undefined,
        gradient: "gradient" in currentStyle.dots ? currentStyle.dots.gradient : undefined,
      },
      backgroundOptions: {
        color: "color" in currentStyle.background ? currentStyle.background.color : undefined,
        gradient: "gradient" in currentStyle.background ? currentStyle.background.gradient : undefined,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: currentStyle.cornersSquare && "color" in currentStyle.cornersSquare
          ? currentStyle.cornersSquare.color
          : undefined,
        gradient: currentStyle.cornersSquare && "gradient" in currentStyle.cornersSquare
          ? currentStyle.cornersSquare.gradient
          : undefined,
      },
      cornersDotOptions: {
        type: "dot",
        color: currentStyle.cornersDot && "color" in currentStyle.cornersDot
          ? currentStyle.cornersDot.color
          : undefined,
        gradient: currentStyle.cornersDot && "gradient" in currentStyle.cornersDot
          ? currentStyle.cornersDot.gradient
          : undefined,
      },
    });

    canvasRef.current.innerHTML = "";
    qrCode.append(canvasRef.current);
    qrCodeRef.current = qrCode;
  }, [isEmpty]);

  // Handle file upload
  const handleUpload = async (file?: File, text?: string, link?: string) => {
    try {
      setIsUploading(true);
      setError("");
      haptics.medium();

      // Get owner token from localStorage
      const ownerToken = localStorage.getItem(`bucket_${bucketCode}`);
      if (!ownerToken) {
        throw new Error("Owner token not found. You may not have permission to upload.");
      }

      const uploadUrl = `${supabaseUrl}/functions/v1/upload-to-bucket?bucket_code=${bucketCode}&owner_token=${ownerToken}`;

      let response;

      if (file) {
        // Upload file
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });
      } else if (text || link) {
        // Upload text or link
        response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

      const downloadUrl = `${supabaseUrl}/functions/v1/download-from-bucket?bucket_code=${bucketCode}${
        password ? `&password=${encodeURIComponent(password)}` : ""
      }`;

      const response = await fetch(downloadUrl);

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
        alert(`Content: ${data.content}`);
      }

      // Update state
      if (isReusable) {
        setIsEmpty(true);
        setContentType(null);
        setContentMetadata(null);
      }

      haptics.success();
      setIsDownloading(false);
      setShowPasswordInput(false);
      setPassword("");
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
        onClick={() => {
          haptics.light();
          // Copy URL on click
          navigator.clipboard.writeText(bucketUrl);
          alert("Bucket URL copied! 📋");
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
          {isEmpty ? "🪣 Empty - Ready for Upload" : "💥 Full - Ready to Download"}
        </span>
      </div>

      {/* Content Display (if text and full) */}
      {!isEmpty && contentType === "text" && contentMetadata && (
        <div class="bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-300 rounded-xl p-6 shadow-chunky">
          <p class="text-2xl font-bold text-center break-words">{contentMetadata.content}</p>
        </div>
      )}

      {/* Action Button */}
      {isEmpty ? (
        <div class="space-y-3">
          <button
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
      ) : (
        <div class="space-y-3">
          {isPasswordProtected && !showPasswordInput && (
            <button
              onClick={() => setShowPasswordInput(true)}
              class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              🔒 Unlock & Download
            </button>
          )}

          {isPasswordProtected && showPasswordInput && (
            <div class="space-y-3">
              <input
                type="password"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder="Enter password"
                class="w-full px-4 py-3 border-3 border-black rounded-xl text-lg"
              />
              <button
                onClick={handleDownload}
                disabled={isDownloading || !password}
                class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isDownloading ? "Downloading..." : "💥 Download & Empty"}
              </button>
            </div>
          )}

          {!isPasswordProtected && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              class="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white text-2xl font-black rounded-chunky border-4 border-black shadow-chunky-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 animate-pulse-glow"
            >
              {isDownloading ? "Downloading..." : "💥 Download & Empty"}
            </button>
          )}

          {contentMetadata && contentType === "file" && (
            <p class="text-center text-sm text-gray-600">
              📄 {contentMetadata.filename} ({(contentMetadata.size / 1024 / 1024).toFixed(2)} MB)
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

import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";

interface UseFileUploadProps {
  url: Signal<string>;
  isDestructible: Signal<boolean>;
  maxDownloads: Signal<number>;
  setInputType: (type: "text" | "file") => void;
  setValidationState: (state: "idle" | "valid" | "invalid") => void;
  setTouched: (touched: boolean) => void;
}

export function useFileUpload(
  {
    url,
    isDestructible,
    maxDownloads,
    setInputType,
    setValidationState,
    setTouched,
  }: UseFileUploadProps,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      haptics.medium();

      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File too large (max 25MB)");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("maxDownloads", maxDownloads.value.toString());

      // Simulate progress (real progress needs XHR)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/upload-file`,
        {
          method: "POST",
          body: formData,
        },
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      // Set the destructible URL
      url.value = data.url;
      isDestructible.value = true;
      setInputType("file");
      setValidationState("valid");
      setTouched(true);

      // Success haptic
      haptics.success();

      // Show success toast
      const scanText = maxDownloads.value === 999999
        ? "unlimited scans ∞"
        : maxDownloads.value === 1
        ? "1 scan"
        : `${maxDownloads.value} scans`;
      const event = new CustomEvent("show-toast", {
        detail: {
          message:
            `✅ ${file.name} uploaded! Will self-destruct after ${scanText} 💣`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

      // Reset progress after a moment
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setUploadError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
      haptics.error();

      // Show error toast
      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Upload failed: ${errorMessage}`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
    }
  };

  // Allow other components (like QR canvas) to trigger uploads via custom events
  useEffect(() => {
    const handleSmartInputUpload = (event: Event) => {
      const detail = (event as CustomEvent<{ file?: File }>).detail;
      if (detail?.file) {
        uploadFile(detail.file);
      }
    };

    globalThis.addEventListener(
      "smart-input-upload",
      handleSmartInputUpload as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "smart-input-upload",
        handleSmartInputUpload as EventListener,
      );
    };
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadError,
    uploadFile,
  };
}

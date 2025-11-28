import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { apiRequestFormData, ApiError } from "../utils/api-request.ts";
import { validateFile } from "../utils/file-validation.ts";
import {
  UPLOAD_PROGRESS_INTERVAL_MS,
  UPLOAD_PROGRESS_INCREMENT,
  UPLOAD_PROGRESS_MAX,
  UPLOAD_RESET_DELAY_MS,
  UNLIMITED_SCANS,
  UNLIMITED_SCANS_TEXT,
} from "../utils/constants.ts";

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

      // Validate file (size and type) before upload
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("maxDownloads", maxDownloads.value.toString());

      // Simulate progress (real progress needs XHR)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) =>
          Math.min(prev + UPLOAD_PROGRESS_INCREMENT, UPLOAD_PROGRESS_MAX)
        );
      }, UPLOAD_PROGRESS_INTERVAL_MS);

      const apiUrl = getApiUrl();

      // Use shared API helper (automatically includes auth headers)
      const data = await apiRequestFormData<{
        success: boolean;
        url: string;
        fileName: string;
        size: number;
        maxDownloads: number;
      }>(
        `${apiUrl}/upload-file`,
        formData,
        "Upload failed",
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Set the destructible URL
      url.value = data.url;
      isDestructible.value = true;
      setInputType("file");
      setValidationState("valid");
      setTouched(true);

      // Success haptic
      haptics.success();

      // Show success toast
      const scanText = maxDownloads.value === UNLIMITED_SCANS
        ? UNLIMITED_SCANS_TEXT
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
      }, UPLOAD_RESET_DELAY_MS);
    } catch (error) {
      console.error("[HOOK:useFileUpload] Upload failed:", {
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });

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

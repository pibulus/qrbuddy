import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { apiRequestFormDataWithProgress } from "../utils/api-request.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";
import {
  MAX_FILE_SIZE,
  SUPPORTER_MAX_FILE_SIZE,
  validateFile,
} from "../utils/file-validation.ts";
import { getSupporterPass } from "../utils/supporter-pass.ts";
import { uploadViaR2 } from "../utils/r2-upload.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import { addToHistory } from "../utils/history.ts";
import {
  UNLIMITED_SCANS,
  UNLIMITED_SCANS_TEXT,
  UPLOAD_RESET_DELAY_MS,
} from "../utils/constants.ts";

const MAX_SLIDESHOW_FILES = 10;
const MAX_SLIDESHOW_FILE_SIZE = 5 * 1024 * 1024;

interface UseFileUploadProps {
  url: Signal<string>;
  isDestructible: Signal<boolean>;
  maxDownloads: Signal<number>;
  qrStyle?: Signal<string>; // Add qrStyle prop
  setInputType: (type: "text" | "file") => void;
  setValidationState: (state: "idle" | "valid" | "invalid") => void;
  setTouched: (touched: boolean) => void;
}

export function useFileUpload(
  {
    url,
    isDestructible,
    maxDownloads,
    qrStyle,
    setInputType,
    setValidationState,
    setTouched,
  }: UseFileUploadProps,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const uploadFile = async (
    input: File | FileList | File[],
    options: { title?: string } = {},
  ) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      haptics.medium();

      const files = input instanceof FileList
        ? Array.from(input)
        : (Array.isArray(input) ? input : [input]);
      const isMulti = files.length > 1;

      // Supporter pass lifts the single-file ceiling (R2-backed, see below).
      const pass = getSupporterPass();
      const maxSize = pass && !isMulti
        ? SUPPORTER_MAX_FILE_SIZE
        : MAX_FILE_SIZE;

      // Validate files
      if (files.length > MAX_SLIDESHOW_FILES) {
        throw new Error(`Max ${MAX_SLIDESHOW_FILES} files allowed per share.`);
      }

      for (const file of files) {
        if (isMulti) {
          const isImageOrAudio = file.type.startsWith("image/") ||
            file.type.startsWith("audio/");
          if (!isImageOrAudio) {
            throw new Error(
              `File ${file.name} is not supported. Multi-file shares support images (slideshow) and audio tracks (playlist).`,
            );
          }

          if (file.size > MAX_SLIDESHOW_FILE_SIZE) {
            throw new Error(
              `File ${file.name} too large (max 5MB each for multi-file shares)`,
            );
          }
        }

        const validation = validateFile(file, maxSize);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      type UploadResponse = {
        success: boolean;
        url: string;
        fileName: string;
        size: number;
        maxDownloads: number;
        fileId?: string;
        ownerToken?: string;
      };

      let data: UploadResponse;
      if (pass && !isMulti && files[0].size > MAX_FILE_SIZE) {
        // Big file + pass: presigned browser→R2 upload, finalize-upload
        // answers with the same shape as upload-file.
        data = await uploadViaR2<UploadResponse>(
          {
            kind: "destructible",
            max_downloads: maxDownloads.value,
            theme: qrStyle?.value,
          },
          files[0],
          setUploadProgress,
        );
      } else {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("file", file);
        });
        formData.append("maxDownloads", maxDownloads.value.toString());
        if (options.title?.trim()) {
          formData.append("title", options.title.trim());
        }
        if (qrStyle?.value) {
          formData.append("theme", qrStyle.value);
        }

        const apiUrl = getApiUrl();

        data = await apiRequestFormDataWithProgress<UploadResponse>(
          `${apiUrl}/upload-file`,
          formData,
          setUploadProgress,
          "Upload failed",
        );
      }

      setUploadProgress(100);

      // It's yours: keep the owner token in the vault (this device) and a
      // "my QRs" entry so the share can be found and managed again.
      if (data.fileId && data.ownerToken) {
        await saveOwnerToken("file", data.fileId, data.ownerToken);
        const allAudio = files.every((f) => f.type.startsWith("audio/"));
        const allImages = files.every((f) => f.type.startsWith("image/"));
        addToHistory({
          type: "media",
          content: data.url,
          metadata: {
            title: options.title?.trim() ||
              (isMulti
                ? `${files.length} ${
                  allAudio ? "tracks" : allImages ? "photos" : "files"
                }`
                : files[0].name),
            ownerScope: "file",
            ownerId: data.fileId,
            kind: isMulti
              ? (allAudio ? "playlist" : allImages ? "slideshow" : "pack")
              : "file",
          },
        });
      }

      // Set the destructible URL
      url.value = data.url;
      isDestructible.value = maxDownloads.value !== UNLIMITED_SCANS;
      setInputType("file");
      setValidationState("valid");
      setTouched(true);

      // Auto-Copy URL
      try {
        await navigator.clipboard.writeText(data.url);
      } catch (err) {
        console.warn("Auto-copy failed:", err);
      }

      // Success haptic
      haptics.success();

      // Show success toast
      const scanText = maxDownloads.value === UNLIMITED_SCANS
        ? UNLIMITED_SCANS_TEXT
        : maxDownloads.value === 1
        ? "1 download"
        : `${maxDownloads.value} downloads`;
      const limitedDownloads = maxDownloads.value !== UNLIMITED_SCANS;

      let successMessage = "";
      if (isMulti) {
        const allAudio = files.every((f) => f.type.startsWith("audio/"));
        const allImages = files.every((f) => f.type.startsWith("image/"));
        successMessage = allAudio
          ? "Mixtape is live 🎵"
          : allImages
          ? "Slideshow is live 🖼️"
          : `${files.length} files are live 📦`;
      } else {
        successMessage = "File is live 📄";
      }
      if (limitedDownloads) {
        successMessage += ` · self-destructs after ${scanText}`;
      }
      successMessage += " · link copied";

      addToast(successMessage, 3000);

      // Reset progress after a moment
      setTimeout(() => {
        inFlightRef.current = false;
        setIsUploading(false);
        setUploadProgress(0);
      }, UPLOAD_RESET_DELAY_MS);
    } catch (error) {
      const errorMessage = reportFailure(
        "[HOOK:useFileUpload] Upload failed",
        error,
        "❌ Upload failed",
      );
      setUploadError(errorMessage);
      inFlightRef.current = false;
      setIsUploading(false);
      setUploadProgress(0);
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

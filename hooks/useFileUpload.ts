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

export const MAX_SLIDESHOW_FILES = 10;
export const FREE_SLIDESHOW_FILE_SIZE = 5 * 1024 * 1024;
export const PASSPORT_SLIDESHOW_FILE_SIZE = 25 * 1024 * 1024;
const CHUNKED_MULTI_BYTES_THRESHOLD = 12 * 1024 * 1024;

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
  ): Promise<string | null> => {
    if (inFlightRef.current) return null;
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

      // Supporter pass raises both the single-file R2 ceiling and multi-file item cap (25MB/item).
      const pass = getSupporterPass();
      const hasPass = Boolean(pass);
      const maxSize = hasPass && !isMulti
        ? SUPPORTER_MAX_FILE_SIZE
        : MAX_FILE_SIZE;
      const multiItemMax = hasPass
        ? PASSPORT_SLIDESHOW_FILE_SIZE
        : FREE_SLIDESHOW_FILE_SIZE;

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

          if (file.size > multiItemMax) {
            throw new Error(
              hasPass
                ? `File ${file.name} too large (max 25MB each for multi-file shares)`
                : `File ${file.name} too large (max 5MB each free · 25MB/track with Passport)`,
            );
          }
        }

        const validation = validateFile(file, isMulti ? multiItemMax : maxSize);
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

      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      let data: UploadResponse;
      if (hasPass && !isMulti && files[0].size > MAX_FILE_SIZE) {
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
      } else if (isMulti && totalBytes > CHUNKED_MULTI_BYTES_THRESHOLD) {
        // Upload first file to establish share ID & owner token, then append remaining tracks/photos
        // sequentially so multi-track Passport mixtapes never trip multipart body caps.
        const apiUrl = getApiUrl();
        const firstForm = new FormData();
        firstForm.append("file", files[0]);
        firstForm.append("maxDownloads", maxDownloads.value.toString());
        if (options.title?.trim()) {
          firstForm.append("title", options.title.trim());
        }
        if (qrStyle?.value) {
          firstForm.append("theme", qrStyle.value);
        }

        const sliceShare = 100 / files.length;
        data = await apiRequestFormDataWithProgress<UploadResponse>(
          `${apiUrl}/upload-file`,
          firstForm,
          (pct) => setUploadProgress(Math.round((pct / 100) * sliceShare)),
          "Upload failed",
        );

        if (data.fileId && data.ownerToken) {
          for (let i = 1; i < files.length; i++) {
            const appendForm = new FormData();
            appendForm.append("fileId", data.fileId);
            appendForm.append("ownerToken", data.ownerToken);
            appendForm.append("action", "append");
            appendForm.append("file", files[i]);
            const basePct = Math.round(i * sliceShare);
            await apiRequestFormDataWithProgress<{ success: boolean }>(
              `${apiUrl}/update-file`,
              appendForm,
              (pct) =>
                setUploadProgress(
                  Math.min(99, basePct + Math.round((pct / 100) * sliceShare)),
                ),
              `Failed uploading ${files[i].name}`,
            );
          }
        }
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
      let ownerTokenStored = false;
      let historyStored = false;
      if (data.fileId) {
        if (data.ownerToken) {
          ownerTokenStored = await saveOwnerToken(
            "file",
            data.fileId,
            data.ownerToken,
          );
        }
        const allAudio = files.every((f) => f.type.startsWith("audio/"));
        const allImages = files.every((f) => f.type.startsWith("image/"));
        historyStored = addToHistory({
          type: "media",
          content: data.url,
          metadata: {
            title: options.title?.trim() ||
              (isMulti
                ? `${files.length} ${
                  allAudio ? "tracks" : allImages ? "photos" : "files"
                }`
                : files[0].name),
            ...(ownerTokenStored ? { ownerScope: "file" } : {}),
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
      let linkCopied = false;
      try {
        await navigator.clipboard.writeText(data.url);
        linkCopied = true;
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
      successMessage += linkCopied
        ? " · link copied"
        : " · use Copy below to share it";
      if (!ownerTokenStored) {
        successMessage += " · this device couldn't remember its manage key";
      }
      if (!historyStored) {
        successMessage += " · this device couldn't save it to history";
      }

      addToast(successMessage, ownerTokenStored && historyStored ? 3000 : 6000);

      // Reset progress after a moment
      setTimeout(() => {
        inFlightRef.current = false;
        setIsUploading(false);
        setUploadProgress(0);
      }, UPLOAD_RESET_DELAY_MS);
      return data.url;
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
      return null;
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

import { Signal, useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";
import { QRTemplateType } from "../types/qr-templates.ts";
import CreateModal from "./CreateModal.tsx";
import HistoryDrawer from "./HistoryDrawer.tsx";
import { addToHistory, HistoryItem } from "../utils/history.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import { useDynamicQR } from "../hooks/useDynamicQR.ts";
import { useFileUpload } from "../hooks/useFileUpload.ts";
import { useBatchGenerator } from "../hooks/useBatchGenerator.ts";
import {
  type CreateBucketOptions,
  useBucketCreator,
} from "../hooks/useBucketCreator.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { validateFile } from "../utils/file-validation.ts";

// Sub-components
import SmartInputToolbar from "./smart-input/SmartInputToolbar.tsx";

import FileUploadOptions from "./smart-input/FileUploadOptions.tsx";

interface SmartInputProps {
  url: Signal<string>;
  isDestructible: Signal<boolean>;
  isDynamic: Signal<boolean>;
  editUrl: Signal<string>;
  maxDownloads: Signal<number>;
  isBucket: Signal<boolean>;
  bucketUrl: Signal<string>;
  logoUrl: Signal<string>;
  qrStyle: Signal<string>;
  onModalStateChange?: (isOpen: boolean) => void;
}

export default function SmartInput(
  {
    url,
    isDestructible,
    isDynamic,
    editUrl,
    maxDownloads,
    isBucket,
    bucketUrl,
    logoUrl,
    qrStyle,
    onModalStateChange,
  }: SmartInputProps,
) {
  const [validationState, setValidationState] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [touched, setTouched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create sheet state
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateType>(
    "url",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createHasUpdates, setCreateHasUpdates] = useState(false);

  // Report modal state changes
  useEffect(() => {
    onModalStateChange?.(isCreateModalOpen);
  }, [isCreateModalOpen, onModalStateChange]);

  // Dynamic QR options
  const [scanLimit, setScanLimit] = useState<number | null>(null); // Default to null (unlimited)
  const [expiryDate, setExpiryDate] = useState<string>("");

  // Sequential QR options
  const [isSequential, setIsSequential] = useState(false);
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);

  // Bulk create options
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");

  // Intro page options
  const splashConfig = useSignal<
    {
      enabled: boolean;
      title: string;
      buttonText: string;
      imageUrl?: string;
      description?: string;
    } | null
  >(null);

  // Custom hooks
  const { isCreating: isCreatingDynamic, createDynamicQR } = useDynamicQR({
    url,
    editUrl,
    scanLimit,
    expiryDate,
    routingMode: isSequential ? "sequential" : "simple",
    routingConfig: isSequential
      ? {
        urls: sequentialUrls.filter((u) => u.trim() !== ""),
        loop: loopSequence,
      }
      : undefined,
    splashConfig: splashConfig.value,
  });

  const { isUploading, uploadProgress, uploadError, uploadFile } =
    useFileUpload({
      url,
      isDestructible,
      maxDownloads,
      qrStyle, // Pass theme
      setInputType: () => {}, // SmartInput doesn't directly manage inputType state for file uploads
      setValidationState,
      setTouched,
    });

  const { isGeneratingBatch, batchProgress, generateBatchZIP } =
    useBatchGenerator({
      batchUrls,
      logoUrl,
    });

  const { isCreatingBucket, createTextBucket, createBucket, uploadToBucket } =
    useBucketCreator(
      {
        url,
        bucketUrl,
      },
    );

  const handleLockerConfirm = async (
    options: CreateBucketOptions,
  ): Promise<boolean> => {
    isDynamic.value = false;
    setIsBatchMode(false);
    setIsSequential(false);
    setScanLimit(null);
    setExpiryDate("");
    splashConfig.value = null; // Reset splash

    const result = await createBucket({
      ...options,
      style: options.style ?? (qrStyle.value || "sunset"),
    });

    if (result) {
      isBucket.value = true;
      setCreateHasUpdates(true);
      return true;
    }

    return false;
  };

  const handleTextCardConfirm = async (text: string): Promise<boolean> => {
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    isDynamic.value = false;
    setIsBatchMode(false);
    setIsSequential(false);
    setScanLimit(null);
    setExpiryDate("");
    splashConfig.value = null;

    const result = await createTextBucket(trimmedText);
    if (result) {
      isBucket.value = true;
      setCreateHasUpdates(true);
      return true;
    }

    return false;
  };

  const handleLockerDisable = () => {
    isBucket.value = false;
    bucketUrl.value = "";
    url.value = "";

    const event = new CustomEvent("show-toast", {
      detail: {
        message: "Locker disconnected. Drop a new link to continue.",
        type: "info",
      },
    });
    globalThis.dispatchEvent(event);
  };

  // Handle Smart Media Creation (from MediaHubForm)
  useEffect(() => {
    const handleSmartMediaCreate = async (event: Event) => {
      const detail = (event as CustomEvent<{
        file?: File;
        metadata?: { title?: string; description?: string; creator?: string };
        password?: string | null;
        onComplete?: (success: boolean) => void;
      }>).detail;
      const { file, metadata, password, onComplete } = detail;

      if (!file) {
        onComplete?.(false);
        return;
      }

      let success = false;

      try {
        const bucketData = await createBucket({
          bucketType: "file",
          style: qrStyle.value || "sunset",
          isReusable: true,
          password: password || undefined,
        });

        if (bucketData) {
          success = await uploadToBucket(
            bucketData.bucket_code,
            bucketData.owner_token,
            file,
            metadata,
          );

          if (success) {
            isBucket.value = true;
            setCreateHasUpdates(true);
          }
        }
      } finally {
        onComplete?.(success);
      }
    };

    globalThis.addEventListener(
      "smart-media-create",
      handleSmartMediaCreate as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "smart-media-create",
        handleSmartMediaCreate as EventListener,
      );
    };
    // Signals are read live inside the handler, so no deps needed — a
    // [qrStyle.value] dep re-registered the listener on every style change,
    // leaving a window where a dispatched event had no listener.
  }, []);

  // URL validation function
  const validateURL = (urlString: string): boolean => {
    if (!urlString.trim()) return false;
    return urlString.length > 0; // Allow any text for QR generation
  };

  // Update validation state when URL changes
  useEffect(() => {
    if (!touched) return;

    const isValid = validateURL(url.value);
    const newState = url.value.trim() === ""
      ? "idle"
      : (isValid ? "valid" : "invalid");

    if (newState !== validationState) {
      setValidationState(newState);

      // Haptic feedback for validation changes
      if (newState === "valid" && validationState === "invalid") {
        haptics.light();
      } else if (newState === "invalid" && validationState === "valid") {
        haptics.error();
      }
    }
  }, [url.value, touched, validationState]);

  // Helper to check if string is likely a URL
  const isValidUrl = (s: string) => {
    try {
      const url = new URL(s.startsWith("http") ? s : `https://${s}`);
      return url.hostname.includes(".");
    } catch {
      return false;
    }
  };

  // Create dynamic QR (Redirect) once the input settles on a URL.
  // Plain text deliberately does NOT auto-create anything server-side — it
  // used to spawn a text bucket mid-typing and overwrite the input with the
  // note URL. Text cards are created explicitly via Create → Plain text.
  useEffect(() => {
    if (
      isDynamic.value && url.value && !isCreatingDynamic && !editUrl.value &&
      !isBucket.value && !isCreatingBucket && isValidUrl(url.value)
    ) {
      const timer = setTimeout(() => {
        createDynamicQR(url.value);
      }, 1200); // Debounce — long enough to finish typing a URL before auto-creating

      return () => clearTimeout(timer);
    }
    // Include the creation guards so that when a failed auto-create flips
    // isCreating* back to false, the effect re-evaluates and can retry without
    // the user having to toggle the mode or type another character.
  }, [
    isDynamic.value,
    url.value,
    isCreatingDynamic,
    isCreatingBucket,
    isBucket.value,
    editUrl.value,
  ]);

  // Flag create button when new QR management links exist
  useEffect(() => {
    if ((editUrl.value || bucketUrl.value) && !isCreateModalOpen) {
      setCreateHasUpdates(true);
    }
  }, [editUrl.value, bucketUrl.value, isCreateModalOpen]);

  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    url.value = input.value;
    isDestructible.value = false; // Regular text/URL, not destructible

    if (!touched) {
      setTouched(true);
    }
  };

  const handleFocus = () => {
    haptics.medium();
  };

  // Drag & drop handlers
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Stage files first so the user can pick a download limit before upload.
  // (The old flow uploaded on drop, which made the limit picker unreachable.)
  const stageFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        addToast(`❌ ${validation.error}`, 4000);
        haptics.error();
        return;
      }
    }
    maxDownloads.value = UNLIMITED_SCANS;
    setStagedFiles(files);
    haptics.medium();
  };

  const handleStagedConfirm = () => {
    if (!stagedFiles) return;
    uploadFile(stagedFiles).finally(() => {
      setStagedFiles(null);
    });
  };

  const handleStagedCancel = () => {
    setStagedFiles(null);
    maxDownloads.value = UNLIMITED_SCANS;
    if (fileInputRef.current) fileInputRef.current.value = "";
    haptics.light();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      stageFiles(files);
    }
  };

  // File input click handler
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      stageFiles(files);
      input.value = "";
    }
  };

  const uploadStatusText = uploadProgress >= 99
    ? "Processing..."
    : "Uploading...";

  const getInputClass = () => {
    const baseClass = `
      w-full px-5 py-4 text-lg
      bg-white border-3 border-black
      rounded-xl
      focus:outline-none focus:border-pink-500
      focus:scale-[1.03] focus:shadow-2xl
      focus:animate-glow-pulse
      transition-all duration-500 ease-out
      placeholder:text-gray-400
      hover:scale-[1.01] hover:shadow-lg
    `;

    if (isDragging) {
      return `${baseClass} border-purple-500 bg-purple-50 scale-[1.03]`;
    }

    if (!touched || validationState === "idle") {
      return baseClass;
    }

    if (validationState === "valid") {
      return `${baseClass} ${
        isDestructible.value ? "border-orange-500" : "border-green-500"
      }`;
    }

    if (validationState === "invalid") {
      return `${baseClass} border-red-500 animate-shake`;
    }

    return baseClass;
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.type === "file" && item.metadata?.bucketCode) {
      const bucketCode = item.metadata.bucketCode;
      getOwnerToken("bucket", bucketCode).then((token) => {
        const historyUrl = `/bucket/${bucketCode}${
          token ? `?owner_token=${token}` : ""
        }`;
        globalThis.location.href = historyUrl;
      });
      return;
    }

    if (item.metadata?.shortCode) {
      const shortCode = item.metadata.shortCode;
      getOwnerToken("qr", shortCode).then((token) => {
        if (token) {
          globalThis.location.href = `/edit?token=${token}`;
        } else {
          addToast(
            "Owner token not found. Re-create this QR to edit it.",
            4000,
          );
        }
      });
      return;
    }

    if (item.type === "url" || item.type === "text" || item.type === "wifi") {
      setSelectedTemplate(item.type);
      url.value = item.content;
      setTouched(true);
    }
    setShowHistory(false);
  };

  // Effect to save to history when a QR is successfully generated/updated
  useEffect(() => {
    if (editUrl.value && url.value && !isCreatingDynamic) {
      // url.value is only a QR link right after creation — if the user types
      // free text while editUrl is still set, new URL() would throw and each
      // keystroke would pollute history. Skip anything that doesn't parse.
      let shortCode = "";
      try {
        shortCode = new URL(url.value).searchParams.get("code") || "";
      } catch {
        return;
      }
      addToHistory({
        type: selectedTemplate,
        content: url.value,
        metadata: {
          title: url.value.length > 30
            ? url.value.substring(0, 30) + "..."
            : url.value,
          shortCode,
        },
      });
    } else if (
      isBucket.value && bucketUrl.value && url.value && !isCreatingBucket
    ) {
      addToHistory({
        type: "file",
        content: url.value,
        metadata: {
          title: url.value.length > 30
            ? url.value.substring(0, 30) + "..."
            : url.value,
          bucketCode: bucketUrl.value.split("/").pop(),
        },
      });
    }
  }, [
    editUrl.value,
    bucketUrl.value,
    url.value,
    isCreatingDynamic,
    isCreatingBucket,
    isBucket.value,
    selectedTemplate,
  ]);

  return (
    <div class="w-full space-y-4">
      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
      />

      {/* Toolbar */}
      <SmartInputToolbar
        selectedTemplate={selectedTemplate}
        setIsCreateModalOpen={setIsCreateModalOpen}
        setCreateHasUpdates={setCreateHasUpdates}
        createHasUpdates={createHasUpdates}
        onShowHistory={() => setShowHistory(true)} // Pass handler to toolbar
      />

      {/* Create Modal - Rendered here for mobile layout flow */}
      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          setTouched(false);
          setValidationState("idle");
        }}
        url={url}
        isDynamic={isDynamic}
        isBucket={isBucket}
        editUrl={editUrl}
        bucketUrl={bucketUrl}
        logoUrl={logoUrl}
        qrStyle={qrStyle}
        scanLimit={scanLimit}
        setScanLimit={setScanLimit}
        expiryDate={expiryDate}
        setExpiryDate={setExpiryDate}
        isBatchMode={isBatchMode}
        setIsBatchMode={setIsBatchMode}
        isSequential={isSequential}
        setIsSequential={setIsSequential}
        sequentialUrls={sequentialUrls}
        setSequentialUrls={setSequentialUrls}
        loopSequence={loopSequence}
        setLoopSequence={setLoopSequence}
        batchUrls={batchUrls}
        setBatchUrls={setBatchUrls}
        isGeneratingBatch={isGeneratingBatch}
        batchProgress={batchProgress}
        onGenerateBatch={generateBatchZIP}
        onLockerConfirm={handleLockerConfirm}
        onLockerDisable={handleLockerDisable}
        onTextCardConfirm={handleTextCardConfirm}
        isCreatingLocker={isCreatingBucket}
        splashConfig={splashConfig}
      />

      <div class="relative group">
        {/* URL/File Input - Always visible */}
        <div
          class="relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="text"
            value={url.value}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={() => setTouched(true)}
            placeholder={isDragging
              ? "Drop file here..."
              : "Enter URL, text, or drop a file..."}
            aria-label="URL, text, or file to encode in QR code"
            aria-invalid={validationState === "invalid"}
            aria-describedby={validationState === "invalid"
              ? "input-error"
              : undefined}
            class={getInputClass()}
            disabled={isUploading}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            class="hidden"
            onChange={handleFileInputChange}
            accept="*/*"
            multiple
          />

          {/* File upload button */}
          {!isUploading && !isDestructible.value && (
            <button
              type="button"
              onClick={handleFileInputClick}
              class="absolute right-3 top-1/2 transform -translate-y-1/2
                   w-11 h-11 flex items-center justify-center rounded-lg
                   text-2xl hover:bg-gray-100 hover:scale-110 transition-all"
              aria-label="Upload file"
              title="Upload file"
            >
              📎
            </button>
          )}

          {/* Validation indicator */}
          {touched && validationState === "valid" && !isUploading && (
            <div class="absolute right-14 top-1/2 transform -translate-y-1/2
                      text-xl animate-pop">
              {isDestructible.value ? "💣" : "✓"}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Helper text */}
        {touched && validationState === "invalid" && url.value.trim() !== "" &&
          (
            <p
              id="input-error"
              class="text-red-600 text-sm mt-2 text-center animate-slide-down"
              role="alert"
            >
              Enter any text, URL, or drop a file
            </p>
          )}

        {/* Upload error */}
        {uploadError && (
          <p
            class="text-red-600 text-sm mt-2 text-center animate-slide-down"
            role="alert"
          >
            {uploadError}
          </p>
        )}

        {/* Staged file panel — pick a download limit, then upload */}
        {stagedFiles && (
          <FileUploadOptions
            files={stagedFiles}
            maxDownloads={maxDownloads}
            isUploading={isUploading}
            onConfirm={handleStagedConfirm}
            onCancel={handleStagedCancel}
          />
        )}

        {/* Editable mode needs a URL — plain text stays a static QR */}
        {isDynamic.value && !editUrl.value && !isBucket.value &&
          url.value.trim() !== "" && !isValidUrl(url.value) && (
          <p class="text-purple-700 text-xs mt-2 text-center animate-slide-down">
            Editable QRs need a link. This text makes a static QR — for a hosted
            note, use Create → Plain text.
          </p>
        )}

        {/* Destructible indicator */}
        {isDestructible.value && !isUploading && !stagedFiles &&
          maxDownloads.value !== UNLIMITED_SCANS && (
          <p class="text-orange-700 text-sm mt-2 text-center font-semibold animate-slide-down">
            💣 This file will self-destruct after {maxDownloads.value}{" "}
            {maxDownloads.value === 1 ? "download" : "downloads"}
          </p>
        )}

        {/* Upload progress text */}
        {isUploading && (
          <p class="text-purple-600 text-sm mt-2 text-center animate-pulse">
            {uploadStatusText} {uploadProgress}%
          </p>
        )}
      </div>
    </div>
  );
}

import { Signal, useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { QRTemplateType } from "../types/qr-templates.ts";
import TemplateModal from "./TemplateModal.tsx";
import ExtrasModal from "./ExtrasModal.tsx";
import HistoryDrawer from "./HistoryDrawer.tsx";
import { addToHistory, HistoryItem } from "../utils/history.ts";
import { useDynamicQR } from "../hooks/useDynamicQR.ts";
import { useFileUpload } from "../hooks/useFileUpload.ts";
import { useBatchGenerator } from "../hooks/useBatchGenerator.ts";
import {
  type CreateBucketOptions,
  useBucketCreator,
} from "../hooks/useBucketCreator.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template selector state
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateType>(
    "url",
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [extrasHasUpdates, setExtrasHasUpdates] = useState(false);

  // Report modal state changes
  useEffect(() => {
    onModalStateChange?.(isTemplateModalOpen || isExtrasModalOpen);
  }, [isTemplateModalOpen, isExtrasModalOpen, onModalStateChange]);

  // Dynamic QR options
  const [scanLimit, setScanLimit] = useState<number | null>(null); // Default to null (unlimited)
  const [expiryDate, setExpiryDate] = useState<string>("");

  // Sequential QR options
  const [isSequential, setIsSequential] = useState(false);
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);

  // Batch Mode options
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");

  // Splash Page options
  const splashConfig = useSignal<{
    enabled: boolean;
    title: string;
    buttonText: string;
    imageUrl?: string;
    description?: string;
  } | null>(null);

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
      setExtrasHasUpdates(true);
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
      const detail = (event as CustomEvent).detail;
      const { file, metadata, password } = detail;

      if (!file) return;

      // 1. Create Bucket
      const bucketData = await createBucket({
        bucketType: "file",
        style: qrStyle.value || "sunset",
        isReusable: true,
        password: password || undefined,
      });

      if (bucketData) {
        // 2. Upload File with Metadata
        await uploadToBucket(
          bucketData.bucket_code,
          bucketData.owner_token,
          file,
          metadata,
        );

        // 3. Update UI
        isBucket.value = true;
        setExtrasHasUpdates(true);
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
  }, [qrStyle.value]);

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

  // Create dynamic QR (Redirect) or Text Bucket (Smart Text)
  useEffect(() => {
    if (
      isDynamic.value && url.value && !isCreatingDynamic && !editUrl.value &&
      !isBucket.value && !isCreatingBucket
    ) {
      const timer = setTimeout(() => {
        if (isValidUrl(url.value)) {
          // It's a URL -> Create Redirect
          createDynamicQR(url.value);
        } else {
          // It's Text -> Create Text Bucket
          createTextBucket(url.value);
        }
      }, 800); // Increased debounce for text typing

      return () => clearTimeout(timer);
    }
  }, [isDynamic.value, url.value]);

  // Flag extras button when new goodies exist
  useEffect(() => {
    if ((editUrl.value || bucketUrl.value) && !isExtrasModalOpen) {
      setExtrasHasUpdates(true);
    }
  }, [editUrl.value, bucketUrl.value, isExtrasModalOpen]);

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

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      uploadFile(files);
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
      uploadFile(files);
    }
  };

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
    // Restore state based on item type
    if (item.type === "file" && item.metadata?.bucketCode) {
      const historyUrl = `/bucket/${item.metadata.bucketCode}${
        item.metadata.ownerToken
          ? `?owner_token=${item.metadata.ownerToken}`
          : ""
      }`;
      globalThis.location.href = historyUrl;
      return;
    }

    // For dynamic QRs (Redirect to Edit Page)
    if (item.metadata?.dynamicUrl) {
      globalThis.location.href = item.metadata.dynamicUrl as string;
      return;
    }

    // For static types
    if (item.type === "url" || item.type === "text" || item.type === "wifi") {
      setSelectedTemplate(item.type); // Set the template type
      url.value = item.content; // Set the input value
      setTouched(true); // Mark as touched to trigger validation
      // No direct QR generation here, just setting the input for user to generate/edit.
    }
    setShowHistory(false); // Close history drawer after selection
  };

  // Effect to save to history when a QR is successfully generated/updated
  useEffect(() => {
    // This effect should ideally trigger when a QR is *finalized* and ready to be displayed/used.
    // For SmartInput, this means when `editUrl.value` (dynamic QR) or `bucketUrl.value` (bucket) is set,
    // or when a static QR is generated (which happens in the parent component that consumes `url.value`).
    // For now, let's focus on dynamic and bucket QRs as they are managed within SmartInput.

    if (editUrl.value && url.value && !isCreatingDynamic) {
      addToHistory({
        type: selectedTemplate,
        content: url.value,
        metadata: {
          title: url.value.length > 30
            ? url.value.substring(0, 30) + "..."
            : url.value,
          dynamicUrl: editUrl.value,
        },
      });
    } else if (
      isBucket.value && bucketUrl.value && url.value && !isCreatingBucket
    ) {
      addToHistory({
        type: "file", // Assuming bucket is primarily for files or smart text
        content: url.value,
        metadata: {
          title: url.value.length > 30
            ? url.value.substring(0, 30) + "..."
            : url.value,
          bucketCode: bucketUrl.value.split("/").pop(), // Extract code from URL
          // ownerToken might be needed here if available
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
        setIsTemplateModalOpen={setIsTemplateModalOpen}
        setIsExtrasModalOpen={setIsExtrasModalOpen}
        setExtrasHasUpdates={setExtrasHasUpdates}
        extrasHasUpdates={extrasHasUpdates}
        onShowHistory={() => setShowHistory(true)} // Pass handler to toolbar
      />

      {/* Template Modal - Rendered here for mobile layout flow */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          setTouched(false);
          setValidationState("idle");
        }}
        url={url}
      />

      {/* Extras Modal - Rendered here for mobile layout flow */}
      <ExtrasModal
        isOpen={isExtrasModalOpen}
        onClose={() => setIsExtrasModalOpen(false)}
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
            class="absolute right-4 top-1/2 transform -translate-y-1/2
                   text-2xl hover:scale-110 transition-transform"
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
      {touched && validationState === "invalid" && url.value.trim() !== "" && (
        <p
          id="input-error"
          class="text-red-500 text-sm mt-2 text-center animate-slide-down"
          role="alert"
        >
          Enter any text, URL, or drop a file
        </p>
      )}

      {/* Upload error */}
      {uploadError && (
        <p
          class="text-red-500 text-sm mt-2 text-center animate-slide-down"
          role="alert"
        >
          {uploadError}
        </p>
      )}

      {/* File Upload Options - shown when dragging file */}
      {selectedTemplate === "url" && !isDynamic.value &&
        !isDestructible.value && !isUploading && isDragging && (
        <FileUploadOptions maxDownloads={maxDownloads} />
      )}

      {/* Destructible indicator */}
      {isDestructible.value && !isUploading &&
        maxDownloads.value !== UNLIMITED_SCANS && (
        <p class="text-orange-600 text-sm mt-2 text-center font-semibold animate-slide-down">
          ⚠️ This file will self-destruct after {maxDownloads.value}{" "}
          {maxDownloads.value === 1 ? "scan" : "scans"}
        </p>
      )}

      {/* Upload progress text */}
      {isUploading && (
        <p class="text-purple-600 text-sm mt-2 text-center animate-pulse">
          Uploading... {uploadProgress}%
        </p>
      )}
    </div>
    </div>
  );
}

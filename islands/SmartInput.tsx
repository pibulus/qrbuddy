import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { QRTemplateType } from "../types/qr-templates.ts";
import TemplateModal from "./TemplateModal.tsx";
import ExtrasModal from "./ExtrasModal.tsx";
import { useDynamicQR } from "../hooks/useDynamicQR.ts";
import { useFileUpload } from "../hooks/useFileUpload.ts";
import { useBatchGenerator } from "../hooks/useBatchGenerator.ts";
import { useBucketCreator } from "../hooks/useBucketCreator.ts";

// Sub-components
import SmartInputToolbar from "./smart-input/SmartInputToolbar.tsx";
import SequentialOptions from "./smart-input/SequentialOptions.tsx";
import StatusBadge from "./smart-input/StatusBadge.tsx";
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
  }: SmartInputProps,
) {
  const [validationState, setValidationState] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [touched, setTouched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [_inputType, setInputType] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template selector state
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateType>(
    "url",
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [extrasHasUpdates, setExtrasHasUpdates] = useState(false);

  // Dynamic QR options
  const [scanLimit, setScanLimit] = useState<number | null>(1); // Default to 1 (destructible)
  const [expiryDate, setExpiryDate] = useState<string>("");

  // Sequential QR options
  const [isSequential, setIsSequential] = useState(false);
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);

  // Batch Mode options
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");

  // Custom hooks
  const { isCreating: isCreatingDynamic, createDynamicQR } = useDynamicQR({
    url,
    editUrl,
    scanLimit,
    expiryDate,
    routingMode: isSequential ? "sequential" : "simple",
    routingConfig: isSequential
      ? { urls: sequentialUrls.filter((u) => u.trim() !== ""), loop: loopSequence }
      : undefined,
  });

  const { isUploading, uploadProgress, uploadError, uploadFile } =
    useFileUpload({
      url,
      isDestructible,
      maxDownloads,
      setInputType,
      setValidationState,
      setTouched,
    });

  const { isGeneratingBatch, batchProgress, generateBatchZIP } = useBatchGenerator({
    batchUrls,
    logoUrl
  });

  const { isCreatingBucket, createTextBucket, createBucket } = useBucketCreator({
    url,
    bucketUrl
  });

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

  // Create bucket when isBucket is enabled
  useEffect(() => {
    if (isBucket.value && !isCreatingBucket && !bucketUrl.value) {
      createBucket();
    }
  }, [isBucket.value]);

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
    setInputType("text");

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
      uploadFile(files[0]);
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
      uploadFile(files[0]);
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

  return (
    <div class="w-full space-y-4">
      {/* Toolbar */}
      <SmartInputToolbar
        selectedTemplate={selectedTemplate}
        setIsTemplateModalOpen={setIsTemplateModalOpen}
        setIsExtrasModalOpen={setIsExtrasModalOpen}
        setExtrasHasUpdates={setExtrasHasUpdates}
        extrasHasUpdates={extrasHasUpdates}
      />

      {/* URL/File Input - only shown for URL template */}
      {selectedTemplate === "url" && (
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
      )}

      {/* Sequential QR Options */}
      {selectedTemplate === "url" && isDynamic.value && !isDestructible.value && !isBucket.value && !isBatchMode && (
        <SequentialOptions
          isSequential={isSequential}
          setIsSequential={setIsSequential}
          sequentialUrls={sequentialUrls}
        />
      )}

      {/* Batch Mode Active Badge */}
      {isBatchMode && (
        <StatusBadge
          icon="📦"
          label="Batch Mode Active"
          subtext={`${batchUrls.split("\n").filter((u) => u.trim()).length} URLs queued • Manage in Power-Ups`}
          colorClass="blue"
        />
      )}

      {/* File Locker Active Badge */}
      {isBucket.value && (
        <StatusBadge
          icon="🪣"
          label="Locker Active"
          subtext="Manage settings in Power-Ups"
          colorClass="teal"
        />
      )}

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
      {isDestructible.value && !isUploading && (
        <p class="text-orange-600 text-sm mt-2 text-center font-semibold animate-slide-down">
          ⚠️ This file will self-destruct after{" "}
          {maxDownloads.value === 999999 ? "unlimited" : maxDownloads.value}
          {" "}
          {maxDownloads.value === 1 ? "scan" : "scans"}
        </p>
      )}

      {/* Upload progress text */}
      {isUploading && (
        <p class="text-purple-600 text-sm mt-2 text-center animate-pulse">
          Uploading... {uploadProgress}%
        </p>
      )}

      {/* Template Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={(template) => {
          setSelectedTemplate(template);
          setTouched(false);
          setValidationState("idle");
        }}
        url={url}
        isDestructible={isDestructible}
        onInputChange={(value) => {
          url.value = value;
          isDestructible.value = false;
          if (!touched) setTouched(true);
        }}
        onFocus={handleFocus}
        onBlur={() => setTouched(true)}
      />
      {/* Extras Modal */}
      <ExtrasModal
        isOpen={isExtrasModalOpen}
        onClose={() => setIsExtrasModalOpen(false)}
        isDynamic={isDynamic}
        isBucket={isBucket}
        editUrl={editUrl}
        bucketUrl={bucketUrl}
        logoUrl={logoUrl}
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
      />
    </div>
  );
}

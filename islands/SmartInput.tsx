import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../types/qr-templates.ts";
import TemplateModal from "./TemplateModal.tsx";
import ExtrasModal from "./ExtrasModal.tsx";
import { addToast } from "./ToastManager.tsx";
import { useDynamicQR } from "../hooks/useDynamicQR.ts";
import { useFileUpload } from "../hooks/useFileUpload.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import JSZip from "jszip";
import QRCodeStyling from "qr-code-styling";

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

  // Bucket options
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);

  // Sequential QR options
  const [isSequential, setIsSequential] = useState(false);
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);

  // Batch Mode options
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Custom hooks for complex operations
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

  // Create dynamic QR when isDynamic is enabled with valid URL
  useEffect(() => {
    if (
      isDynamic.value && url.value && !isCreatingDynamic && !editUrl.value &&
      !isBucket.value
    ) {
      // Only create if we have a URL and haven't created yet
      const timer = setTimeout(() => {
        if (validateURL(url.value)) {
          createDynamicQR(url.value);
        }
      }, 500); // Debounce for 500ms

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

  // Create file bucket
  const createBucket = async () => {
    try {
      setIsCreatingBucket(true);
      haptics.medium();

      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/create-bucket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket_type: "file",
            style: "sunset", // Use current style
            is_reusable: true,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create bucket");
      }

      const data = await response.json();

      // Update URL to the bucket URL
      url.value = data.bucket_url;
      bucketUrl.value = data.bucket_url;

      // Store owner token securely for future uploads
      await saveOwnerToken("bucket", data.bucket_code, data.owner_token);

      // Success feedback
      haptics.success();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `✅ File Bucket created! Scan to upload/download files 🪣`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

      setIsCreatingBucket(false);
    } catch (error) {
      console.error("Create bucket error:", error);
      setIsCreatingBucket(false);
      haptics.error();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Failed to create bucket: ${
            error instanceof Error ? error.message : String(error)
          }`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
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

  const generateBatchZIP = async () => {
    try {
      const urls = batchUrls.split("\n").map((u) => u.trim()).filter((u) =>
        u.length > 0
      );

      if (urls.length === 0) {
        addToast("❌ No URLs provided!", 3000);
        return;
      }

      setIsGeneratingBatch(true);
      setBatchProgress(0);
      haptics.medium();

      const zip = new JSZip();
      const qrCode = new QRCodeStyling({
        width: 1000,
        height: 1000,
        type: "canvas",
        image: logoUrl.value || undefined,
        dotsOptions: {
          color: "#000000",
          type: "rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
        },
      });

      // Process each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        qrCode.update({ data: url });
        const blob = await qrCode.getRawData("png");
        if (blob) {
          // Create safe filename
          const safeName = url.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
          zip.file(`qr_${i + 1}_${safeName}.png`, blob);
        }

        // Update progress
        setBatchProgress(Math.round(((i + 1) / urls.length) * 100));
        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Generate ZIP
      const content = await zip.generateAsync({ type: "blob" });
      
      // Trigger download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "qrbuddy_batch.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      haptics.success();
      setIsGeneratingBatch(false);
      
      const event = new CustomEvent("show-toast", {
        detail: {
          message: `📦 Batch complete! Downloaded ${urls.length} QR codes.`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

    } catch (error) {
      console.error("Batch generation failed:", error);
      setIsGeneratingBatch(false);
      haptics.error();
      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Batch failed: ${error instanceof Error ? error.message : String(error)}`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
    }
  };

  const templateMeta = QR_TEMPLATES[selectedTemplate];

  return (
    <div class="w-full space-y-4">
      {/* minimal toolbar */}
      <div class="grid grid-cols-2 gap-3 text-sm w-full">
        <button
          type="button"
          onClick={() => {
            setIsTemplateModalOpen(true);
            haptics.light();
          }}
          class="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-blue-50 to-cyan-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-blue-100 hover:to-cyan-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold"
          title="URLs, WiFi, contacts, SMS, email templates"
        >
          <span class="text-lg group-hover:scale-110 transition-transform">
            {templateMeta.icon}
          </span>
          <span class="group-hover:text-blue-700">{templateMeta.label}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsExtrasModalOpen(true);
            setExtrasHasUpdates(false);
            haptics.light();
          }}
          class={`group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-3 border-black bg-gradient-to-br from-pink-50 to-purple-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:from-pink-100 hover:to-purple-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 font-bold ${
            extrasHasUpdates ? "animate-bounce" : ""
          }`}
          title="Dynamic links, File Buckets, logos, scan limits"
        >
          <span class="text-lg group-hover:scale-110 transition-transform">
            ✨
          </span>
          <span class="group-hover:text-pink-700">Power Ups</span>
          {extrasHasUpdates && (
            <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          )}
        </button>
      </div>

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
        <div class="space-y-3 animate-slide-down">
          {/* Toggle Sequential Mode */}
          <div class="flex items-center justify-between bg-white border-2 border-gray-200 rounded-xl p-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">⛓️</span>
              <div>
                <h4 class="font-bold text-sm text-gray-800">Sequential Mode</h4>
                <p class="text-xs text-gray-500">Redirect to different URLs in order</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSequential(!isSequential);
                haptics.light();
              }}
              class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isSequential ? "bg-purple-500" : "bg-gray-200"
              }`}
            >
              <span
                class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSequential ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Sequential URL Inputs */}
          {isSequential && (
            <div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  URL Sequence
                </label>
                <label class="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loopSequence}
                    onChange={(e) => setLoopSequence(e.currentTarget.checked)}
                    class="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  Loop Sequence 🔄
                </label>
              </div>
              
              {sequentialUrls.map((seqUrl, index) => (
                <div key={index} class="flex gap-2 items-center animate-slide-in-right" style={{ animationDelay: `${index * 50}ms` }}>
                  <span class="text-xs font-bold text-purple-400 w-4">{index + 1}.</span>
                  <input
                    type="url"
                    value={seqUrl}
                    onInput={(e) => {
                      const newUrls = [...sequentialUrls];
                      newUrls[index] = e.currentTarget.value;
                      setSequentialUrls(newUrls);
                      // Update main URL to first item for preview
                      if (index === 0) url.value = e.currentTarget.value;
                    }}
                    placeholder={`URL #${index + 1}`}
                    class="flex-1 px-3 py-2 text-sm border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  {sequentialUrls.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newUrls = sequentialUrls.filter((_, i) => i !== index);
                        setSequentialUrls(newUrls);
                        if (index === 0 && newUrls.length > 0) url.value = newUrls[0];
                      }}
                      class="text-red-400 hover:text-red-600 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSequentialUrls([...sequentialUrls, ""])}
                class="w-full py-2 text-sm font-bold text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors"
              >
                + Add Step
              </button>
            </div>
          )}
        </div>
      )}

      {/* Batch Mode Options */}
      {selectedTemplate === "url" && !isDynamic.value && !isDestructible.value && !isBucket.value && !isSequential && (
        <div class="space-y-3 animate-slide-down">
          {/* Toggle Batch Mode */}
          <div class="flex items-center justify-between bg-white border-2 border-gray-200 rounded-xl p-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">📦</span>
              <div>
                <h4 class="font-bold text-sm text-gray-800">Batch Mode</h4>
                <p class="text-xs text-gray-500">Generate multiple QRs at once</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                haptics.light();
              }}
              class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isBatchMode ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              <span
                class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isBatchMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Batch Input */}
          {isBatchMode && (
            <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3 animate-slide-down">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Paste URLs (One per line)
                </label>
                <span class="text-xs font-bold text-blue-500">
                  {batchUrls.split("\n").filter(u => u.trim()).length} URLs
                </span>
              </div>
              
              <textarea
                value={batchUrls}
                onInput={(e) => setBatchUrls(e.currentTarget.value)}
                placeholder={`https://example.com\nhttps://google.com\nhttps://bing.com`}
                rows={5}
                class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                disabled={isGeneratingBatch}
              />

              {isGeneratingBatch ? (
                <div class="space-y-2">
                  <div class="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                  <p class="text-center text-xs font-bold text-blue-600 animate-pulse">
                    Generating... {batchProgress}%
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={generateBatchZIP}
                  disabled={!batchUrls.trim()}
                  class="w-full py-3 text-sm font-black text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📦 Generate ZIP
                </button>
              )}
            </div>
          )}
        </div>
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
        <div class="mt-4 bg-gradient-to-r from-orange-50 to-red-50 border-3 border-orange-300 rounded-xl p-4 space-y-3 animate-slide-down shadow-chunky">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">💣</span>
            <h4 class="text-sm font-bold text-gray-700">File Upload Options</h4>
          </div>
          <p class="text-xs text-gray-600">
            Choose how many times your file can be downloaded before
            self-destructing
          </p>
          <div class="space-y-2">
            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Download Limit
            </label>
            <div class="flex gap-2 flex-wrap">
              {[1, 3, 5, 10, null].map((limit) => (
                <button
                  type="button"
                  key={limit?.toString() || "unlimited"}
                  onClick={() => {
                    maxDownloads.value = limit || 999999;
                    haptics.light();
                  }}
                  class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                    ${
                    maxDownloads.value === (limit || 999999)
                      ? "bg-orange-500 text-white border-orange-600 scale-105"
                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                  }`}
                >
                  {limit === null ? "∞" : limit}
                </button>
              ))}
            </div>
          </div>
        </div>
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
      />
    </div>
  );
}

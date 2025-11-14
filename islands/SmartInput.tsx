import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../types/qr-templates.ts";
import WiFiForm from "./templates/WiFiForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import EmailForm from "./templates/EmailForm.tsx";
import LogoUploader from "./LogoUploader.tsx";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const [isCreatingDynamic, setIsCreatingDynamic] = useState(false);

  // Bucket options
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);

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

  // Create dynamic QR code
  const createDynamicQR = async (destinationUrl: string) => {
    try {
      setIsCreatingDynamic(true);
      haptics.medium();

      // Construct API URL from SUPABASE_URL or use local dev API
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const apiUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1`
        : "http://localhost:8005";

      const body: Record<string, string | number> = {
        destination_url: destinationUrl,
      };
      if (scanLimit) body.max_scans = scanLimit;
      if (expiryDate) body.expires_at = new Date(expiryDate).toISOString();

      const response = await fetch(
        `${apiUrl}/create-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create dynamic QR");
      }

      const data = await response.json();

      // Update URL to the redirect URL
      url.value = data.redirect_url;
      editUrl.value = data.edit_url;

      // Store owner token in localStorage
      localStorage.setItem(`qr_${data.short_code}`, data.owner_token);

      // Success feedback
      haptics.success();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `✅ Dynamic QR created! You can edit this anytime 🔗`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

      setIsCreatingDynamic(false);
    } catch (error) {
      console.error("Create dynamic QR error:", error);
      setIsCreatingDynamic(false);
      haptics.error();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Failed to create dynamic QR: ${
            error instanceof Error ? error.message : String(error)
          }`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
    }
  };

  // Create file bucket
  const createBucket = async () => {
    try {
      setIsCreatingBucket(true);
      haptics.medium();

      // Construct API URL from SUPABASE_URL or use local dev API
      const supabaseUrl = (globalThis as any).__SUPABASE_URL__;
      const apiUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1`
        : "http://localhost:8005";

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

      // Store owner token in localStorage
      localStorage.setItem(`bucket_${data.bucket_code}`, data.owner_token);

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

  // File upload to Supabase
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

      // Construct API URL from SUPABASE_URL or use local dev API
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const apiUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1`
        : "http://localhost:8005";

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

  const templateMeta = QR_TEMPLATES[selectedTemplate];

  const renderTemplateForm = () => {
    if (selectedTemplate === "wifi") return <WiFiForm url={url} />;
    if (selectedTemplate === "vcard") return <VCardForm url={url} />;
    if (selectedTemplate === "sms") return <SMSForm url={url} />;
    if (selectedTemplate === "email") return <EmailForm url={url} />;
    if (selectedTemplate === "text") {
      return (
        <div class="space-y-4">
          <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">📝</span>
              <h3 class="font-black text-gray-900">Plain Text QR</h3>
            </div>
            <p class="text-sm text-gray-700">
              Any text content - perfect for notes, codes, or short messages.
            </p>
          </div>
          <textarea
            value={url.value}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={() => setTouched(true)}
            placeholder="Enter any text..."
            rows={4}
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-gray-500 focus:outline-none resize-none"
          />
        </div>
      );
    }
    return null;
  };

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
      {isTemplateModalOpen && (
        <div class="fixed inset-0 z-40 flex items-center justify-center px-4 py-4">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsTemplateModalOpen(false)}
          />
          <div class="relative z-10 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-up">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-gray-500 font-bold">
                  Quick templates
                </p>
                <p class="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                  One tap, done
                </p>
                <p class="text-xs sm:text-sm text-gray-600">
                  WiFi networks, contacts, emails—packaged and ready to scan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                class="text-2xl font-black text-gray-500 hover:text-gray-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Close template modal"
              >
                ×
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              {(Object.keys(QR_TEMPLATES) as QRTemplateType[]).map(
                (templateType) => {
                  const template = QR_TEMPLATES[templateType];
                  return (
                    <button
                      key={templateType}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(templateType);
                        haptics.light();
                        url.value = "";
                        isDestructible.value = false;
                        setTouched(false);
                        setValidationState("idle");
                        // DON'T close modal - keep it open!
                      }}
                      class={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all flex items-center gap-2
                      ${
                        selectedTemplate === templateType
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-600 scale-105 shadow-lg"
                          : "bg-white text-gray-700 border-gray-300 hover:border-pink-400 hover:scale-105"
                      }`}
                      title={template.description}
                    >
                      <span>{template.icon}</span>
                      {template.label}
                    </button>
                  );
                },
              )}
            </div>

            {/* Template form reveals IN the modal after selection */}
            <div class={selectedTemplate !== "url" ? "animate-slide-down" : ""}>
              {renderTemplateForm() ?? (
                <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">🔗</span>
                    <h3 class="font-black text-gray-900">Just using a plain link or text?</h3>
                  </div>
                  <p class="text-sm text-gray-700">
                    Paste it in the main input. Templates are for WiFi, contacts, messages, and other special QR tricks.
                  </p>
                </div>
              )}
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                class="px-4 py-2 rounded-xl border-2 border-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Magic Toolkit Modal */}
      {isExtrasModalOpen && (
        <div class="fixed inset-0 z-40 flex items-center justify-center px-4 py-4">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsExtrasModalOpen(false)}
          />
          <div class="relative z-10 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-up">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-pink-500 font-bold">
                  Advanced features
                </p>
                <p class="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                  Give your QR superpowers
                </p>
                <p class="text-xs sm:text-sm text-gray-600">
                  Editable links, file drops, custom logos—pick what this QR should do.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExtrasModalOpen(false)}
                class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Close power ups modal"
              >
                ×
              </button>
            </div>

            <div class="space-y-4">
              {/* Mutual Exclusion Notice */}
              {(isDynamic.value || isBucket.value) && (
                <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 text-xs text-gray-700 leading-relaxed animate-slide-down">
                  💡 <strong>Note:</strong> Editable link and file bucket are mutually exclusive—pick one per QR.
                </div>
              )}

              {/* Main Power-Up Cards */}
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    isDynamic.value = !isDynamic.value;
                    if (isDynamic.value) isBucket.value = false;
                    haptics.light();
                  }}
                  class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                    isDynamic.value
                      ? "bg-gradient-to-br from-pink-200 to-purple-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                      : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  }`}
                >
                  <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                    🔗
                  </div>
                  <div class="font-black text-sm text-gray-900">Editable link</div>
                  <div class="text-xs text-gray-600 leading-snug mt-1">
                    Print once, update forever. Perfect for menus, events, or merch.
                  </div>
                  {isDynamic.value && (
                    <div class="mt-2 flex items-center gap-1 text-xs font-bold text-pink-700">
                      <span>✓</span>
                      Active
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    isBucket.value = !isBucket.value;
                    if (isBucket.value) isDynamic.value = false;
                    haptics.light();
                  }}
                  class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                    isBucket.value
                      ? "bg-gradient-to-br from-blue-200 to-cyan-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                      : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  }`}
                >
                  <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                    🪣
                  </div>
                  <div class="font-black text-sm text-gray-900">
                    File drop zone
                  </div>
                  <div class="text-xs text-gray-600 leading-snug mt-1">
                    Reusable QR for file transfers. Great for photo booths, offices, or shared folders.
                  </div>
                  {isBucket.value && (
                    <div class="mt-2 flex items-center gap-1 text-xs font-bold text-blue-700">
                      <span>✓</span>
                      Active
                    </div>
                  )}
                </button>

                <details class="group">
                  <summary class="cursor-pointer list-none">
                    <div class="p-4 rounded-2xl border-3 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200">
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="text-3xl mb-2 inline-block">🎨</div>
                          <div class="font-black text-sm text-gray-900">Custom logo</div>
                          <div class="text-xs text-gray-600 leading-snug mt-1">
                            Add your brand to the QR center. Great for business cards, stickers, and branded merch.
                          </div>
                        </div>
                        <div class="text-xl text-gray-400 group-open:rotate-180 transition-transform ml-2">
                          ▼
                        </div>
                      </div>
                    </div>
                  </summary>
                  <div class="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-3 border-yellow-300 rounded-xl shadow-chunky animate-slide-down">
                    <LogoUploader logoUrl={logoUrl} />
                    <p class="text-xs text-gray-600 mt-3">
                      Square images work best. We'll center it for you.
                    </p>
                  </div>
                </details>
              </div>

              {isDynamic.value && (
                <div class="bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-300 rounded-xl p-4 space-y-3 shadow-chunky">
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Scan limit
                    </label>
                    <p class="text-xs text-gray-600">
                      How many scans before this link stops responding.
                    </p>
                    <div class="flex gap-2 flex-wrap">
                      {[1, 5, 10, 100, null].map((limit) => (
                        <button
                          type="button"
                          key={limit?.toString() || "unlimited"}
                          onClick={() => {
                            setScanLimit(limit);
                            haptics.light();
                          }}
                          class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                            scanLimit === limit
                              ? "bg-pink-500 text-white border-pink-600 scale-105"
                              : "bg-white text-gray-700 border-gray-300 hover:border-pink-400"
                          }`}
                        >
                          {limit === null ? "∞" : limit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Expiry date (optional)
                    </label>
                    <p class="text-xs text-gray-600">
                      Leave blank to keep this link alive.
                    </p>
                    <input
                      type="datetime-local"
                      value={expiryDate}
                      onChange={(e) => {
                        setExpiryDate((e.target as HTMLInputElement).value);
                        haptics.light();
                      }}
                      class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div class="bg-pink-100 border-2 border-pink-300 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                    💡 <strong>Set to 1 for a self-destruct QR.</strong>{" "}
                    Higher limits let you reuse and edit anytime. No tracking, ever.
                  </div>
                </div>
              )}

              {editUrl.value && (
                <div class="bg-gradient-to-r from-green-50 to-teal-50 border-3 border-green-400 rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">✨</span>
                    <p class="text-sm font-black text-green-900">
                      Editable QR created!
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      value={editUrl.value}
                      readOnly
                      class="flex-1 px-3 py-2 bg-white border-2 border-green-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(editUrl.value);
                        haptics.success();
                        const event = new CustomEvent("show-toast", {
                          detail: {
                            message: "Edit link copied! 📋",
                            type: "success",
                          },
                        });
                        globalThis.dispatchEvent(event);
                      }}
                      class="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p class="text-xs text-green-700">
                    Bookmark this link—you'll need it to edit your QR later.
                  </p>
                </div>
              )}

              {bucketUrl.value && (
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border-3 border-blue-400 rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🪣</span>
                    <p class="text-sm font-black text-blue-900">
                      File bucket ready!
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      value={bucketUrl.value}
                      readOnly
                      class="flex-1 px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bucketUrl.value);
                        haptics.success();
                        const event = new CustomEvent("show-toast", {
                          detail: {
                            message: "Bucket URL copied! 📋",
                            type: "success",
                          },
                        });
                        globalThis.dispatchEvent(event);
                      }}
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p class="text-xs text-blue-700">
                    Scan to upload/download files. Perfect for stickers or signs.
                  </p>
                </div>
              )}
            </div>

            <div class="flex justify-center">
              <button
                type="button"
                onClick={() => setIsExtrasModalOpen(false)}
                class="px-8 py-3 rounded-2xl border-3 border-black bg-gradient-to-br from-gray-900 to-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

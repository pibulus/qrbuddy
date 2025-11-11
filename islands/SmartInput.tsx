import { Signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../types/qr-templates.ts";
import WiFiForm from "./templates/WiFiForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import EmailForm from "./templates/EmailForm.tsx";

interface SmartInputProps {
  url: Signal<string>;
  isDestructible: Signal<boolean>;
  isDynamic: Signal<boolean>;
  editUrl: Signal<string>;
  maxDownloads: Signal<number>;
}

export default function SmartInput(
  { url, isDestructible, isDynamic, editUrl, maxDownloads }: SmartInputProps,
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
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateType>("url");

  // Dynamic QR options
  const [scanLimit, setScanLimit] = useState<number | null>(1); // Default to 1 (destructible)
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [isCreatingDynamic, setIsCreatingDynamic] = useState(false);

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
    if (isDynamic.value && url.value && !isCreatingDynamic && !editUrl.value) {
      // Only create if we have a URL and haven't created yet
      const timer = setTimeout(() => {
        if (validateURL(url.value)) {
          createDynamicQR(url.value);
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timer);
    }
  }, [isDynamic.value, url.value]);

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
      {/* Template Selector */}
      <div class="flex gap-2 flex-wrap">
        {(Object.keys(QR_TEMPLATES) as QRTemplateType[]).map((templateType) => {
          const template = QR_TEMPLATES[templateType];
          return (
            <button
              key={templateType}
              type="button"
              onClick={() => {
                setSelectedTemplate(templateType);
                haptics.light();
                // Reset state when switching templates
                url.value = "";
                isDestructible.value = false;
                setTouched(false);
                setValidationState("idle");
              }}
              class={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all
                ${
                selectedTemplate === templateType
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-600 scale-105 shadow-lg"
                  : "bg-white text-gray-700 border-gray-300 hover:border-pink-400 hover:scale-105"
              }`}
              title={template.description}
            >
              <span class="mr-1">{template.icon}</span>
              {template.label}
            </button>
          );
        })}
      </div>

      {/* Template Forms */}
      {selectedTemplate === "wifi" && <WiFiForm url={url} />}
      {selectedTemplate === "vcard" && <VCardForm url={url} />}
      {selectedTemplate === "sms" && <SMSForm url={url} />}
      {selectedTemplate === "email" && <EmailForm url={url} />}
      {selectedTemplate === "text" && (
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
      )}

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

      {/* File Upload Options - shown when URL template is active and not dynamic */}
      {selectedTemplate === "url" && !isDynamic.value && !isDestructible.value && !isUploading && (
        <div class="mt-4 bg-gradient-to-r from-orange-50 to-red-50 border-3 border-orange-300 rounded-xl p-4 space-y-3 animate-slide-down shadow-chunky">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">💣</span>
            <h4 class="text-sm font-bold text-gray-700">File Upload Options</h4>
          </div>
          <p class="text-xs text-gray-600">
            Choose how many times your file can be downloaded before self-destructing
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
          ⚠️ This file will self-destruct after {maxDownloads.value === 999999 ? "unlimited" : maxDownloads.value} {maxDownloads.value === 1 ? "scan" : "scans"}
        </p>
      )}

      {/* Upload progress text */}
      {isUploading && (
        <p class="text-purple-600 text-sm mt-2 text-center animate-pulse">
          Uploading... {uploadProgress}%
        </p>
      )}

      {/* Dynamic QR Options */}
      {!isDestructible.value && !isUploading && (
        <div class="mt-4 space-y-3">
          {/* Make this destructible/editable checkbox */}
          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isDynamic.value}
              onChange={(e) => {
                isDynamic.value = (e.target as HTMLInputElement).checked;
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer"
            />
            <span class="text-sm font-semibold text-gray-700 group-hover:text-pink-600 transition-colors">
              🔗 Make this editable (change URL later)
            </span>
          </label>

          {/* Options panel - shown when editable is enabled */}
          {isDynamic.value && (
            <div class="bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-300 rounded-xl p-4 space-y-3 animate-slide-down shadow-chunky">
              {/* Scan limit selector */}
              <div class="space-y-2">
                <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Scan Limit
                </label>
                <div class="flex gap-2 flex-wrap">
                  {[1, 5, 10, 100, null].map((limit) => (
                    <button
                      type="button"
                      key={limit?.toString() || "unlimited"}
                      onClick={() => {
                        setScanLimit(limit);
                        haptics.light();
                      }}
                      class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                        ${
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

              {/* Expiry date picker */}
              <div class="space-y-2">
                <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Expiry Date (Optional)
                </label>
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

              {/* Info text */}
              <p class="text-xs text-gray-600 leading-relaxed">
                💡 <strong>Scan limit = 1</strong>{" "}
                makes this a destructible QR (one scan, then KABOOM 💥).<br />
                Set higher limits or unlimited for editable QRs you can update
                anytime.<br />
                Works for both URLs and files. No tracking or analytics.
              </p>
            </div>
          )}

          {/* Edit link - shown after creation */}
          {editUrl.value && (
            <div class="bg-gradient-to-r from-green-50 to-teal-50 border-3 border-green-400 rounded-xl p-4 space-y-2 animate-slide-down shadow-chunky">
              <p class="text-sm font-semibold text-green-800">
                ✨ Dynamic QR Created!
              </p>
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
                Save this link to edit your QR anytime!
              </p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

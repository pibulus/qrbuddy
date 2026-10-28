import { Signal, useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";

import { useBatchGenerator } from "../hooks/useBatchGenerator.ts";
import {
  type CreateBucketOptions,
  useBucketCreator,
} from "../hooks/useBucketCreator.ts";
import { useDynamicQR } from "../hooks/useDynamicQR.ts";
import { useFileUpload } from "../hooks/useFileUpload.ts";
import { QRTemplateType } from "../types/qr-templates.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import {
  MAX_FILE_SIZE,
  SUPPORTER_MAX_FILE_SIZE,
  validateFile,
} from "../utils/file-validation.ts";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import { addToHistory, HistoryItem } from "../utils/history.ts";
import { decodeQRFromFile } from "../utils/qr-decode.ts";
import { getSupporterPass } from "../utils/supporter-pass.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import { looksLikeUrl } from "../utils/url.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import CreateModal from "../components/CreateModal.tsx";
import HistoryDrawer from "../components/HistoryDrawer.tsx";
import LibraryDrawer from "../components/LibraryDrawer.tsx";
import { addToast } from "./ToastManager.tsx";

// Sub-components
import QRReader from "../components/QRReader.tsx";
import SmartInputToolbar from "../components/smart-input/SmartInputToolbar.tsx";
import FileUploadOptions, {
  shareKindOf,
} from "../components/smart-input/FileUploadOptions.tsx";
import ShareReady, {
  type LastShare,
} from "../components/smart-input/ShareReady.tsx";
import { prepImages } from "../utils/image-prep.ts";
import { getQRThemeStyleVars, getQRThemeTokens } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";

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
  customStyle?: Signal<QRStyle | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  onModalStateChange?: (isOpen: boolean) => void;
  hidePrimaryInput?: boolean;
  lang?: Locale;
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
    customStyle,
    pngSize,
    frameConfig,
    onModalStateChange,
    hidePrimaryInput = false,
    lang,
  }: SmartInputProps,
) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const [validationState, setValidationState] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [touched, setTouched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[] | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [stagedDecoded, setStagedDecoded] = useState<string | null>(null);
  const [shareTitle, setShareTitle] = useState("");
  const [isPrepping, setIsPrepping] = useState(false);
  const selectionGeneration = useRef(0);
  const stagedUploadLock = useRef(false);
  // The last share that went live — drives the "it's alive" strip until the
  // QR moves on to something else.
  const [lastShare, setLastShare] = useState<LastShare | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // PWA "Quick QR" shortcut (manifest.json) lands on /?quick=true — jump
  // straight into typing.
  useEffect(() => {
    if (
      new URLSearchParams(globalThis.location?.search ?? "").has("quick")
    ) {
      textInputRef.current?.focus();
    }
  }, []);

  // Create sheet state
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplateType>(
    "url",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createHasUpdates, setCreateHasUpdates] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  // Snapshot of the original destination URL before wrapping it in an editable
  // short link, so switching back to Static restores the direct URL cleanly.
  const [staticSourceUrl, setStaticSourceUrl] = useState("");

  // Listen for open library / inspector requests & ?library=1 / ?inspect=1 query params
  useEffect(() => {
    const g = globalThis as typeof globalThis & {
      __qrbLibraryListener?: boolean;
      __qrbInspectorListener?: boolean;
    };
    g.__qrbLibraryListener = true;
    g.__qrbInspectorListener = true;

    const handleOpenLibrary = () => {
      setIsCreateModalOpen(false);
      setShowHistory(false);
      setShowReader(false);
      setShowLibrary(true);
    };
    const handleOpenInspector = () => {
      setIsCreateModalOpen(false);
      setShowHistory(false);
      setShowLibrary(false);
      setShowReader(true);
    };
    globalThis.addEventListener("qrb-open-library", handleOpenLibrary);
    globalThis.addEventListener("qrb-open-inspector", handleOpenInspector);

    const params = new URLSearchParams(globalThis.location?.search ?? "");
    let mutatedParams = false;
    if (params.has("library")) {
      handleOpenLibrary();
      params.delete("library");
      mutatedParams = true;
    } else if (
      params.has("inspect") || globalThis.location?.hash === "#inspect"
    ) {
      handleOpenInspector();
      params.delete("inspect");
      mutatedParams = true;
    }
    if (mutatedParams) {
      const qs = params.toString();
      const cleanHash = globalThis.location.hash === "#inspect"
        ? ""
        : globalThis.location.hash;
      const nextUrl = `${globalThis.location.pathname}${
        qs ? `?${qs}` : ""
      }${cleanHash}`;
      globalThis.history?.replaceState?.(null, "", nextUrl);
    }

    return () => {
      g.__qrbLibraryListener = false;
      g.__qrbInspectorListener = false;
      globalThis.removeEventListener("qrb-open-library", handleOpenLibrary);
      globalThis.removeEventListener("qrb-open-inspector", handleOpenInspector);
    };
  }, []);

  // Report modal state changes
  useEffect(() => {
    onModalStateChange?.(isCreateModalOpen);
  }, [isCreateModalOpen, onModalStateChange]);

  // Snapshot the QR content and style when the create sheet opens, so closing
  // it can acknowledge "your QR is ready" — but only when the sheet actually
  // changed something (repeat open/close stays quiet).
  const urlAtSheetOpen = useRef("");
  const styleAtSheetOpen = useRef("");
  const logoAtSheetOpen = useRef("");
  const frameAtSheetOpen = useRef("");
  useEffect(() => {
    if (isCreateModalOpen) {
      urlAtSheetOpen.current = url.value;
      styleAtSheetOpen.current = qrStyle.value;
      logoAtSheetOpen.current = logoUrl.value;
      frameAtSheetOpen.current = JSON.stringify(frameConfig?.value ?? null);
    }
  }, [isCreateModalOpen]);

  // Dynamic QR options
  const [scanLimit, setScanLimit] = useState<number | null>(null); // Default to null (unlimited)
  const [expiryDate, setExpiryDate] = useState<string>("");

  // Sequential QR options
  const [isSequential, setIsSequential] = useState(false);
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);
  const [randomSequence, setRandomSequence] = useState(false);
  const [dailySpins, setDailySpins] = useState<number | null>(null);

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
      brandName?: string;
      accentColor?: string;
      unbranded?: boolean;
    } | null
  >(null);

  const activeThemeTokens = getQRThemeTokens(qrStyle.value, customStyle?.value);
  const prevThemeAccentRef = useRef<string>(activeThemeTokens.accent);

  // Sync active QR theme CSS custom properties onto :root so modals, pills,
  // and CTAs stay bound to the chosen QR palette.
  useEffect(() => {
    const root = globalThis.document?.documentElement;
    if (root) {
      const vars = getQRThemeStyleVars(qrStyle.value, customStyle?.value);
      for (const [k, v] of Object.entries(vars)) {
        root.style.setProperty(k, v);
      }
    }
    const prevAccent = prevThemeAccentRef.current;
    const nextAccent = activeThemeTokens.accent;
    if (
      splashConfig.value &&
      (!splashConfig.value.accentColor ||
        splashConfig.value.accentColor.toLowerCase() ===
          prevAccent.toLowerCase())
    ) {
      splashConfig.value = {
        ...splashConfig.value,
        accentColor: nextAccent,
      };
    }
    prevThemeAccentRef.current = nextAccent;
  }, [qrStyle.value, customStyle?.value, activeThemeTokens.accent]);

  const effectiveSplashConfig = splashConfig.value
    ? {
      ...splashConfig.value,
      accentColor: splashConfig.value.accentColor || activeThemeTokens.accent,
    }
    : (isSequential && randomSequence)
    ? {
      enabled: true,
      title: isSpanish ? "Sorteo de Ruleta" : "Roulette Draw",
      buttonText: isSpanish ? "Abrir resultado" : "Open result",
      accentColor: activeThemeTokens.accent,
    }
    : null;

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
        ...(randomSequence ? { random: true } : {}),
        ...(randomSequence && dailySpins ? { dailySpins } : {}),
      }
      : undefined,
    splashConfig: effectiveSplashConfig,
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
      qrStyle,
      customStyle,
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

    addToast(
      isSpanish
        ? "Buzón desconectado. Pega un nuevo link para continuar."
        : "Locker disconnected. Drop a new link to continue.",
      3000,
    );
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
            isDynamic.value = false;
            editUrl.value = "";
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

  // Creating an editable QR writes a real server-side row, so it only happens
  // on an explicit button press (CreateModal → Options → "Create editable
  // link"). It used to auto-fire on a 1200ms debounce after toggling Editable,
  // which spent a short code before the user ever consented.
  const handleCreateEditable = () => {
    let targetUrl = url.value;
    if ((!targetUrl || !looksLikeUrl(targetUrl)) && isSequential) {
      const firstValidSeq = sequentialUrls.find((u) => looksLikeUrl(u));
      if (firstValidSeq) {
        targetUrl = firstValidSeq;
      }
    }

    if (
      targetUrl && !isCreatingDynamic && !editUrl.value && !isBucket.value &&
      !isCreatingBucket && looksLikeUrl(targetUrl)
    ) {
      setStaticSourceUrl(targetUrl);
      isDynamic.value = true;
      void createDynamicQR(targetUrl);
    } else if (targetUrl && !looksLikeUrl(targetUrl)) {
      addToast(
        isSpanish
          ? "Un QR editable necesita un link real — prueba con https://…"
          : "Editable needs a real link — try https://…",
        3000,
      );
    } else if (!targetUrl) {
      addToast(
        isSpanish
          ? "Agrega un link de destino primero"
          : "Add a destination link first",
        3000,
      );
    }
  };

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
    if (editUrl.value) {
      editUrl.value = "";
      isDynamic.value = false;
      setStaticSourceUrl("");
    }

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
  const stageFiles = (fileList: FileList | File[]) => {
    if (isUploading || stagedUploadLock.current) {
      addToast(
        isSpanish
          ? "Espera a que termine esta subida antes de elegir más archivos"
          : "Let this upload finish before choosing more files",
        3000,
      );
      return;
    }
    const files = Array.from(fileList);
    if (!files.length) return;
    const batchError = files.length > 10
      ? (isSpanish
        ? "Elige hasta 10 fotos o pistas de audio por envío."
        : "Choose up to 10 photos or audio tracks per share.")
      : files.length > 1 && files.some((f) => !/^(image|audio)\//.test(f.type))
      ? (isSpanish
        ? "Los envíos múltiples aceptan fotos y audio. Comparte otros archivos uno por uno."
        : "Multi-file shares support photos and audio. Share other files one at a time.")
      : files.length > 1 &&
          files.some((f) =>
            f.type.startsWith("audio/") && f.size > 5 * 1024 * 1024
          )
      ? (isSpanish
        ? "Las pistas de audio deben pesar 5 MB o menos en un mixtape."
        : "Audio tracks must be 5 MB or smaller in a multi-file share.")
      : null;
    if (batchError) {
      addToast(batchError, 4000);
      haptics.error();
      return;
    }
    // QRBuddy Passport lifts the single-file ceiling (R2-backed) — multi-file
    // slideshows stay on the Supabase path and its cap.
    const hasPass = Boolean(getSupporterPass());
    const maxSize = hasPass && files.length === 1
      ? SUPPORTER_MAX_FILE_SIZE
      : MAX_FILE_SIZE;
    for (const file of files) {
      const validation = validateFile(file, maxSize);
      if (!validation.valid) {
        if (
          !hasPass && files.length === 1 && file.size > MAX_FILE_SIZE &&
          file.size <= SUPPORTER_MAX_FILE_SIZE
        ) {
          addToast(
            isSpanish
              ? "📦 Archivo mayor a 50 MB — el Pasaporte QRBuddy desbloquea envíos de hasta 500 MB 🛂"
              : "📦 File over 50 MB — QRBuddy Passport unlocks 500 MB file drops 🛂",
            4500,
          );
        } else {
          addToast(`❌ ${validation.error}`, 4000);
        }
        haptics.error();
        return;
      }
    }
    const generation = ++selectionGeneration.current;
    setIsPrepping(false);
    maxDownloads.value = UNLIMITED_SCANS;
    setShareTitle("");
    setStagedFiles(files);
    setStagedDecoded(null);
    haptics.medium();

    // A slideshow of phone photos: downscale on the device so the per-file
    // cap never gets in the way (and iPhone HEIC comes out as JPEG). The
    // card shows immediately with the raw files; the prepped set swaps in.
    if (files.length > 1 && files.every((f) => f.type.startsWith("image/"))) {
      setIsPrepping(true);
      prepImages(files)
        .then((prepped) => {
          if (generation === selectionGeneration.current) {
            setStagedFiles(prepped);
          }
        })
        .catch(() => {
          // Prep is a courtesy — the raw files still go through validation.
        })
        .finally(() => {
          if (generation === selectionGeneration.current) setIsPrepping(false);
        });
    }

    // If a single dropped image is itself a QR code, quietly decode it and
    // offer to read it instead of sharing the image file.
    if (files.length === 1 && files[0].type.startsWith("image/")) {
      decodeQRFromFile(files[0])
        .then((data) => {
          if (data && generation === selectionGeneration.current) {
            setStagedDecoded(data);
          }
        })
        .catch(() => {
          // Not decodable — it's just a regular image, carry on.
        });
    }
  };

  const handleStagedConfirm = () => {
    if (!stagedFiles || isPrepping || isUploading || stagedUploadLock.current) {
      return;
    }
    stagedUploadLock.current = true;
    const files = stagedFiles;
    const kind = shareKindOf(files);
    const title = shareTitle.trim() ||
      (kind === "file"
        ? files[0].name
        : `${files.length} ${kind === "playlist" ? "tracks" : "photos"}`);
    void uploadFile(files, { title: shareTitle }).then((uploadedUrl) => {
      if (!uploadedUrl) return;

      selectionGeneration.current++;
      isDynamic.value = false;
      editUrl.value = "";
      isBucket.value = false;
      bucketUrl.value = "";
      setStagedFiles(null);
      setStagedDecoded(null);
      setShareTitle("");
      setLastShare({ url: uploadedUrl, kind, count: files.length, title });
    }).finally(() => {
      stagedUploadLock.current = false;
    });
  };

  const handleStagedCancel = () => {
    if (isUploading || stagedUploadLock.current) return;
    selectionGeneration.current++;
    setIsPrepping(false);
    setStagedFiles(null);
    setStagedDecoded(null);
    setShareTitle("");
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
    ? (isSpanish ? "Procesando..." : "Processing...")
    : (isSpanish ? "Subiendo..." : "Uploading...");

  const getInputClass = () => {
    const hasValidBadge = touched && validationState === "valid" &&
      !isUploading;
    const rightPadding = hasValidBadge ? "pr-20" : "pr-14";
    const baseClass = `
      w-full pl-5 ${rightPadding} py-4 text-lg
      bg-white border-3 border-black
      rounded-xl shadow-chunky
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
    if (item.type === "media") {
      globalThis.location.href = item.content;
      return;
    }

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

    if (item.type === "file") {
      globalThis.location.href = item.content;
      return;
    }

    if (item.metadata?.shortCode) {
      const shortCode = item.metadata.shortCode;
      getOwnerToken("qr", shortCode).then((token) => {
        if (token) {
          globalThis.location.href = `/edit?token=${token}`;
        } else {
          addToast(
            isSpanish
              ? "La llave de edición no está en este dispositivo. Usa tu respaldo o tu link guardado."
              : "Edit key isn't on this device. Use your backup or the saved edit link.",
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
    } else {
      url.value = item.content;
      setTouched(true);
    }
    setShowHistory(false);
    setShowLibrary(false);
  };

  // Effect to save to history when a QR is successfully generated/updated
  useEffect(() => {
    if (isBucket.value && bucketUrl.value && url.value && !isCreatingBucket) {
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
    bucketUrl.value,
    url.value,
    isCreatingBucket,
    isBucket.value,
  ]);

  return (
    <div class="w-full space-y-4">
      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
        lang={locale}
      />

      <LibraryDrawer
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleHistorySelect}
        lang={locale}
      />

      {/* QR Reader - decode images, screenshots, or camera */}
      <QRReader
        isOpen={showReader}
        onClose={() => {
          setShowReader(false);
          setStagedDecoded(null);
        }}
        url={url}
        initialResult={stagedDecoded}
        lang={locale}
      />

      {/* Create Modal - Rendered here for mobile layout flow */}
      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          const contentChanged = url.value.trim() !== "" &&
            url.value !== urlAtSheetOpen.current;
          const designChanged = qrStyle.value !== styleAtSheetOpen.current ||
            logoUrl.value !== logoAtSheetOpen.current ||
            JSON.stringify(frameConfig?.value ?? null) !==
              frameAtSheetOpen.current;
          // Bridge the "kicked back to the main page" moment: if the sheet
          // changed the QR, say so and point at the save pill.
          if (contentChanged) {
            haptics.success();
            sounds.success();
            addToast(
              isSpanish
                ? "QR listo — toca ↓ Guardar PNG para descargarlo"
                : "QR ready — tap ↓ Save PNG to keep it",
            );
          } else if (designChanged) {
            haptics.light();
            sounds.click();
          }
        }}
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
        randomSequence={randomSequence}
        setRandomSequence={setRandomSequence}
        dailySpins={dailySpins}
        setDailySpins={setDailySpins}
        batchUrls={batchUrls}
        setBatchUrls={setBatchUrls}
        isGeneratingBatch={isGeneratingBatch}
        batchProgress={batchProgress}
        onGenerateBatch={generateBatchZIP}
        onLockerConfirm={handleLockerConfirm}
        onLockerDisable={handleLockerDisable}
        onTextCardConfirm={handleTextCardConfirm}
        isCreatingLocker={isCreatingBucket}
        onCreateEditable={handleCreateEditable}
        isCreatingEditable={isCreatingDynamic}
        splashConfig={splashConfig}
        frameConfig={frameConfig}
        customStyle={customStyle}
        pngSize={pngSize}
        onStageMedia={stageFiles}
        lang={locale}
      />

      <div class="relative group">
        {/* Hidden file input (always mounted so toolbar/dropzone can trigger it) */}
        <input
          ref={fileInputRef}
          type="file"
          class="hidden"
          onChange={handleFileInputChange}
          accept="*/*"
          multiple
        />

        {/* URL/File Input - Hidden while staging files or when a vertical quick-builder owns the primary input */}
        {!stagedFiles && !hidePrimaryInput && (
          <div
            class="relative"
            data-dropzone="true"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={textInputRef}
              type="text"
              value={url.value}
              onInput={handleInput}
              onFocus={handleFocus}
              onBlur={() => setTouched(true)}
              placeholder={isDragging
                ? (isSpanish
                  ? "Suelta tu archivo aquí..."
                  : "Drop file here...")
                : (isSpanish
                  ? "Pega un link, escribe algo o suelta un archivo..."
                  : "Enter URL, text, or drop a file...")}
              aria-label={isSpanish
                ? "Link, texto o archivo para codificar en QR"
                : "URL, text, or file to encode in QR code"}
              aria-invalid={validationState === "invalid"}
              aria-describedby={validationState === "invalid"
                ? "input-error"
                : undefined}
              class={getInputClass()}
              disabled={isUploading}
            />

            {/* File upload button */}
            {!isUploading && !isDestructible.value && (
              <button
                type="button"
                onClick={handleFileInputClick}
                class="absolute right-3 top-1/2 transform -translate-y-1/2
                     w-11 h-11 flex items-center justify-center rounded-lg
                     text-2xl hover:bg-gray-100 hover:scale-110 transition-all"
                aria-label={isSpanish ? "Subir archivo" : "Upload file"}
                title={isSpanish ? "Subir archivo" : "Upload file"}
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
        {touched && validationState === "invalid" && url.value.trim() !== "" &&
          (
            <p
              id="input-error"
              class="text-red-600 text-sm mt-2 text-center animate-slide-down"
              role="alert"
            >
              {isSpanish
                ? "Pega un link, escribe algo o suelta un archivo"
                : "Enter any text, URL, or drop a file"}
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
          <>
            {stagedDecoded && (
              <button
                type="button"
                onClick={() => {
                  // Preserve decoded data for the reader, but invalidate pending prep.
                  if (isUploading || stagedUploadLock.current) return;
                  selectionGeneration.current++;
                  setStagedFiles(null);
                  maxDownloads.value = UNLIMITED_SCANS;
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  setShowReader(true);
                  haptics.medium();
                }}
                class="w-full mt-4 min-h-[48px] rounded-xl border-3 border-purple-400 bg-purple-50 px-4 py-3 text-sm font-black text-purple-800 shadow-chunky hover:-translate-y-0.5 transition animate-slide-down"
              >
                {isSpanish
                  ? "🔍 Esta imagen es un código QR — leerlo en su lugar"
                  : "🔍 This image is a QR code — read it instead"}
              </button>
            )}
            <FileUploadOptions
              files={stagedFiles}
              maxDownloads={maxDownloads}
              isUploading={isUploading}
              isPrepping={isPrepping}
              title={shareTitle}
              setTitle={setShareTitle}
              onConfirm={handleStagedConfirm}
              onCancel={handleStagedCancel}
              onReorderFiles={(newFiles) => setStagedFiles(newFiles)}
              lang={locale}
            />
          </>
        )}

        {/* It's alive: open it, copy it, sticker it */}
        {lastShare && !stagedFiles && !isUploading &&
          url.value === lastShare.url && (
          <ShareReady
            share={lastShare}
            frameConfig={frameConfig}
            onUpdateUrl={(nextUrl) => {
              url.value = nextUrl;
              setLastShare((prev) => prev ? { ...prev, url: nextUrl } : null);
            }}
            lang={locale}
          />
        )}

        {/* In-flow Link Mode Bar (OwnQR 80% conversion pattern): Static vs Editable */}
        {!stagedFiles && !isUploading && !isBucket.value &&
          !isDestructible.value &&
          !(lastShare && url.value === lastShare.url) &&
          (looksLikeUrl(url.value) || Boolean(editUrl.value)) && (
          <div class="mt-2.5 space-y-2 animate-slide-down">
            <div
              role="group"
              aria-label={isSpanish ? "Modo de enlace QR" : "QR link mode"}
              class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border-2 border-black bg-[#fbf1e4] shadow-chunky"
            >
              <button
                type="button"
                aria-pressed={!editUrl.value && !isCreatingDynamic}
                onClick={() => {
                  if (editUrl.value) {
                    if (staticSourceUrl) {
                      url.value = staticSourceUrl;
                    }
                    editUrl.value = "";
                    isDynamic.value = false;
                    haptics.light();
                  }
                }}
                class={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  !editUrl.value && !isCreatingDynamic
                    ? "bg-[#1e1714] text-[#fffef7] shadow-sm"
                    : "text-neutral-700 hover:bg-amber-100/80"
                }`}
              >
                <span>
                  {isSpanish
                    ? "🔒 Estático · Gratis siempre"
                    : "🔒 Static · Free forever"}
                </span>
              </button>

              <button
                type="button"
                disabled={isCreatingDynamic}
                aria-pressed={Boolean(editUrl.value) || isCreatingDynamic}
                onClick={() => {
                  if (!editUrl.value && !isCreatingDynamic) {
                    handleCreateEditable();
                  }
                }}
                class={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  editUrl.value || isCreatingDynamic
                    ? "bg-[#9370DB] text-[#fffef7] border border-black shadow-sm"
                    : "text-purple-900 bg-purple-100/70 hover:bg-purple-200/80"
                }`}
              >
                <span>
                  {isCreatingDynamic
                    ? (isSpanish
                      ? "Creando link editable…"
                      : "Creating editable link…")
                    : editUrl.value
                    ? (isSpanish
                      ? "⚡ Editable + Analíticas ✓"
                      : "⚡ Editable + Scan Stats ✓")
                    : (isSpanish
                      ? "⚡ Editable tras imprimir + Stats"
                      : "⚡ Editable after print + Stats")}
                </span>
              </button>
            </div>

            {!editUrl.value && !isCreatingDynamic && (
              <p class="text-[11px] font-bold text-[#57524b] text-center px-2">
                {isSpanish
                  ? "Estático fija el link en la tinta · Editable cambia el destino tras imprimir (5 gratis)"
                  : "Static locks the URL into the ink · Editable repoints after printing (5 free)"}
              </p>
            )}

            {editUrl.value && (
              <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-black bg-[#fffef7] text-xs font-bold text-[#1e1714] shadow-sm">
                <span class="truncate">
                  {isSpanish
                    ? "QR editable activo — cambia el destino cuando quieras"
                    : "Editable QR active — repoint destination anytime"}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(editUrl.value);
                        haptics.success();
                        addToast(
                          isSpanish
                            ? "Link de edición copiado"
                            : "Edit link copied",
                        );
                      } catch {
                        haptics.error();
                      }
                    }}
                    class="px-2.5 py-1 rounded-lg border border-black bg-[#fbf1e4] hover:bg-amber-100 font-black transition-colors"
                  >
                    {isSpanish ? "Copiar llave" : "Copy edit key"}
                  </button>
                  <a
                    href={editUrl.value}
                    class="px-2.5 py-1 rounded-lg border border-black bg-[#9370DB] text-[#fffef7] hover:bg-[#6B46A8] font-black transition-colors"
                  >
                    {isSpanish ? "Panel ↗" : "Manage ↗"}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editable mode needs a URL — plain text stays a static QR */}
        {isDynamic.value && !editUrl.value && !isBucket.value &&
          url.value.trim() !== "" && !looksLikeUrl(url.value) && (
          <p class="text-purple-700 text-xs mt-2 text-center animate-slide-down">
            {isSpanish
              ? "Los QRs editables necesitan un link. Este texto crea un QR estático — para alojar una nota, usa Personalizar → Texto."
              : "Editable QRs need a link. This text makes a static QR — for a hosted note, use Customize → Plain text."}
          </p>
        )}

        {/* Destructible indicator */}
        {isDestructible.value && !isUploading && !stagedFiles &&
          maxDownloads.value !== UNLIMITED_SCANS && (
          <p class="text-orange-700 text-sm mt-2 text-center font-semibold animate-slide-down">
            💣 {isSpanish
              ? `Este archivo se autodestruirá después de ${maxDownloads.value} ${
                maxDownloads.value === 1 ? "descarga" : "descargas"
              }`
              : `This file will self-destruct after ${maxDownloads.value} ${
                maxDownloads.value === 1 ? "download" : "downloads"
              }`}
          </p>
        )}

        {/* Upload progress text */}
        {isUploading && (
          <p class="text-purple-600 text-sm mt-2 text-center animate-pulse">
            {uploadStatusText} {uploadProgress}%
          </p>
        )}
      </div>

      {/* Toolbar - Below input so users enter data first, then customize */}
      <SmartInputToolbar
        selectedTemplate={selectedTemplate}
        setIsCreateModalOpen={setIsCreateModalOpen}
        setCreateHasUpdates={setCreateHasUpdates}
        createHasUpdates={createHasUpdates}
        onShowHistory={() => setShowHistory(true)}
        onShowReader={() => setShowReader(true)}
        isBucket={isBucket.value && bucketUrl.value !== ""}
        isBatchMode={isBatchMode}
        lang={locale}
      />
    </div>
  );
}

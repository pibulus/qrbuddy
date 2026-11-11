import { type Signal, useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";

import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import {
  extractShortCodeFromRedirectUrl,
  hydrateBehaviorStateFromConfig,
  type SavedDynamicQRConfig,
} from "../hooks/useDynamicQR.ts";
import { QR_TEMPLATES, QRTemplateType } from "../types/qr-templates.ts";
import type { QRStyle } from "../types/qr-types.ts";
import { haptics } from "../utils/haptics.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { getQRThemeStyleVars, getQRThemeTokens } from "../utils/qr-styles.ts";
import { sounds } from "../utils/sounds.ts";
import { looksLikeUrl } from "../utils/url.ts";
import ChoiceRow from "./create-modal/ChoiceRow.tsx";
import CompletionState, {
  type CompletionKind,
} from "./create-modal/CompletionState.tsx";
import DesignTab from "./create-modal/DesignTab.tsx";
import DesignPreview from "./create-modal/DesignPreview.tsx";
import BatchSettings from "./extras/BatchSettings.tsx";
import EditableLinkSettings from "./extras/EditableLinkSettings.tsx";
import LockerSettings from "./extras/LockerSettings.tsx";
import MultiLinkSettings from "./extras/MultiLinkSettings.tsx";
import SplashSettings from "./extras/SplashSettings.tsx";
import TimeBombSettings from "./extras/TimeBombSettings.tsx";
import { useModalShell } from "./modal/useModalShell.ts";
import EmailForm from "./templates/EmailForm.tsx";
import MediaHubForm from "./templates/MediaHubForm.tsx";
import PhoneForm from "./templates/PhoneForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import SocialHubForm from "./templates/SocialHubForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import WebsiteForm from "./templates/WebsiteForm.tsx";
import WiFiForm from "./templates/WiFiForm.tsx";
import { addToast } from "../islands/ToastManager.tsx";

export type ActiveTab = "type" | "options" | "design";

// The sheet header names the open tab so the title explains the screen —
// one plain sentence of what, one of the choices on it.
const SHEET_HEADINGS: Record<
  ActiveTab,
  Record<"en" | "es", { title: string; sub: string }>
> = {
  type: {
    en: {
      title: "What the QR holds.",
      sub: "Link, Wi-Fi, contact card, file, text…",
    },
    es: {
      title: "Qué lleva el QR.",
      sub: "Enlace, Wi-Fi, contacto, archivo, texto…",
    },
  },
  options: {
    en: {
      title: "How the QR behaves.",
      sub: "Editable link, scan limits, roulette, cover page.",
    },
    es: {
      title: "Cómo se comporta el QR.",
      sub: "Link editable, límites, ruleta, portada.",
    },
  },
  design: {
    en: {
      title: "How the QR looks.",
      sub: "Palette, logo, print frame, dot shapes.",
    },
    es: {
      title: "Cómo se ve el QR.",
      sub: "Paleta, logo, marco, forma de los puntos.",
    },
  },
};
type TypeIntent = "qr" | "share-file" | "collect-files";
type ContentStep = "pick" | "fill";

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tab to land on when the sheet opens; the home row's Design button
   * jumps straight to Design, everything else starts at Content. */
  initialTab?: ActiveTab;
  /** Fires when the open sheet changes tab, so the stage trigger can latch. */
  onTabChange?: (tab: ActiveTab) => void;
  /** Opens the scanner (Inspect lives here, off the front page). */
  onInspect?: () => void;
  onShowHistory?: () => void;
  selectedTemplate: QRTemplateType;
  onSelectTemplate: (template: QRTemplateType) => void;
  url: Signal<string>;
  isDynamic: Signal<boolean>;
  isBucket: Signal<boolean>;
  editUrl: Signal<string>;
  bucketUrl: Signal<string>;
  logoUrl: Signal<string>;
  qrStyle: Signal<string>;
  scanLimit: number | null;
  setScanLimit: (limit: number | null) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
  isBatchMode: boolean;
  setIsBatchMode: (isBatch: boolean) => void;
  isSequential: boolean;
  setIsSequential: (isSeq: boolean) => void;
  sequentialUrls: string[];
  setSequentialUrls: (urls: string[]) => void;
  loopSequence: boolean;
  setLoopSequence: (loop: boolean) => void;
  randomSequence?: boolean;
  setRandomSequence?: (random: boolean) => void;
  dailySpins?: number | null;
  setDailySpins?: (spins: number | null) => void;
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: (format?: "png" | "svg" | "both") => void;
  onLockerConfirm: (options: CreateBucketOptions) => Promise<boolean>;
  onLockerDisable: () => void;
  onTextCardConfirm: (text: string) => Promise<boolean>;
  isCreatingLocker: boolean;
  onCreateEditable: () => void;
  onDisableEditable?: () => void;
  isCreatingEditable: boolean;
  isUpdatingEditable?: boolean;
  savedDynamicConfig?: SavedDynamicQRConfig | null;
  isDynamicActive?: boolean;
  setIsDynamicActive?: (active: boolean) => void;
  onHydrateEditable?: () => Promise<SavedDynamicQRConfig | null>;
  onUpdateEditable?: () => Promise<
    { ok: true } | { ok: false; error: string }
  >;
  splashConfig: Signal<
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
  >;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  customStyle?: Signal<QRStyle | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
  onStageMedia?: (files: File[]) => void;
  lang?: Locale;
}

const CONTACT_TYPES: QRTemplateType[] = ["phone", "sms", "email"];
const CONTACT_HUB_TYPES: QRTemplateType[] = [
  "vcard",
  "social",
  "phone",
  "sms",
  "email",
];
const WEB_NOTE_TYPES: QRTemplateType[] = ["url", "text"];

const CONTACT_SEGMENTS: {
  key: QRTemplateType;
  label: string;
  labelEs: string;
  icon: string;
}[] = [
  { key: "phone", label: "Call", labelEs: "Llamar", icon: "📞" },
  { key: "sms", label: "Text", labelEs: "SMS", icon: "💬" },
  { key: "email", label: "Email", labelEs: "Correo", icon: "✉️" },
];

const QR_TYPE_COPY: Partial<
  Record<
    QRTemplateType,
    {
      label: string;
      labelEs: string;
      description: string;
      descriptionEs: string;
    }
  >
> = {
  url: {
    label: "Link",
    labelEs: "Enlace o Texto",
    description: "Website or page.",
    descriptionEs: "Página web o link directo.",
  },
  text: {
    label: "Plain text",
    labelEs: "Nota de Texto",
    description: "Note, code, or secret.",
    descriptionEs: "Nota, código o mensaje secreto.",
  },
  wifi: {
    label: "WiFi",
    labelEs: "Red Wi-Fi",
    description: "Join without typing the password.",
    descriptionEs: "Conéctate sin escribir la contraseña.",
  },
  vcard: {
    label: "Contact card",
    labelEs: "Tarjeta de Contacto",
    description: "One scan saves straight to contacts.",
    descriptionEs: "Un escaneo guarda el contacto directo.",
  },
  social: {
    label: "Social profile",
    labelEs: "Perfil Social",
    description: "Bio links, Instagram, YouTube & more.",
    descriptionEs: "Links en bio, Instagram, YouTube y más.",
  },
  sms: {
    label: "Text message",
    labelEs: "Mensaje SMS",
    description: "Open a pre-filled SMS.",
    descriptionEs: "Abre un SMS listo para enviar.",
  },
  email: {
    label: "Email",
    labelEs: "Correo",
    description: "Open a pre-filled email.",
    descriptionEs: "Abre un correo listo para enviar.",
  },
  phone: {
    label: "Phone call",
    labelEs: "Llamada",
    description: "Dial a number straight from the scan.",
    descriptionEs: "Marca un número directo al escanear.",
  },
};

export default function CreateModal({
  isOpen,
  onClose,
  initialTab = "type",
  onTabChange,
  onInspect,
  onShowHistory,
  selectedTemplate,
  onSelectTemplate,
  url,
  isDynamic,
  isBucket,
  editUrl,
  bucketUrl,
  logoUrl,
  qrStyle,
  scanLimit,
  setScanLimit,
  expiryDate,
  setExpiryDate,
  isBatchMode,
  setIsBatchMode,
  isSequential,
  setIsSequential,
  sequentialUrls,
  setSequentialUrls,
  loopSequence,
  setLoopSequence,
  randomSequence,
  setRandomSequence,
  dailySpins,
  setDailySpins,
  batchUrls,
  setBatchUrls,
  isGeneratingBatch,
  batchProgress,
  onGenerateBatch,
  onLockerConfirm,
  onLockerDisable,
  onTextCardConfirm,
  isCreatingLocker,
  onCreateEditable,
  onDisableEditable,
  isCreatingEditable,
  isUpdatingEditable = false,
  savedDynamicConfig = null,
  isDynamicActive = true,
  setIsDynamicActive,
  onHydrateEditable,
  onUpdateEditable,
  splashConfig,
  frameConfig,
  customStyle,
  pngSize,
  onStageMedia,
  lang,
}: CreateModalProps) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const fillStageRef = useRef<HTMLDivElement>(null);

  const scrollBodyToTop = () => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  };

  const handlePhotoSelect = () => {
    photoInputRef.current?.click();
    haptics.light();
    sounds.click();
  };

  const handleAudioSelect = () => {
    audioInputRef.current?.click();
    haptics.light();
    sounds.click();
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("type");
  const [typeIntent, setTypeIntent] = useState<TypeIntent>("qr");
  const [contentStep, setContentStep] = useState<ContentStep>("pick");
  const [completionKind, setCompletionKind] = useState<CompletionKind | null>(
    null,
  );
  const completionDownload = useSignal(false);
  const [_showLockerSettings, setShowLockerSettings] = useState(false);
  const [isLimitSettingsOpen, setIsLimitSettingsOpen] = useState(false);
  const [expandedBehavior, setExpandedBehavior] = useState<
    "roulette" | "splash" | "limits" | "none" | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingDynamic, setIsSavingDynamic] = useState(false);
  const busySavingDynamic = isUpdatingEditable || isSavingDynamic;

  const lockerActive = isBucket.value && bucketUrl.value !== "";
  const splashActive = splashConfig.value?.enabled ?? false;

  useEffect(() => {
    if (scanLimit !== null || expiryDate !== "") {
      setIsLimitSettingsOpen(true);
    }
  }, [scanLimit, expiryDate]);

  useEffect(() => {
    setSaveError(null);
  }, [
    isSequential,
    sequentialUrls,
    loopSequence,
    randomSequence,
    dailySpins,
    splashConfig.value,
    scanLimit,
    expiryDate,
    isDynamicActive,
    url.value,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setTypeIntent("qr");
      setContentStep("pick");
      setCompletionKind(null);
      setShowLockerSettings(false);
      setSaveError(null);
      setIsSavingDynamic(false);
    } else {
      setActiveTab(initialTab);
      setSaveError(null);
      if (isDynamic.value && editUrl.value) {
        if (savedDynamicConfig) {
          const hydrated = hydrateBehaviorStateFromConfig(savedDynamicConfig);
          setIsLimitSettingsOpen(
            hydrated.scanLimit !== null || hydrated.expiryDate !== "",
          );
        }
        void onHydrateEditable?.().then((cfg) => {
          if (cfg) {
            const hydrated = hydrateBehaviorStateFromConfig(cfg);
            setIsLimitSettingsOpen(
              hydrated.scanLimit !== null || hydrated.expiryDate !== "",
            );
          }
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) onTabChange?.(activeTab);
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen || activeTab !== "type" || contentStep !== "fill") return;
    const timer = setTimeout(() => {
      const firstInput = fillStageRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]), textarea',
      );
      firstInput?.focus();
    }, 40);
    return () => clearTimeout(timer);
  }, [
    isOpen,
    activeTab,
    contentStep,
    selectedTemplate,
    typeIntent,
    isBatchMode,
  ]);

  // Dialog behaviour (Escape, scroll-lock, focus trap, backdrop click) lives
  // in the shared modal shell.
  const shell = useModalShell({ open: isOpen, onClose });

  useEffect(() => {
    if (completionKind && !bucketUrl.value) {
      setCompletionKind(null);
    }
  }, [completionKind, bucketUrl.value]);

  if (!shell.mounted) return null;

  const activateDynamicBase = (mintIfReady = false) => {
    isDynamic.value = true;
    isBucket.value = false;
    bucketUrl.value = "";
    setIsBatchMode(false);
    setShowLockerSettings(false);
    if (
      mintIfReady &&
      !editUrl.value &&
      !isCreatingEditable &&
      url.value.trim() !== ""
    ) {
      onCreateEditable();
    }
  };

  const disableDynamicBase = () => {
    const hadExtras = isSequential || scanLimit !== null || expiryDate !== "" ||
      (splashConfig.value?.enabled ?? false) || !isDynamicActive;
    isDynamic.value = false;
    editUrl.value = "";
    onDisableEditable?.();
    setIsSequential(false);
    setIsLimitSettingsOpen(false);
    setScanLimit(null);
    setExpiryDate("");
    setIsDynamicActive?.(true);
    setSaveError(null);
    splashConfig.value = null;
    if (hadExtras) {
      addToast(
        isSpanish ? "Extras editables desactivados" : "Editable extras cleared",
      );
    }
  };

  const handleTemplateSelect = (template: QRTemplateType) => {
    if (selectedTemplate !== template) {
      url.value = "";
    }
    setTypeIntent("qr");
    setIsBatchMode(false);
    setShowLockerSettings(false);
    onSelectTemplate(template);
    setContentStep("fill");
    scrollBodyToTop();
    haptics.medium();
  };

  const handleShareFileSelect = () => {
    disableDynamicBase();
    setTypeIntent("share-file");
    setCompletionKind(null);
    setIsBatchMode(false);
    setShowLockerSettings(false);
    setContentStep("fill");
    scrollBodyToTop();
    haptics.medium();
  };

  const handleCollectFilesSelect = () => {
    disableDynamicBase();
    setTypeIntent("collect-files");
    setCompletionKind(null);
    setShowLockerSettings(true);
    setIsBatchMode(false);
    setContentStep("fill");
    scrollBodyToTop();
    haptics.medium();
  };

  const handleBulkCreateSelect = () => {
    if (lockerActive) {
      addToast(
        isSpanish
          ? "Buzón desconectado de este QR"
          : "Locker cleared from this QR",
      );
    }
    disableDynamicBase();
    setTypeIntent("qr");
    setShowLockerSettings(false);
    setIsBatchMode(true);
    isBucket.value = false;
    bucketUrl.value = "";
    setContentStep("fill");
    scrollBodyToTop();
    haptics.medium();
  };

  const handleLockerConfirmWrapper = async (options: CreateBucketOptions) => {
    const success = await onLockerConfirm(options);
    if (success) {
      setShowLockerSettings(false);
      setIsLimitSettingsOpen(false);
      setScanLimit(null);
      setExpiryDate("");
      splashConfig.value = null;
      setTypeIntent("collect-files");
      setCompletionKind("collect-files");
      setActiveTab("type");
      void handleCopyResult(
        isSpanish ? "¡Link copiado! 📋" : "Share link copied! 📋",
        false,
      );
    }
    return success;
  };

  const handleLockerDisableWrapper = () => {
    onLockerDisable();
    setCompletionKind(null);
    setShowLockerSettings(false);
  };

  const handleTextCardConfirm = async () => {
    const success = await onTextCardConfirm(url.value);
    if (success) {
      setTypeIntent("qr");
      setCompletionKind("text-card");
      setActiveTab("type");
      void handleCopyResult(
        isSpanish ? "¡Link de nota copiado! 📋" : "Text card link copied! 📋",
        false,
      );
    }
  };

  async function handleCopyResult(
    message = isSpanish ? "¡Link copiado! 📋" : "Link copied! 📋",
    showFailure = true,
  ) {
    const resultUrl = bucketUrl.value;
    if (!resultUrl) return;

    try {
      await navigator.clipboard.writeText(resultUrl);
      addToast(message);
      haptics.copy();
    } catch (error) {
      console.error("Copy result link failed:", error);
      if (showFailure) {
        addToast(
          isSpanish ? "No se pudo copiar el link" : "Couldn't copy link",
          3000,
        );
      }
      haptics.error();
    }
  }

  const handleShareResult = async () => {
    const resultUrl = bucketUrl.value;
    if (!resultUrl) return;

    const isFilePage = completionKind === "share-file";
    const isTextCard = completionKind === "text-card";
    const title = isTextCard
      ? (isSpanish ? "Nota en QRBuddy" : "QRBuddy text card")
      : isFilePage
      ? (isSpanish ? "Página de descarga en QRBuddy" : "QRBuddy download page")
      : (isSpanish ? "Buzón de archivos en QRBuddy" : "QRBuddy file locker");
    const text = isTextCard
      ? (isSpanish ? "Lee esta nota en QRBuddy." : "Read this note on QRBuddy.")
      : isFilePage
      ? (isSpanish
        ? "Descarga este archivo desde QRBuddy."
        : "Download this file from QRBuddy.")
      : (isSpanish
        ? "Sube archivos a este buzón de QRBuddy."
        : "Upload to this QRBuddy file locker.");

    if (typeof navigator === "undefined" || !navigator.share) {
      await handleCopyResult(
        isSpanish ? "¡Link copiado! 📋" : "Share link copied! 📋",
      );
      return;
    }

    try {
      await navigator.share({ title, text, url: resultUrl });
      haptics.medium();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Native share failed:", error);
      await handleCopyResult(
        isSpanish ? "¡Link copiado! 📋" : "Share link copied! 📋",
      );
    }
  };

  const renderTemplateForm = () => {
    switch (selectedTemplate) {
      case "url":
        return <WebsiteForm url={url} />;
      case "social":
        return <SocialHubForm url={url} />;
      case "wifi":
        return <WiFiForm url={url} />;
      case "vcard":
        return <VCardForm url={url} />;
      case "sms":
        return <SMSForm url={url} />;
      case "email":
        return <EmailForm url={url} />;
      case "phone":
        return <PhoneForm url={url} />;
      case "text": {
        const textLength = url.value.length;
        const nearCapacity = textLength > 800;
        return (
          <div class="space-y-4 animate-slide-down">
            <textarea
              value={url.value}
              onInput={(e) => {
                url.value = (e.target as HTMLTextAreaElement).value;
                haptics.light();
              }}
              placeholder={isSpanish
                ? "Escribe una nota, un código, un secreto..."
                : "Type a note, a code, a secret..."}
              rows={4}
              maxLength={2900}
              // deno-lint-ignore jsx-boolean-value
              autoFocus={true}
              class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none transition-colors resize-none font-medium"
            />
            {url.value.trim() !== "" && (
              <div class="flex items-center justify-between gap-2 animate-slide-down">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-green-50 border-2 border-green-300 px-3 py-1 text-xs font-bold text-green-800">
                  {isSpanish
                    ? "✓ Guardado directo en el QR — funciona sin internet"
                    : "✓ Stored in the QR itself — works offline"}
                </span>
                {nearCapacity && (
                  <span class="text-xs font-bold text-orange-600 whitespace-nowrap">
                    {textLength}/2900
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleTextCardConfirm}
              disabled={!url.value.trim() || isCreatingLocker}
              class="w-full min-h-[48px] rounded-full border-2 border-black bg-white px-4 font-black text-black shadow-chunky hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              title={isSpanish
                ? "Un link corto y una página más limpia para textos largos"
                : "A short link and a cleaner read for long text"}
            >
              {isCreatingLocker
                ? (isSpanish
                  ? "Creando página de nota…"
                  : "Creating note page…")
                : (isSpanish
                  ? "↗ Alojar como página de nota"
                  : "↗ Host as a note page instead")}
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderCompletionState = () => {
    if (!completionKind || !bucketUrl.value) return null;
    return (
      <CompletionState
        completionKind={completionKind}
        bucketUrl={bucketUrl.value}
        url={url}
        qrStyle={qrStyle}
        logoUrl={logoUrl}
        completionDownload={completionDownload}
        onCopy={() => handleCopyResult()}
        onShare={handleShareResult}
        onEditDesign={() => {
          setCompletionKind(null);
          setActiveTab("design");
          haptics.light();
        }}
        lang={locale}
      />
    );
  };

  const getSelectedStageBadge = (): { icon: string; label: string } => {
    if (isBatchMode) {
      return {
        icon: "📦",
        label: isSpanish ? "Crear en Lote" : "Bulk create",
      };
    }
    if (typeIntent === "share-file") {
      return {
        icon: "📂",
        label: isSpanish ? "Compartir Archivo" : "Share a file",
      };
    }
    if (typeIntent === "collect-files") {
      return {
        icon: "🪣",
        label: isSpanish ? "Buzón de Archivos" : "Collect files",
      };
    }
    if (CONTACT_TYPES.includes(selectedTemplate)) {
      return {
        icon: "📲",
        label: isSpanish ? "Contáctame" : "Contact me",
      };
    }
    const template = QR_TEMPLATES[selectedTemplate];
    const copy = QR_TYPE_COPY[selectedTemplate];
    return {
      icon: selectedTemplate === "vcard" ? "🪪" : template.icon,
      label: isSpanish
        ? (copy?.labelEs ?? copy?.label ?? template.label)
        : (copy?.label ?? template.label),
    };
  };

  const renderTypeTab = () => {
    const activeStageBadge = getSelectedStageBadge();
    const batchCount = batchUrls.split("\n").filter((u) => u.trim()).length;
    const isUrlStep = typeIntent === "qr" && !isBatchMode &&
      selectedTemplate === "url";

    return (
      <div class="space-y-5">
        <input
          ref={photoInputRef}
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
              onStageMedia?.(Array.from(files));
              onClose();
            }
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          multiple
          accept="audio/*"
          class="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
              onStageMedia?.(Array.from(files));
              onClose();
            }
          }}
        />

        {contentStep === "pick"
          ? (
            <div class="animate-fade-in">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Website or Note */}
                <ChoiceRow
                  icon="🔗"
                  iconBg="linear-gradient(135deg, #FEF3C7, #FDE68A)"
                  title={isSpanish ? "Web" : "Website"}
                  description={isSpanish
                    ? "Un link o una nota de texto."
                    : "A link or a plain text note."}
                  active={typeIntent === "qr" && !isBatchMode &&
                    !lockerActive && WEB_NOTE_TYPES.includes(selectedTemplate)}
                  badge={typeIntent === "qr" && !isBatchMode &&
                      !lockerActive &&
                      WEB_NOTE_TYPES.includes(selectedTemplate) &&
                      url.value.trim() !== ""
                    ? (isSpanish ? "Listo" : "Ready")
                    : undefined}
                  onClick={() =>
                    handleTemplateSelect(
                      WEB_NOTE_TYPES.includes(selectedTemplate)
                        ? selectedTemplate
                        : "url",
                    )}
                />

                {/* 2. WiFi */}
                <ChoiceRow
                  icon="📶"
                  iconBg="linear-gradient(135deg, #FFEDD5, #FED7AA)"
                  title="Wi-Fi"
                  description={isSpanish
                    ? "Conéctate sin escribir la clave."
                    : "Join a network in one scan."}
                  active={typeIntent === "qr" && !isBatchMode &&
                    !lockerActive && selectedTemplate === "wifi"}
                  badge={typeIntent === "qr" && !isBatchMode &&
                      !lockerActive && selectedTemplate === "wifi" &&
                      url.value.trim() !== ""
                    ? (isSpanish ? "Listo" : "Ready")
                    : undefined}
                  onClick={() => handleTemplateSelect("wifi")}
                />

                {/* 3. Contact & Socials */}
                <ChoiceRow
                  icon="🪪"
                  iconBg="linear-gradient(135deg, #FCE7F3, #FBCFE8)"
                  title={isSpanish ? "Contacto" : "Contact Card"}
                  description={isSpanish
                    ? "vCard, teléfono, correo y redes."
                    : "vCard, phone, email, socials."}
                  active={typeIntent === "qr" && !isBatchMode &&
                    !lockerActive &&
                    CONTACT_HUB_TYPES.includes(selectedTemplate)}
                  badge={typeIntent === "qr" && !isBatchMode &&
                      !lockerActive &&
                      CONTACT_HUB_TYPES.includes(selectedTemplate) &&
                      url.value.trim() !== ""
                    ? (isSpanish ? "Listo" : "Ready")
                    : undefined}
                  onClick={() =>
                    handleTemplateSelect(
                      CONTACT_HUB_TYPES.includes(selectedTemplate)
                        ? selectedTemplate
                        : "vcard",
                    )}
                />

                {/* 4. Drop Files, Audio or Photos */}
                <ChoiceRow
                  icon="📦"
                  iconBg="linear-gradient(135deg, #E0F2FE, #BAE6FD)"
                  shimmer
                  title={isSpanish ? "Archivo o Audio" : "File or Audio"}
                  description={isSpanish
                    ? "Un archivo, PDF o canción."
                    : "Share a file, PDF, or track."}
                  active={typeIntent === "share-file"}
                  onClick={handleShareFileSelect}
                />

                {/* 5. File Locker */}
                <ChoiceRow
                  icon="📥"
                  iconBg="linear-gradient(135deg, #D1FAE5, #A7F3D0)"
                  shimmer
                  title={isSpanish ? "Buzón de Fotos" : "Photo Drop"}
                  description={isSpanish
                    ? "Carpeta donde la gente sube fotos."
                    : "Shared folder people upload into."}
                  active={typeIntent === "collect-files" || lockerActive}
                  badge={lockerActive
                    ? (isSpanish ? "Activo" : "Live")
                    : undefined}
                  onClick={handleCollectFilesSelect}
                />

                {/* 6. Bulk ZIP */}
                <ChoiceRow
                  icon="🗂️"
                  iconBg="linear-gradient(135deg, #EDE9FE, #DDD6FE)"
                  title={isSpanish ? "Lote en ZIP" : "Bulk ZIP"}
                  description={isSpanish
                    ? "Pega varios links y descarga un ZIP de QRs."
                    : "Paste links, download a ZIP of QRs."}
                  active={isBatchMode}
                  badge={isBatchMode && batchCount > 0
                    ? `${batchCount} ${batchCount === 1 ? "QR" : "QRs"}`
                    : undefined}
                  onClick={handleBulkCreateSelect}
                />
              </div>
            </div>
          )
          : (
            <div ref={fillStageRef} class="space-y-4 animate-slide-up">
              {/* Top Stage Bar: Back to intent grid + active type enamel badge */}
              <div class="flex items-center justify-between gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setContentStep("pick");
                    scrollBodyToTop();
                    haptics.light();
                    sounds.toggleOff?.();
                  }}
                  class="min-h-[40px] inline-flex items-center gap-1.5 rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-3.5 py-1.5 text-xs font-black text-[#1e1714] shadow-chunky hover:bg-[var(--qr-theme-tint,#fce7f3)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  {isSpanish ? "← Todos los tipos" : "← All QR types"}
                </button>

                <span class="min-h-[36px] inline-flex items-center gap-1.5 rounded-full border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-3 py-1 text-xs font-black text-[#1e1714] shadow-chunky truncate whitespace-nowrap">
                  <span aria-hidden="true">{activeStageBadge.icon}</span>
                  <span class="truncate">{activeStageBadge.label}</span>
                </span>
              </div>

              {/* Focused Form Body */}
              {isBatchMode
                ? (
                  <BatchSettings
                    batchUrls={batchUrls}
                    setBatchUrls={setBatchUrls}
                    isGeneratingBatch={isGeneratingBatch}
                    batchProgress={batchProgress}
                    onGenerateBatch={onGenerateBatch}
                    lang={locale}
                  />
                )
                : typeIntent === "share-file"
                ? (
                  <div class="space-y-3">
                    {/* Quick multi-file album triggers right inside the unified Media Hub */}
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePhotoSelect}
                        class="min-h-[42px] rounded-xl border-2 border-[#1e1714] bg-[#fffef7] px-3 py-1.5 text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <span aria-hidden="true">🖼️</span>
                        <span>
                          {isSpanish ? "Galería (10 fotos)" : "Photo Gallery"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAudioSelect}
                        class="min-h-[42px] rounded-xl border-2 border-[#1e1714] bg-[#fffef7] px-3 py-1.5 text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <span aria-hidden="true">🎵</span>
                        <span>
                          {isSpanish ? "Mixtape de Audio" : "Audio Mixtape"}
                        </span>
                      </button>
                    </div>
                    <MediaHubForm
                      url={url}
                      onCreated={() => {
                        setTypeIntent("share-file");
                        setCompletionKind("share-file");
                        setShowLockerSettings(false);
                        setActiveTab("type");
                        void handleCopyResult(
                          isSpanish
                            ? "¡Link copiado! 📋"
                            : "Share link copied! 📋",
                          false,
                        );
                      }}
                    />
                  </div>
                )
                : typeIntent === "collect-files"
                ? (
                  <LockerSettings
                    isActive={lockerActive}
                    bucketUrl={bucketUrl.value}
                    isCreating={isCreatingLocker}
                    onClose={() => {
                      setShowLockerSettings(false);
                      setContentStep("pick");
                      scrollBodyToTop();
                    }}
                    onDisable={handleLockerDisableWrapper}
                    onConfirm={handleLockerConfirmWrapper}
                    lang={locale}
                  />
                )
                : (
                  <div class="space-y-3">
                    {WEB_NOTE_TYPES.includes(selectedTemplate) && (
                      <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] shadow-[2px_2px_0_#1e1714]">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTemplate("url");
                            haptics.light();
                            sounds.click();
                          }}
                          aria-pressed={selectedTemplate === "url"}
                          class={`min-h-[38px] rounded-xl px-3 text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                            selectedTemplate === "url"
                              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                              : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                          }`}
                        >
                          {isSpanish ? "🔗 Sitio web" : "🔗 Website"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTemplate("text");
                            haptics.light();
                            sounds.click();
                          }}
                          aria-pressed={selectedTemplate === "text"}
                          class={`min-h-[38px] rounded-xl px-3 text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                            selectedTemplate === "text"
                              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                              : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                          }`}
                        >
                          {isSpanish ? "📝 Nota de texto" : "📝 Plain Note"}
                        </button>
                      </div>
                    )}

                    {CONTACT_HUB_TYPES.includes(selectedTemplate) && (
                      <div class="space-y-2">
                        <div class="grid grid-cols-3 gap-1.5 p-1 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] shadow-[2px_2px_0_#1e1714]">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate("vcard");
                              haptics.light();
                              sounds.click();
                            }}
                            aria-pressed={selectedTemplate === "vcard"}
                            class={`min-h-[38px] rounded-xl px-2 text-xs font-black whitespace-nowrap transition-all ${
                              selectedTemplate === "vcard"
                                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                                : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                            }`}
                          >
                            {isSpanish ? "🪪 Tarjeta" : "🪪 vCard"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate("social");
                              haptics.light();
                              sounds.click();
                            }}
                            aria-pressed={selectedTemplate === "social"}
                            class={`min-h-[38px] rounded-xl px-2 text-xs font-black whitespace-nowrap transition-all ${
                              selectedTemplate === "social"
                                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                                : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                            }`}
                          >
                            {isSpanish ? "🌐 Redes" : "🌐 Socials"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate(
                                CONTACT_TYPES.includes(selectedTemplate)
                                  ? selectedTemplate
                                  : "phone",
                              );
                              haptics.light();
                              sounds.click();
                            }}
                            aria-pressed={CONTACT_TYPES.includes(
                              selectedTemplate,
                            )}
                            class={`min-h-[38px] rounded-xl px-2 text-xs font-black whitespace-nowrap transition-all ${
                              CONTACT_TYPES.includes(selectedTemplate)
                                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                                : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                            }`}
                          >
                            {isSpanish ? "📲 Directo" : "📲 Call / Text"}
                          </button>
                        </div>

                        {CONTACT_TYPES.includes(selectedTemplate) && (
                          <div class="grid grid-cols-3 gap-1.5">
                            {CONTACT_SEGMENTS.map((seg) => (
                              <button
                                key={seg.key}
                                type="button"
                                onClick={() => {
                                  onSelectTemplate(seg.key);
                                  haptics.light();
                                  sounds.click();
                                }}
                                aria-pressed={selectedTemplate === seg.key}
                                class={`min-h-[36px] rounded-full border-2 px-2 font-black text-xs whitespace-nowrap transition-all ${
                                  selectedTemplate === seg.key
                                    ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[1.5px_1.5px_0_#1e1714]"
                                    : "border-[#1e1714]/15 bg-[#fffef7] text-neutral-700 hover:border-[#1e1714]/60"
                                }`}
                              >
                                {seg.icon} {isSpanish ? seg.labelEs : seg.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {renderTemplateForm()}
                  </div>
                )}

              {/* Next-Phase Bridge Row — only shown on standard QR templates without their own submit CTA */}
              {!isBatchMode &&
                typeIntent !== "share-file" &&
                typeIntent !== "collect-files" && (
                <div class="pt-2 border-t-2 border-[#1e1714]/10">
                  {isUrlStep
                    ? (
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("options");
                            scrollBodyToTop();
                            haptics.light();
                            sounds.click();
                          }}
                          class="min-h-[44px] rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-3.5 py-2 text-xs font-black text-[#1e1714] shadow-chunky hover:bg-[var(--qr-theme-tint,#fce7f3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          {isSpanish
                            ? "🔗 Comportamiento →"
                            : "🔗 Behavior (Editable / Limits) →"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("design");
                            scrollBodyToTop();
                            haptics.light();
                            sounds.click();
                          }}
                          class="min-h-[44px] rounded-full border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-3.5 py-2 text-xs font-black text-[#1e1714] shadow-chunky hover:bg-[var(--qr-theme-cta-bg,#f9a8d4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          {isSpanish
                            ? "🎨 Estilo y Logo →"
                            : "🎨 Style & Logo →"}
                        </button>
                      </div>
                    )
                    : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("design");
                          scrollBodyToTop();
                          haptics.light();
                          sounds.click();
                        }}
                        class="w-full min-h-[44px] rounded-full border-2 border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-4 py-2 text-xs sm:text-sm font-black text-[#1e1714] shadow-chunky hover:bg-[var(--qr-theme-cta-bg,#f9a8d4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {isSpanish
                          ? "🎨 Siguiente: Estilo y Logo →"
                          : "🎨 Next: Style & Logo →"}
                      </button>
                    )}
                </div>
              )}
            </div>
          )}
      </div>
    );
  };

  const themeTokens = getQRThemeTokens(qrStyle.value, customStyle?.value);
  const themeStyleVars = getQRThemeStyleVars(qrStyle.value, customStyle?.value);

  const renderOptionsTab = () => {
    const isEditableActive = Boolean(editUrl.value) || isDynamic.value;
    const isStaticActive = !isEditableActive && !isBatchMode && !lockerActive;
    const activePanel = expandedBehavior === "none"
      ? null
      : (expandedBehavior ??
        (isSequential
          ? "roulette"
          : splashActive
          ? "splash"
          : isLimitSettingsOpen
          ? "limits"
          : null));
    const isRouletteExpanded = isEditableActive && isSequential &&
      activePanel === "roulette";
    const isSplashExpanded = isEditableActive && splashActive &&
      activePanel === "splash";
    const isLimitsExpanded = isEditableActive && isLimitSettingsOpen &&
      activePanel === "limits";

    return (
      <div class="space-y-4">
        <section class="space-y-2">
          <h3 class="text-sm font-black text-[#1e1714] whitespace-nowrap">
            {isSpanish ? "Comportamiento del link" : "Link behavior"}
          </h3>

          {/* Compact 2-pill segmented toggle */}
          <div
            role="group"
            aria-label={isSpanish ? "Modo de enlace QR" : "QR link mode"}
            class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] shadow-[2px_2px_0_#1e1714]"
          >
            <button
              type="button"
              aria-pressed={isStaticActive}
              onClick={() => {
                if (lockerActive) {
                  addToast(
                    isSpanish
                      ? "Buzón desconectado de este QR"
                      : "Locker cleared from this QR",
                  );
                }
                disableDynamicBase();
                setExpandedBehavior(null);
                setIsBatchMode(false);
                isBucket.value = false;
                bucketUrl.value = "";
                haptics.light();
                sounds.toggleOff?.();
              }}
              class={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                isStaticActive
                  ? "bg-[#1e1714] text-[#fffef7] shadow-sm"
                  : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
              }`}
            >
              <span>⚡ {isSpanish ? "Estático" : "Static"}</span>
            </button>

            <button
              type="button"
              aria-pressed={isEditableActive}
              onClick={() => {
                if (isEditableActive) {
                  disableDynamicBase();
                  setExpandedBehavior(null);
                  sounds.toggleOff?.();
                } else {
                  activateDynamicBase(true);
                  sounds.toggleOn?.();
                }
                haptics.light();
              }}
              class={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                isEditableActive
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-2 border-[#1e1714] shadow-sm"
                  : "text-neutral-700 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
              }`}
            >
              <span>
                🔗 {isSpanish ? "Editable + Stats" : "Editable + Stats"}
              </span>
            </button>
          </div>
        </section>

        <section class="space-y-2.5 animate-slide-down">
          <h3 class="text-sm font-black text-[#1e1714] whitespace-nowrap">
            {isSpanish ? "Trucos para QRs editables" : "Editable extras"}
          </h3>

          <ChoiceRow
            icon="🎲"
            title={isSpanish
              ? "Rotación y ruleta de links"
              : "Link rotation & roulette"}
            active={isRouletteExpanded}
            accordion
            badge={isEditableActive && isSequential
              ? (randomSequence
                ? (isSpanish ? "Ruleta" : "Roulette")
                : (isSpanish ? "Activo" : "Active"))
              : undefined}
            clearBadgeLabel={isSpanish ? "Apagar" : "Turn off"}
            onClearBadge={() => {
              setIsSequential(false);
              if (activePanel === "roulette") setExpandedBehavior("none");
              haptics.light();
            }}
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              if (!isSequential) {
                setIsSequential(true);
                setExpandedBehavior("roulette");
              } else if (activePanel !== "roulette") {
                setExpandedBehavior("roulette");
              } else {
                setExpandedBehavior("none");
              }
              haptics.light();
            }}
          >
            {isRouletteExpanded && (
              <MultiLinkSettings
                sequentialUrls={sequentialUrls}
                setSequentialUrls={setSequentialUrls}
                loopSequence={loopSequence}
                setLoopSequence={setLoopSequence}
                randomSequence={randomSequence}
                setRandomSequence={setRandomSequence}
                dailySpins={dailySpins}
                setDailySpins={setDailySpins}
                embedded
                lang={locale}
              />
            )}
          </ChoiceRow>

          <ChoiceRow
            icon={isSequential && randomSequence ? "🎨" : "✨"}
            title={isSequential && randomSequence
              ? (isSpanish ? "Tarjeta de ruleta" : "Brand spin card")
              : (isSpanish ? "Portada de bienvenida" : "Intro page")}
            active={isSplashExpanded}
            accordion
            badge={isEditableActive && splashActive
              ? (isSpanish ? "Activa" : "On")
              : undefined}
            clearBadgeLabel={isSpanish ? "Apagar" : "Turn off"}
            onClearBadge={() => {
              splashConfig.value = null;
              if (activePanel === "splash") setExpandedBehavior("none");
              haptics.light();
            }}
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              const isRoulette = isSequential && randomSequence;
              if (!splashActive) {
                splashConfig.value = isRoulette
                  ? {
                    enabled: true,
                    title: isSpanish
                      ? "Sorteo Misterioso 🎲"
                      : "Mystery Draw 🎲",
                    buttonText: isSpanish
                      ? "Abrir Premio 🎁"
                      : "Open Reward 🎁",
                    brandName: isSpanish ? "SORTEO DIARIO" : "DAILY DROP",
                    accentColor: themeTokens.accent,
                  }
                  : {
                    enabled: true,
                    title: isSpanish ? "¡Hola!" : "Welcome!",
                    buttonText: isSpanish ? "Continuar" : "Continue",
                    accentColor: themeTokens.accent,
                  };
                setExpandedBehavior("splash");
              } else if (activePanel !== "splash") {
                setExpandedBehavior("splash");
              } else {
                setExpandedBehavior("none");
              }
              haptics.light();
            }}
          >
            {isSplashExpanded && (
              <SplashSettings
                splashConfig={splashConfig}
                destinationUrl={url.value}
                isRoulette={isSequential && randomSequence}
                defaultAccentColor={themeTokens.accent}
                embedded
                lang={locale}
              />
            )}
          </ChoiceRow>

          <ChoiceRow
            icon="⏳"
            title={isSpanish
              ? "Límite de escaneos o fecha"
              : "Scan & date limits"}
            active={isLimitsExpanded}
            accordion
            badge={isEditableActive && (scanLimit !== null || expiryDate !== "")
              ? (isSpanish ? "Activo" : "Active")
              : undefined}
            clearBadgeLabel={isSpanish ? "Apagar" : "Turn off"}
            onClearBadge={() => {
              setScanLimit(null);
              setExpiryDate("");
              setIsLimitSettingsOpen(false);
              if (activePanel === "limits") setExpandedBehavior("none");
              haptics.light();
            }}
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              if (!isLimitSettingsOpen) {
                setIsLimitSettingsOpen(true);
                setExpandedBehavior("limits");
              } else if (activePanel !== "limits") {
                setExpandedBehavior("limits");
              } else {
                setExpandedBehavior("none");
              }
              haptics.light();
            }}
          >
            {isLimitsExpanded && (
              <TimeBombSettings
                scanLimit={scanLimit}
                setScanLimit={setScanLimit}
                expiryDate={expiryDate}
                setExpiryDate={setExpiryDate}
                embedded
                lang={locale}
              />
            )}
          </ChoiceRow>

          {Boolean(editUrl.value) && setIsDynamicActive && (
            <ChoiceRow
              icon="⏸️"
              title={isSpanish ? "Pausar escaneos" : "Pause scans"}
              description={isSpanish
                ? "Detiene redirecciones temporalmente sin borrar el QR."
                : "Temporarily halts redirects without deleting the QR."}
              active={!isDynamicActive}
              badge={!isDynamicActive
                ? (isSpanish ? "Pausado" : "Paused")
                : undefined}
              onClick={() => {
                setIsDynamicActive(!isDynamicActive);
                haptics.light();
              }}
            />
          )}

          {isDynamic.value && (
            <EditableLinkSettings
              editUrl={editUrl}
              url={url}
              pendingUrl={url.value}
              isCreating={isCreatingEditable}
              onCreate={onCreateEditable}
              isSequential={isSequential}
              sequentialUrls={sequentialUrls}
              randomSequence={randomSequence}
              dailySpins={dailySpins}
              lang={locale}
            />
          )}
        </section>
      </div>
    );
  };

  const renderDesignTab = () => (
    <DesignTab
      url={url}
      qrStyle={qrStyle}
      logoUrl={logoUrl}
      frameConfig={frameConfig}
      customStyle={customStyle}
      pngSize={pngSize}
      onClose={shell.requestClose}
      lang={locale}
    />
  );

  // Labels carry the meaning; the emoji were garnish on navigation, which the
  // footer-charm exception doesn't cover.
  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: "type", label: isSpanish ? "Contenido" : "Content" },
    { id: "options", label: isSpanish ? "Ajustes" : "Behavior" },
    { id: "design", label: isSpanish ? "Diseño" : "Design" },
  ];
  const hasCompletion = completionKind !== null && bucketUrl.value !== "";

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        ref={shell.backdropRef}
        class={`absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm transition-opacity ${
          shell.closing
            ? "charm-modal-backdrop--closing charm-modal--closing opacity-0"
            : "animate-fade-in"
        }`}
        onClick={shell.onBackdropClick}
      />

      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        tabindex={-1}
        style={themeStyleVars}
        class={`relative w-full max-w-lg h-[min(92dvh,760px)] sm:h-[min(744px,88dvh)] bg-[#fbf1e4] border-t-4 sm:border-3 border-[#1e1714] rounded-t-3xl sm:rounded-3xl shadow-chunky-hover flex flex-col overflow-hidden focus:outline-none focus-visible:outline-none ${
          shell.closing
            ? "charm-modal--closing animate-modal-exit"
            : "animate-slide-up sm:animate-pop-in"
        }`}
      >
        <div class="flex items-center justify-between gap-3 p-4 sm:px-6 sm:pt-5 pb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="min-w-0">
              <h2
                id="create-modal-title"
                class="font-black text-lg sm:text-2xl tracking-tight text-[#1e1714] leading-tight"
              >
                {hasCompletion
                  ? (isSpanish ? "Listo para compartir." : "Ready to share.")
                  : SHEET_HEADINGS[activeTab][isSpanish ? "es" : "en"].title}
              </h2>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            {onShowHistory && !hasCompletion && (
              <button
                type="button"
                onClick={onShowHistory}
                class="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow] duration-[70ms] active:translate-y-[2px] active:shadow-none"
                aria-label={isSpanish ? "Abrir historial" : "Open QR history"}
                title={isSpanish ? "Historial" : "History"}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 3a9 9 0 1 1-6.36 2.64M3 3v5h5M12 7v5l3 2" />
                </svg>
              </button>
            )}
            {onInspect && !hasCompletion && (
              <button
                type="button"
                onClick={onInspect}
                class="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow] duration-[70ms] active:translate-y-[2px] active:shadow-none"
                aria-label={isSpanish ? "Revisar un QR" : "Inspect a QR code"}
                title={isSpanish
                  ? "Ver a dónde lleva un QR antes de abrirlo"
                  : "See where a QR goes before opening it"}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.6"
                  stroke-linecap="round"
                >
                  <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={shell.requestClose}
              class="qr-modal-close-btn shrink-0"
              aria-label={isSpanish ? "Cerrar" : "Close"}
            >
              <svg
                class="w-4 h-4 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3.25"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M6.5 6.5l11 11m0-11l-11 11" />
              </svg>
            </button>
          </div>
        </div>

        {!hasCompletion && (
          <div class="px-4 sm:px-6 pt-1.5 pb-2 bg-[#fbf1e4] border-b-2 border-[#1e1714]/10 z-10">
            <div class="grid grid-cols-3 gap-1 rounded-full bg-[#efe9dc] p-1 border-2 border-[#1e1714]">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "type" && activeTab === "type") {
                      setContentStep("pick");
                    }
                    setActiveTab(tab.id);
                    scrollBodyToTop();
                    haptics.light();
                    sounds.click();
                  }}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                  class={`min-h-[40px] px-1 rounded-full text-xs min-[380px]:text-sm font-black whitespace-nowrap transition-all flex items-center justify-center min-w-0 border-2 ${
                    activeTab === tab.id
                      ? "bg-[#fffef7] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                      : "text-[#1e1714]/70 border-transparent hover:bg-[#fffef7]/60"
                  }`}
                >
                  <span class="truncate">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasCompletion && activeTab === "design" && (
          <DesignPreview
            url={url}
            qrStyle={qrStyle}
            customStyle={customStyle}
            logoUrl={logoUrl}
            frameConfig={frameConfig}
            es={isSpanish}
          />
        )}
        <div
          ref={bodyScrollRef}
          class="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 sm:px-6 sm:py-4 pb-5"
        >
          {hasCompletion ? renderCompletionState() : (
            <>
              {activeTab === "type" && renderTypeTab()}
              {activeTab === "options" && (typeIntent === "qr"
                ? renderOptionsTab()
                : (
                  <p class="text-sm font-bold text-neutral-600">
                    {isSpanish
                      ? "Las opciones de archivos están en Contenido. Usa Diseño para darle estilo al QR."
                      : "File options live in Content. Use Design to style the QR."}
                  </p>
                ))}
              {activeTab === "design" && renderDesignTab()}
            </>
          )}
        </div>

        {!(
          activeTab === "type" &&
          contentStep === "fill" &&
          !hasCompletion &&
          (isBatchMode ||
            typeIntent === "share-file" ||
            typeIntent === "collect-files")
        ) && (
          <div class="p-4 sm:px-6 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 bg-[#fbf1e4] border-t-2 border-[#1e1714]/10 z-10">
            {false && onShowHistory}
            {saveError && (
              <div
                role="alert"
                class="mb-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-900"
              >
                {saveError}
              </div>
            )}
            {(() => {
              const validSeqCount = sequentialUrls.filter((u) =>
                looksLikeUrl(u)
              )
                .length;
              const needsDynamicMint = activeTab === "options" &&
                isDynamic.value && !editUrl.value;
              const canMintDynamic = needsDynamicMint &&
                (isSequential ? validSeqCount >= 2 : looksLikeUrl(url.value));

              const baseline = savedDynamicConfig
                ? hydrateBehaviorStateFromConfig(savedDynamicConfig)
                : null;
              const hasUnsavedDynamicChanges = !baseline ||
                isSequential !== baseline.isSequential ||
                JSON.stringify(sequentialUrls) !==
                  JSON.stringify(baseline.sequentialUrls) ||
                loopSequence !== baseline.loopSequence ||
                Boolean(randomSequence) !== baseline.randomSequence ||
                (dailySpins ?? null) !== baseline.dailySpins ||
                JSON.stringify(splashConfig.value ?? null) !==
                  JSON.stringify(baseline.splashConfig) ||
                (scanLimit ?? null) !== baseline.scanLimit ||
                expiryDate !== baseline.expiryDate ||
                isDynamicActive !== baseline.isActive ||
                (!extractShortCodeFromRedirectUrl(url.value) &&
                  url.value.trim() !== "" &&
                  url.value.trim() !== baseline.destinationUrl);
              const shouldSaveMintedDynamic = Boolean(
                isDynamic.value &&
                  editUrl.value &&
                  onUpdateEditable &&
                  (activeTab === "options" || hasUnsavedDynamicChanges),
              );

              return (
                <button
                  type="button"
                  disabled={isCreatingEditable || busySavingDynamic}
                  onClick={async () => {
                    if (needsDynamicMint) {
                      if (canMintDynamic) {
                        onCreateEditable();
                        return;
                      }
                      haptics.error();
                      if (isSequential) {
                        addToast(
                          isSpanish
                            ? "Agrega al menos 2 links válidos arriba 🎲"
                            : "Add at least 2 valid links above first 🎲",
                          2600,
                        );
                      } else {
                        addToast(
                          isSpanish
                            ? "Agrega un link de destino arriba 🔗"
                            : "Add a destination link above first 🔗",
                          2600,
                        );
                      }
                      return;
                    }
                    if (shouldSaveMintedDynamic && onUpdateEditable) {
                      setSaveError(null);
                      setIsSavingDynamic(true);
                      try {
                        const result = await onUpdateEditable();
                        if (!result.ok) {
                          setSaveError(result.error);
                          return;
                        }
                      } finally {
                        setIsSavingDynamic(false);
                      }
                    }
                    globalThis.dispatchEvent(
                      new CustomEvent("qrb-modal-bloom"),
                    );
                    shell.requestClose();
                  }}
                  class="qr-pitch-cta disabled:opacity-50"
                >
                  <span>
                    {busySavingDynamic
                      ? (isSpanish ? "Guardando..." : "Saving...")
                      : hasCompletion
                      ? (isSpanish
                        ? "Listo · Volver al inicio"
                        : "Done · Back to home")
                      : activeTab === "design"
                      ? (isSpanish ? "Listo" : "Done")
                      : isCreatingEditable
                      ? (isSpanish
                        ? (isSequential && randomSequence
                          ? "Creando QR ruleta…"
                          : "Creando link editable…")
                        : (isSequential && randomSequence
                          ? "Creating roulette QR…"
                          : "Creating editable link…"))
                      : needsDynamicMint
                      ? (isSpanish
                        ? (isSequential && randomSequence
                          ? "Crear QR ruleta"
                          : isSequential
                          ? "Crear QR multi-link"
                          : "Crear link editable")
                        : (isSequential && randomSequence
                          ? "Create roulette QR"
                          : isSequential
                          ? "Create multi-link QR"
                          : "Create editable link"))
                      : (isSpanish ? "Listo · Ver QR" : "Done · View QR")}
                  </span>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

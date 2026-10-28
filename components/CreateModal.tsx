import { type Signal, useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";

import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import { QR_TEMPLATES, QRTemplateType } from "../types/qr-templates.ts";
import type { QRStyle } from "../types/qr-types.ts";
import { haptics } from "../utils/haptics.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import {
  getQRThemeStyleVars,
  getQRThemeTokens,
  QR_STYLES,
} from "../utils/qr-styles.ts";
import { sounds } from "../utils/sounds.ts";
import { looksLikeUrl } from "../utils/url.ts";
import ChoiceRow from "./create-modal/ChoiceRow.tsx";
import CompletionState, {
  type CompletionKind,
} from "./create-modal/CompletionState.tsx";
import DesignTab from "./create-modal/DesignTab.tsx";
import { STYLE_DISPLAY } from "../islands/StyleSelector.tsx";
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

type ActiveTab = "type" | "options" | "design";
type TypeIntent = "qr" | "share-file" | "collect-files";
type ContentStep = "pick" | "fill";

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  isCreatingEditable: boolean;
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

// Frequency-ordered for humans, not enterprises: link and note first, then
// social (creators/small biz), then household WiFi, then contact cards.
// SMS/email/phone collapse into one "Contact me" row — same intent bucket,
// two fewer 64px scroll-stops on mobile.
const QR_TYPE_ORDER: QRTemplateType[] = [
  "url",
  "text",
  "social",
  "wifi",
  "vcard",
];

const CONTACT_TYPES: QRTemplateType[] = ["phone", "sms", "email"];

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
  isCreatingEditable,
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

  const lockerActive = isBucket.value && bucketUrl.value !== "";
  const splashActive = splashConfig.value?.enabled ?? false;

  useEffect(() => {
    if (scanLimit !== null || expiryDate !== "") {
      setIsLimitSettingsOpen(true);
    }
  }, [scanLimit, expiryDate]);

  useEffect(() => {
    if (!isOpen) {
      setTypeIntent("qr");
      setContentStep("pick");
      setCompletionKind(null);
      setShowLockerSettings(false);
    }
  }, [isOpen]);

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

  const activateDynamicBase = () => {
    isDynamic.value = true;
    isBucket.value = false;
    bucketUrl.value = "";
    setIsBatchMode(false);
    setShowLockerSettings(false);
  };

  const disableDynamicBase = () => {
    const hadExtras = isSequential || scanLimit !== null || expiryDate !== "" ||
      (splashConfig.value?.enabled ?? false);
    isDynamic.value = false;
    setIsSequential(false);
    setIsLimitSettingsOpen(false);
    setScanLimit(null);
    setExpiryDate("");
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
            <div class="space-y-5 animate-fade-in">
              <section class="space-y-2">
                <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
                  {isSpanish ? "Tipos principales" : "Core types"}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QR_TYPE_ORDER.map((key) => {
                    const template = QR_TEMPLATES[key];
                    const copy = QR_TYPE_COPY[key];
                    const isRowActive = typeIntent === "qr" && !isBatchMode &&
                      !lockerActive && selectedTemplate === key;
                    const isConfigured = isRowActive &&
                      url.value.trim() !== "";
                    return (
                      <ChoiceRow
                        key={key}
                        icon={key === "vcard" ? "🪪" : template.icon}
                        title={isSpanish
                          ? (copy?.labelEs ?? copy?.label ?? template.label)
                          : (copy?.label ?? template.label)}
                        description={isSpanish
                          ? (copy?.descriptionEs ?? copy?.description ??
                            template.description)
                          : (copy?.description ?? template.description)}
                        active={isRowActive}
                        badge={isConfigured
                          ? (isSpanish ? "Listo" : "Ready")
                          : undefined}
                        onClick={() => handleTemplateSelect(key)}
                      />
                    );
                  })}
                  <ChoiceRow
                    icon="📲"
                    title={isSpanish ? "Contáctame" : "Contact me"}
                    description={isSpanish
                      ? "Llamada, SMS o correo en un escaneo."
                      : "Call, text, or email in one scan."}
                    active={typeIntent === "qr" && !isBatchMode &&
                      !lockerActive &&
                      CONTACT_TYPES.includes(selectedTemplate)}
                    badge={typeIntent === "qr" && !isBatchMode &&
                        !lockerActive &&
                        CONTACT_TYPES.includes(selectedTemplate) &&
                        url.value.trim() !== ""
                      ? (isSpanish ? "Listo" : "Ready")
                      : undefined}
                    onClick={() =>
                      handleTemplateSelect(
                        CONTACT_TYPES.includes(selectedTemplate)
                          ? selectedTemplate
                          : "phone",
                      )}
                  />
                </div>
              </section>

              {
                /* Files and bulk are what-am-I-making intents (a page, a locker, many
                  static QRs at once), not per-QR behaviors — they live here with the
                  other top-level intents. */
              }
              <section class="space-y-2">
                <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
                  {isSpanish ? "Archivos y álbumes" : "Files & drops"}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ChoiceRow
                    icon="🖼️"
                    title={isSpanish ? "Galería de fotos" : "Photo gallery"}
                    description={isSpanish
                      ? "Hasta 10 fotos en galería automática."
                      : "Up to 10 photos in a swipeable gallery."}
                    active={false}
                    onClick={handlePhotoSelect}
                  />
                  <ChoiceRow
                    icon="🎵"
                    title={isSpanish ? "Mixtape de audio" : "Audio playlist"}
                    description={isSpanish
                      ? "Hasta 10 pistas con reproductor mixtape."
                      : "Up to 10 tracks in a mixtape player."}
                    active={false}
                    onClick={handleAudioSelect}
                  />
                  <ChoiceRow
                    icon="📂"
                    title={isSpanish ? "Compartir archivo" : "Share a file"}
                    description={isSpanish
                      ? "Página de descarga con PIN opcional."
                      : "One-file download page, optional PIN."}
                    active={typeIntent === "share-file"}
                    onClick={handleShareFileSelect}
                  />
                  <ChoiceRow
                    icon="🪣"
                    title={isSpanish ? "Buzón de Archivos" : "Collect files"}
                    description={isSpanish
                      ? "Un buzón donde la gente puede subirte archivos."
                      : "A locker people drop files into."}
                    active={typeIntent === "collect-files" || lockerActive}
                    badge={lockerActive
                      ? (isSpanish ? "Activo" : "Live")
                      : undefined}
                    onClick={handleCollectFilesSelect}
                  />
                  <ChoiceRow
                    icon="📦"
                    title={isSpanish ? "Crear en Lote" : "Bulk create"}
                    description={isSpanish
                      ? "Pega varios links y descarga un ZIP con todos los QRs."
                      : "Paste links, download a ZIP of QRs."}
                    active={isBatchMode}
                    badge={isBatchMode && batchCount > 0
                      ? `${batchCount} ${batchCount === 1 ? "QR" : "QRs"}`
                      : undefined}
                    onClick={handleBulkCreateSelect}
                  />
                </div>
              </section>
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
                  class="min-h-[40px] inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-1.5 text-xs font-black text-black shadow-chunky hover:bg-[var(--qr-theme-tint,#fce7f3)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  {isSpanish ? "← Todos los tipos" : "← All QR types"}
                </button>

                <span class="min-h-[36px] inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-3 py-1 text-xs font-black text-black shadow-chunky truncate whitespace-nowrap">
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
                    {CONTACT_TYPES.includes(selectedTemplate) && (
                      <div class="grid grid-cols-3 gap-2">
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
                            class={`min-h-[44px] rounded-full border-2 px-2 font-black text-sm whitespace-nowrap transition-all ${
                              selectedTemplate === seg.key
                                ? "border-black bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-black shadow-chunky"
                                : "border-black/15 bg-white text-neutral-700 hover:border-black/60"
                            }`}
                          >
                            {seg.icon} {isSpanish ? seg.labelEs : seg.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {renderTemplateForm()}
                  </div>
                )}

              {/* Next-Phase Bridge Row */}
              <div class="pt-2 border-t-2 border-black/10">
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
                        class="min-h-[44px] rounded-full border-2 border-black bg-white px-3.5 py-2 text-xs font-black text-black shadow-chunky hover:bg-[var(--qr-theme-tint,#fce7f3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
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
                        class="min-h-[44px] rounded-full border-2 border-black bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-3.5 py-2 text-xs font-black text-black shadow-chunky hover:bg-[var(--qr-theme-cta-bg,#f9a8d4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {isSpanish ? "🎨 Estilo y Logo →" : "🎨 Style & Logo →"}
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
                      class="w-full min-h-[44px] rounded-full border-2 border-black bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-4 py-2 text-xs sm:text-sm font-black text-black shadow-chunky hover:bg-[var(--qr-theme-cta-bg,#f9a8d4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {isSpanish
                        ? "🎨 Siguiente: Estilo y Logo →"
                        : "🎨 Next: Style & Logo →"}
                    </button>
                  )}
              </div>
            </div>
          )}
      </div>
    );
  };

  const themeTokens = getQRThemeTokens(qrStyle.value, customStyle?.value);
  const themeStyleVars = getQRThemeStyleVars(qrStyle.value, customStyle?.value);

  const renderOptionsTab = () => {
    const isStaticActive = !isDynamic.value && !isBatchMode && !lockerActive;
    return (
      <div class="space-y-4">
        <section class="space-y-2">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500 whitespace-nowrap">
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
              aria-pressed={isDynamic.value}
              onClick={() => {
                if (isDynamic.value) {
                  disableDynamicBase();
                  sounds.toggleOff?.();
                } else {
                  activateDynamicBase();
                  sounds.toggleOn?.();
                }
                haptics.light();
              }}
              class={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                isDynamic.value
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
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500 whitespace-nowrap">
            {isSpanish ? "Trucos para QRs editables" : "Editable extras"}
          </h3>

          <ChoiceRow
            icon="🎲"
            title={isSpanish
              ? "Rotación y ruleta de links"
              : "Link rotation & roulette"}
            active={isDynamic.value && isSequential}
            accordion
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              setIsSequential(!isSequential);
              haptics.light();
            }}
          >
            {isDynamic.value && isSequential && (
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
            active={isDynamic.value && splashActive}
            accordion
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              const isRoulette = isSequential && randomSequence;
              splashConfig.value = splashActive ? null : isRoulette
                ? {
                  enabled: true,
                  title: isSpanish ? "Sorteo Misterioso 🎲" : "Mystery Draw 🎲",
                  buttonText: isSpanish ? "Abrir Premio 🎁" : "Open Reward 🎁",
                  brandName: isSpanish ? "SORTEO DIARIO" : "DAILY DROP",
                  accentColor: themeTokens.accent,
                }
                : {
                  enabled: true,
                  title: isSpanish ? "¡Hola!" : "Welcome!",
                  buttonText: isSpanish ? "Continuar" : "Continue",
                  accentColor: themeTokens.accent,
                };
              haptics.light();
            }}
          >
            {isDynamic.value && splashActive && (
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
            active={isDynamic.value && isLimitSettingsOpen}
            accordion
            onClick={() => {
              if (!isDynamic.value) activateDynamicBase();
              const next = !isLimitSettingsOpen;
              if (!next) {
                setScanLimit(null);
                setExpiryDate("");
              }
              setIsLimitSettingsOpen(next);
              haptics.light();
            }}
          >
            {isDynamic.value && isLimitSettingsOpen && (
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

          {isDynamic.value && (
            <EditableLinkSettings
              editUrl={editUrl}
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
    { id: "options", label: isSpanish ? "Comportamiento" : "Behavior" },
    { id: "design", label: isSpanish ? "Diseño" : "Design" },
  ];
  const hasCompletion = completionKind !== null && bucketUrl.value !== "";

  // Live Corner Mini-QR Preview Badge state
  const isCustomStyle = qrStyle.value === "custom";
  const presetInfo =
    STYLE_DISPLAY[qrStyle.value as keyof typeof STYLE_DISPLAY] ??
      STYLE_DISPLAY.sunset;
  const presetStyle = QR_STYLES[qrStyle.value as keyof typeof QR_STYLES];
  const activeStyleObj = isCustomStyle && customStyle?.value
    ? customStyle.value
    : presetStyle;
  const customStopColors = isCustomStyle && customStyle?.value &&
      "gradient" in customStyle.value.dots &&
      customStyle.value.dots.gradient
    ? customStyle.value.dots.gradient.colorStops.map((s) => s.color)
    : isCustomStyle && customStyle?.value &&
        "color" in customStyle.value.dots &&
        customStyle.value.dots.color
    ? [customStyle.value.dots.color, customStyle.value.dots.color]
    : null;
  const miniColors = customStopColors && customStopColors.length > 0
    ? customStopColors
    : isCustomStyle
    ? ["#9370DB", "#FF69B4"]
    : presetInfo.colors;
  const miniGradient = `linear-gradient(135deg, ${miniColors.join(", ")})`;
  const miniBg = activeStyleObj &&
      "gradient" in activeStyleObj.background &&
      activeStyleObj.background.gradient
    ? `linear-gradient(135deg, ${
      activeStyleObj.background.gradient.colorStops.map((s) => s.color).join(
        ", ",
      )
    })`
    : activeStyleObj && "color" in activeStyleObj.background &&
        activeStyleObj.background.color
    ? activeStyleObj.background.color
    : "#FFFDF9";
  const miniDotShape = activeStyleObj &&
      "shape" in activeStyleObj.dots
    ? activeStyleObj.dots.shape
    : "rounded";
  const miniDotRadius = miniDotShape === "dots"
    ? "rounded-full"
    : miniDotShape === "square"
    ? "rounded-none"
    : "rounded-[2px]";
  const miniFrameActive = frameConfig?.value?.enabled ?? false;
  const miniFrameCaption = frameConfig?.value?.caption ||
    (isSpanish ? "ESCANÉAME" : "SCAN ME");
  const MINI_MATRIX = [
    1,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
  ];

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
        class={`relative w-full max-w-lg bg-[#fbf1e4] border-t-4 sm:border-3 border-[#1e1714] rounded-t-3xl sm:rounded-3xl shadow-chunky-hover max-h-[92dvh] flex flex-col overflow-hidden ${
          shell.closing
            ? "charm-modal--closing animate-modal-exit"
            : "animate-slide-up sm:animate-pop-in"
        }`}
      >
        <div class="flex items-center justify-between gap-3 p-4 sm:px-6 sm:pt-5 pb-2">
          <div class="flex items-center gap-3 min-w-0">
            {/* Live Corner Mini-QR Badge — mirrors the main QR style, logo, and frame across all tabs */}
            <button
              type="button"
              onClick={() => {
                setCompletionKind(null);
                setActiveTab("design");
                scrollBodyToTop();
                haptics.light();
                sounds.bloop?.();
              }}
              title={isSpanish
                ? "Vista previa en vivo — toca para diseñar"
                : "Live QR preview — tap to style"}
              aria-label={isSpanish
                ? "Vista previa en vivo del QR"
                : "Live QR preview"}
              class="group relative shrink-0 flex flex-col items-center focus:outline-none"
            >
              <div
                key={`${qrStyle.value}-${
                  Boolean(logoUrl.value)
                }-${miniFrameActive}-${url.value.slice(0, 16)}`}
                class="w-12 h-12 rounded-2xl border-2 border-[#1e1714] p-1.5 flex items-center justify-center relative overflow-hidden shadow-[2px_2px_0_#1e1714] group-hover:scale-105 group-active:scale-95 transition-transform animate-pop"
                style={{ background: miniBg }}
              >
                <div class="grid grid-cols-5 gap-[2px] w-full h-full">
                  {MINI_MATRIX.map((cell, idx) => (
                    <span
                      key={idx}
                      class={`${miniDotRadius} ${
                        cell ? "opacity-100" : "opacity-15"
                      }`}
                      style={{
                        background: cell ? miniGradient : "transparent",
                      }}
                    />
                  ))}
                </div>
                {logoUrl.value && (
                  <img
                    src={logoUrl.value}
                    alt=""
                    class="absolute inset-0 m-auto w-5 h-5 rounded-md border border-[#1e1714] bg-[#fffef7] object-contain"
                  />
                )}
              </div>
              {miniFrameActive && (
                <span class="-mt-1.5 z-10 px-1.5 py-0.2 rounded border border-[#1e1714] bg-[#1e1714] text-[#fffef7] text-[8px] font-black uppercase tracking-wider leading-tight max-w-[56px] truncate">
                  {miniFrameCaption}
                </span>
              )}
            </button>

            <div class="min-w-0">
              <h2
                id="create-modal-title"
                class="font-black text-xl sm:text-2xl tracking-tight text-[#1e1714] leading-tight truncate"
              >
                {hasCompletion
                  ? (isSpanish ? "Listo para compartir." : "Ready to share.")
                  : (isSpanish ? "Haz que haga trucos." : "Make it do tricks.")}
              </h2>
              <p
                class="text-xs sm:text-sm font-bold truncate"
                style={{ color: "var(--qr-theme-accent, #ec4899)" }}
              >
                {hasCompletion
                  ? (isSpanish
                    ? "Tu QR ya apunta a la nueva página."
                    : "The QR now points at the new page.")
                  : (isSpanish
                    ? "Qué lleva, cómo reacciona y cómo se ve."
                    : "What it does, how it reacts, how it looks.")}
              </p>
            </div>
          </div>

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

        {!hasCompletion && (
          <div class="px-4 sm:px-6 pt-1.5 pb-2 bg-[#fbf1e4] border-b-2 border-[#1e1714]/10 z-10">
            <div class="grid grid-cols-3 gap-1 rounded-full bg-[#fffef7] p-1 border-2 border-[#1e1714] shadow-[2px_2px_0_#1e1714]">
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
                  class={`min-h-[38px] px-1 rounded-full text-xs min-[380px]:text-sm font-black whitespace-nowrap transition-all flex items-center justify-center min-w-0 ${
                    activeTab === tab.id
                      ? "bg-[#1e1714] text-[#fffef7]"
                      : "text-neutral-600 hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                  }`}
                >
                  <span class="truncate">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={bodyScrollRef}
          class="flex-1 overflow-y-auto scrollbar-none p-4 sm:px-6 sm:py-4 pb-5 sm:max-h-[min(520px,64dvh)]"
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

        <div class="p-4 sm:px-6 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 bg-[#fbf1e4] border-t-2 border-[#1e1714]/10 z-10">
          {(() => {
            const validSeqCount = sequentialUrls.filter((u) => looksLikeUrl(u))
              .length;
            const needsDynamicMint = activeTab === "options" &&
              isDynamic.value && !editUrl.value;
            const canMintDynamic = needsDynamicMint &&
              (isSequential ? validSeqCount >= 2 : looksLikeUrl(url.value));

            return (
              <button
                type="button"
                disabled={isCreatingEditable}
                onClick={() => {
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
                          ? "Agrega un link de destino en Contenido primero 🔗"
                          : "Add a destination link in Content first 🔗",
                        2600,
                      );
                      setActiveTab("type");
                    }
                    return;
                  }
                  globalThis.dispatchEvent(new CustomEvent("qrb-modal-bloom"));
                  shell.requestClose();
                }}
                class="qr-pitch-cta disabled:opacity-50"
              >
                <span>
                  {hasCompletion
                    ? (isSpanish
                      ? "Listo · Volver al inicio ✨"
                      : "Done · Back to Home ✨")
                    : activeTab === "design"
                    ? (isSpanish
                      ? "Listo · Aplicar diseño ✨"
                      : "Done · Apply Design ✨")
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
                        ? "🎲 Crear QR ruleta ✨"
                        : isSequential
                        ? "🔄 Crear QR multi-link ✨"
                        : "✦ Crear link editable ✨")
                      : (isSequential && randomSequence
                        ? "🎲 Create roulette QR ✨"
                        : isSequential
                        ? "🔄 Create multi-link QR ✨"
                        : "✦ Create editable link ✨"))
                    : (isSpanish ? "Listo · Ver QR ✨" : "Done · View QR ✨")}
                </span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

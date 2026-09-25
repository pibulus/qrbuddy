import { type Signal, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import { QR_TEMPLATES, QRTemplateType } from "../types/qr-templates.ts";
import { haptics } from "../utils/haptics.ts";
import ChoiceRow from "./create-modal/ChoiceRow.tsx";
import CompletionState, {
  type CompletionKind,
} from "./create-modal/CompletionState.tsx";
import DesignTab from "./create-modal/DesignTab.tsx";
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
import { addToast } from "./ToastManager.tsx";

type ActiveTab = "type" | "options" | "design";
type TypeIntent = "qr" | "share-file" | "collect-files";

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
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: () => void;
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
    } | null
  >;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
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

const CONTACT_SEGMENTS: { key: QRTemplateType; label: string; icon: string }[] =
  [
    { key: "phone", label: "Call", icon: "📞" },
    { key: "sms", label: "Text", icon: "💬" },
    { key: "email", label: "Email", icon: "✉️" },
  ];

const QR_TYPE_COPY: Partial<
  Record<QRTemplateType, { label: string; description: string }>
> = {
  url: {
    label: "Link",
    description: "Website or page.",
  },
  text: {
    label: "Plain text",
    description: "Note, code, or secret.",
  },
  wifi: {
    label: "WiFi",
    description: "Join without typing the password.",
  },
  vcard: {
    label: "Contact card",
    description: "One scan saves you to their phone.",
  },
  social: {
    label: "Social profile",
    description: "Bio links, Instagram, YouTube & more.",
  },
  sms: {
    label: "Text message",
    description: "Open a pre-filled SMS.",
  },
  email: {
    label: "Email",
    description: "Open a pre-filled email.",
  },
  phone: {
    label: "Phone call",
    description: "Dial a number straight from the scan.",
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
}: CreateModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("type");
  const [typeIntent, setTypeIntent] = useState<TypeIntent>("qr");
  const [completionKind, setCompletionKind] = useState<CompletionKind | null>(
    null,
  );
  const completionDownload = useSignal(false);
  const [showLockerSettings, setShowLockerSettings] = useState(false);
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
      setCompletionKind(null);
      setShowLockerSettings(false);
    }
  }, [isOpen]);

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
    if (hadExtras) addToast("Editable extras cleared");
  };

  const handleTemplateSelect = (template: QRTemplateType) => {
    if (selectedTemplate !== template) {
      url.value = "";
    }
    setTypeIntent("qr");
    onSelectTemplate(template);
    haptics.light();
  };

  const handleShareFileSelect = () => {
    setTypeIntent("share-file");
    setCompletionKind(null);
    setIsBatchMode(false);
    setShowLockerSettings(false);
    haptics.light();
  };

  const handleCollectFilesSelect = () => {
    setTypeIntent("collect-files");
    setCompletionKind(null);
    setShowLockerSettings(true);
    setIsBatchMode(false);
    haptics.light();
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
      void handleCopyResult("Share link copied! 📋", false);
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
      void handleCopyResult("Text card link copied! 📋", false);
    }
  };

  async function handleCopyResult(
    message = "Link copied! 📋",
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
        addToast("Couldn't copy link", 3000);
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
      ? "QRBuddy text card"
      : isFilePage
      ? "QRBuddy download page"
      : "QRBuddy file locker";
    const text = isTextCard
      ? "Read this note on QRBuddy."
      : isFilePage
      ? "Download this file from QRBuddy."
      : "Upload to this QRBuddy file locker.";

    if (typeof navigator === "undefined" || !navigator.share) {
      await handleCopyResult("Share link copied! 📋");
      return;
    }

    try {
      await navigator.share({ title, text, url: resultUrl });
      haptics.medium();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Native share failed:", error);
      await handleCopyResult("Share link copied! 📋");
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
              placeholder="Type a note, a code, a secret..."
              rows={4}
              maxLength={2900}
              // deno-lint-ignore jsx-boolean-value
              autoFocus={true}
              class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none transition-colors resize-none font-medium"
            />
            {url.value.trim() !== "" && (
              <div class="flex items-center justify-between gap-2 animate-slide-down">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-green-50 border-2 border-green-300 px-3 py-1 text-xs font-bold text-green-800">
                  ✓ Stored in the QR itself — works offline
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
              title="A short link and a cleaner read for long text"
            >
              {isCreatingLocker
                ? "Creating note page…"
                : "↗ Host as a note page instead"}
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
      />
    );
  };

  const renderTypeTab = () => (
    <div class="space-y-5">
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Core types
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QR_TYPE_ORDER.map((key) => {
            const template = QR_TEMPLATES[key];
            const copy = QR_TYPE_COPY[key];
            return (
              <ChoiceRow
                key={key}
                icon={template.icon}
                title={copy?.label ?? template.label}
                description={copy?.description ?? template.description}
                active={typeIntent === "qr" && selectedTemplate === key}
                onClick={() => handleTemplateSelect(key)}
              />
            );
          })}
          <ChoiceRow
            icon="📲"
            title="Contact me"
            description="Call, text, or email you — you pick."
            active={typeIntent === "qr" &&
              CONTACT_TYPES.includes(selectedTemplate)}
            onClick={() => handleTemplateSelect("phone")}
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
          Files & drops
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceRow
            icon="📂"
            title="Share a file"
            description="Download page for one file, optional PIN."
            active={typeIntent === "share-file"}
            onClick={handleShareFileSelect}
          />
          <ChoiceRow
            icon="🪣"
            title="Collect files"
            description="A locker people drop files into."
            active={typeIntent === "collect-files" || lockerActive}
            onClick={handleCollectFilesSelect}
          />
          <ChoiceRow
            icon="📦"
            title="Bulk create"
            description="Paste links, download a ZIP of QRs."
            active={isBatchMode}
            onClick={() => {
              const next = !isBatchMode;
              setIsBatchMode(next);
              if (next) {
                if (lockerActive) addToast("Locker cleared from this QR");
                disableDynamicBase();
                isBucket.value = false;
                bucketUrl.value = "";
              }
              haptics.light();
            }}
          />
        </div>
        {isBatchMode && (
          <BatchSettings
            batchUrls={batchUrls}
            setBatchUrls={setBatchUrls}
            isGeneratingBatch={isGeneratingBatch}
            batchProgress={batchProgress}
            onGenerateBatch={onGenerateBatch}
          />
        )}
      </section>

      <div class="pt-2">
        {typeIntent === "share-file" && (
          <MediaHubForm
            url={url}
            onCreated={() => {
              setTypeIntent("share-file");
              setCompletionKind("share-file");
              setShowLockerSettings(false);
              setActiveTab("type");
              void handleCopyResult("Share link copied! 📋", false);
            }}
          />
        )}
        {typeIntent === "collect-files" && showLockerSettings && (
          <LockerSettings
            isActive={lockerActive}
            bucketUrl={bucketUrl.value}
            isCreating={isCreatingLocker}
            onClose={() => setShowLockerSettings(false)}
            onDisable={handleLockerDisableWrapper}
            onConfirm={handleLockerConfirmWrapper}
          />
        )}
        {typeIntent === "qr" && (
          <div class="animate-slide-down">
            {CONTACT_TYPES.includes(selectedTemplate) && (
              <div class="grid grid-cols-3 gap-2 mb-3">
                {CONTACT_SEGMENTS.map((seg) => (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(seg.key);
                      haptics.light();
                    }}
                    aria-pressed={selectedTemplate === seg.key}
                    class={`min-h-[44px] rounded-full border-2 px-2 font-black text-sm transition-all ${
                      selectedTemplate === seg.key
                        ? "border-black bg-amber-200 text-black shadow-chunky"
                        : "border-black/15 bg-white text-neutral-700 hover:border-black/60"
                    }`}
                  >
                    {seg.icon} {seg.label}
                  </button>
                ))}
              </div>
            )}
            {renderTemplateForm()}
            {selectedTemplate === "url" && !isDynamic.value && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("options");
                  haptics.light();
                }}
                class="w-full min-h-[44px] mt-1 text-sm font-bold text-neutral-500 hover:text-qr-pop transition-colors"
              >
                Want to repoint this after printing? →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderOptionsTab = () => (
    <div class="space-y-5">
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Link behavior
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
          <ChoiceRow
            rich
            icon="⚡"
            title="Static"
            description="The content lives inside the squares. Works forever, offline, and never touches a server."
            active={!isDynamic.value && !isBatchMode && !lockerActive}
            onClick={() => {
              if (lockerActive) addToast("Locker cleared from this QR");
              disableDynamicBase();
              setIsBatchMode(false);
              isBucket.value = false;
              bucketUrl.value = "";
              haptics.light();
            }}
          />

          <ChoiceRow
            rich
            icon="🔗"
            title="Editable"
            description="A short link you can repoint after printing. Coarse scan stats, no IPs, no visitor tracking."
            active={isDynamic.value}
            onClick={() => {
              if (isDynamic.value) {
                disableDynamicBase();
              } else {
                activateDynamicBase();
              }
              haptics.light();
            }}
          />
        </div>
        {isDynamic.value && (
          <EditableLinkSettings
            editUrl={editUrl}
            pendingUrl={url.value}
            isCreating={isCreatingEditable}
            onCreate={onCreateEditable}
            isSequential={isSequential}
            sequentialUrls={sequentialUrls}
          />
        )}
      </section>

      {isDynamic.value && (
        <section class="space-y-2 animate-slide-down">
          <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
            Editable extras
          </h3>

          {/* Frequency order: limits are the common ask, rotation the exotic one. */}
          <ChoiceRow
            icon="⏳"
            title="Scan & date limits"
            description="Stop the QR after a scan count or expiry date."
            active={isLimitSettingsOpen}
            onClick={() => {
              const next = !isLimitSettingsOpen;
              if (!next) {
                setScanLimit(null);
                setExpiryDate("");
              }
              setIsLimitSettingsOpen(next);
              haptics.light();
            }}
          />
          {isLimitSettingsOpen && (
            <TimeBombSettings
              scanLimit={scanLimit}
              setScanLimit={setScanLimit}
              expiryDate={expiryDate}
              setExpiryDate={setExpiryDate}
            />
          )}

          <ChoiceRow
            icon="🔁"
            title="Link rotation"
            description="Each scan moves to the next URL in your list."
            active={isSequential}
            onClick={() => {
              setIsSequential(!isSequential);
              haptics.light();
            }}
          />
          {isSequential && (
            <MultiLinkSettings
              sequentialUrls={sequentialUrls}
              setSequentialUrls={setSequentialUrls}
              loopSequence={loopSequence}
              setLoopSequence={setLoopSequence}
            />
          )}

          <ChoiceRow
            icon="✨"
            title="Intro page"
            description="Show a short landing page before redirecting."
            active={splashActive}
            onClick={() => {
              splashConfig.value = splashActive ? null : {
                enabled: true,
                title: "Welcome!",
                buttonText: "Continue",
              };
              haptics.light();
            }}
          />
          {splashActive && (
            <SplashSettings
              splashConfig={splashConfig}
              destinationUrl={url.value}
            />
          )}
        </section>
      )}
    </div>
  );

  const renderDesignTab = () => (
    <DesignTab
      url={url}
      qrStyle={qrStyle}
      logoUrl={logoUrl}
      frameConfig={frameConfig}
      onClose={shell.requestClose}
    />
  );

  // Labels carry the meaning; the emoji were garnish on navigation, which the
  // footer-charm exception doesn't cover. 🎯 for "Type" was arbitrary anyway.
  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: "type", label: "Content" },
    { id: "options", label: "Behavior" },
    { id: "design", label: "Design" },
  ];
  const hasCompletion = completionKind !== null && bucketUrl.value !== "";

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        ref={shell.backdropRef}
        class="absolute inset-0 bg-qr-scrim/60 backdrop-blur-sm transition-opacity"
        onClick={shell.onBackdropClick}
      />

      <div
        ref={shell.dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        tabindex={-1}
        class="relative w-full max-w-lg bg-qr-cream sm:border-4 sm:border-black rounded-t-3xl sm:rounded-3xl shadow-chunky-hover max-h-[92dvh] flex flex-col animate-slide-up sm:animate-pop-in overflow-hidden"
      >
        <div class="flex items-start justify-between gap-3 p-4 sm:p-6 pb-2 sm:pb-3">
          <div>
            <h2
              id="create-modal-title"
              class="font-black text-2xl tracking-tight text-black leading-tight"
            >
              {hasCompletion ? "Ready to share." : "Make it do tricks."}
            </h2>
            <p class="text-sm font-bold text-qr-pop">
              {hasCompletion
                ? "The QR now points at the new page."
                : "What it does, how it reacts, how it looks."}
            </p>
          </div>
          <button
            type="button"
            onClick={shell.requestClose}
            class="shrink-0 w-9 h-9 rounded-full bg-white border-2 border-black text-black font-black text-base leading-none flex items-center justify-center shadow-chunky transition-transform hover:scale-110 hover:rotate-90 active:scale-90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!hasCompletion && (
          <div class="px-4 sm:px-6 pt-2">
            <div class="grid grid-cols-3 gap-1 rounded-full bg-amber-50 p-1 border-2 border-black">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    haptics.light();
                  }}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                  class={`min-h-[40px] rounded-full text-sm font-black transition-all flex items-center justify-center ${
                    activeTab === tab.id
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-amber-100"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div class="flex-1 overflow-y-auto scrollbar-none p-4 sm:p-6 sm:h-[min(480px,56dvh)] sm:flex-none">
          {hasCompletion ? renderCompletionState() : (
            <>
              {activeTab === "type" && renderTypeTab()}
              {activeTab === "options" && renderOptionsTab()}
              {activeTab === "design" && renderDesignTab()}
            </>
          )}
        </div>

        <div class="p-4 sm:p-6 pt-2 sm:pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
          <button
            type="button"
            onClick={shell.requestClose}
            class="w-full min-h-[52px] rounded-full border-3 border-black bg-qr-pop text-white text-lg font-black shadow-chunky hover:scale-[1.02] hover:bg-qr-popDeep hover:shadow-chunky-hover active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            <span>
              {hasCompletion
                ? "Done — Back to Home 🏠"
                : activeTab === "design"
                ? "Done — Apply Design 🎨"
                : "Done — View QR ✨"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

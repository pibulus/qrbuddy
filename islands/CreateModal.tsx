import type { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { QR_TEMPLATES, QRTemplateType } from "../types/qr-templates.ts";
import { haptics } from "../utils/haptics.ts";
import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import WiFiForm from "./templates/WiFiForm.tsx";
import VCardForm from "./templates/VCardForm.tsx";
import SMSForm from "./templates/SMSForm.tsx";
import EmailForm from "./templates/EmailForm.tsx";
import WebsiteForm from "./templates/WebsiteForm.tsx";
import SocialHubForm from "./templates/SocialHubForm.tsx";
import MediaHubForm from "./templates/MediaHubForm.tsx";
import LockerSettings from "./extras/LockerSettings.tsx";
import BatchSettings from "./extras/BatchSettings.tsx";
import LogoSettings from "./extras/LogoSettings.tsx";
import EditableLinkSettings from "./extras/EditableLinkSettings.tsx";
import MultiLinkSettings from "./extras/MultiLinkSettings.tsx";
import TimeBombSettings from "./extras/TimeBombSettings.tsx";
import SplashSettings from "./extras/SplashSettings.tsx";

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
  isCreatingLocker: boolean;
  splashConfig: Signal<
    {
      enabled: boolean;
      title: string;
      buttonText: string;
      imageUrl?: string;
      description?: string;
    } | null
  >;
}

interface ChoiceRowProps {
  icon: string;
  title: string;
  description: string;
  active?: boolean;
  eyebrow?: string;
  onClick: () => void;
}

const QR_TYPE_ORDER: QRTemplateType[] = [
  "url",
  "text",
  "wifi",
  "vcard",
  "social",
  "sms",
  "email",
];

const QR_TYPE_COPY: Partial<
  Record<QRTemplateType, { label: string; description: string }>
> = {
  url: {
    label: "Link",
    description: "Send scanners to a website or page.",
  },
  text: {
    label: "Plain text",
    description: "Show a note, code, or message.",
  },
  vcard: {
    label: "Contact card",
    description: "Save a person or business contact.",
  },
  social: {
    label: "Social profile",
    description: "Point to Instagram, X, YouTube, and more.",
  },
  sms: {
    label: "Text message",
    description: "Open a pre-filled SMS.",
  },
  email: {
    label: "Email",
    description: "Open a pre-filled email.",
  },
};

function ChoiceRow(
  { icon, title, description, active = false, eyebrow, onClick }:
    ChoiceRowProps,
) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`group w-full min-h-[64px] rounded-2xl border-3 px-3 py-3 text-left transition-all flex items-center gap-3 ${
        active
          ? "border-black bg-[#FFF8F0] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]"
          : "border-gray-200 bg-white hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <span class="w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center text-xl shrink-0">
        {icon}
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2">
          <span class="font-black text-gray-900 leading-tight">{title}</span>
          {active && (
            <span class="rounded-full bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              Active
            </span>
          )}
        </span>
        <span class="block text-xs sm:text-sm text-gray-600 leading-snug mt-0.5">
          {description}
        </span>
      </span>
      {eyebrow && (
        <span class="hidden sm:inline rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-500">
          {eyebrow}
        </span>
      )}
    </button>
  );
}

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
  isCreatingLocker,
  splashConfig,
}: CreateModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("type");
  const [typeIntent, setTypeIntent] = useState<TypeIntent>("qr");
  const [showLockerSettings, setShowLockerSettings] = useState(false);
  const [isLimitSettingsOpen, setIsLimitSettingsOpen] = useState(false);
  const [showBatchSettings, setShowBatchSettings] = useState(false);

  const lockerActive = isBucket.value && bucketUrl.value !== "";
  const splashActive = splashConfig.value?.enabled ?? false;
  const logoActive = logoUrl.value.trim() !== "";

  useEffect(() => {
    if (scanLimit !== null || expiryDate !== "") {
      setIsLimitSettingsOpen(true);
    }
  }, [scanLimit, expiryDate]);

  useEffect(() => {
    if (!isOpen) {
      setTypeIntent("qr");
      setShowLockerSettings(false);
      setShowBatchSettings(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activateDynamicBase = () => {
    isDynamic.value = true;
    isBucket.value = false;
    bucketUrl.value = "";
    setIsBatchMode(false);
    setShowLockerSettings(false);
    setShowBatchSettings(false);
  };

  const disableDynamicBase = () => {
    isDynamic.value = false;
    setIsSequential(false);
    setIsLimitSettingsOpen(false);
    setScanLimit(null);
    setExpiryDate("");
    splashConfig.value = null;
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
    setIsBatchMode(false);
    setShowLockerSettings(false);
    haptics.light();
  };

  const handleCollectFilesSelect = () => {
    setTypeIntent("collect-files");
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
    }
    return success;
  };

  const handleLockerDisableWrapper = () => {
    onLockerDisable();
    setShowLockerSettings(false);
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
      case "text":
        return (
          <div class="space-y-4 animate-slide-down">
            <div class="bg-gray-50 border-3 border-gray-200 rounded-xl p-4 shadow-chunky">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">📝</span>
                <h3 class="font-black text-gray-900">Plain text</h3>
              </div>
              <p class="text-sm text-gray-600">
                Display any text message, code, or note.
              </p>
            </div>
            <textarea
              value={url.value}
              onInput={(e) => {
                url.value = (e.target as HTMLTextAreaElement).value;
                haptics.light();
              }}
              placeholder="Enter your text here..."
              rows={4}
              class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-black focus:outline-none transition-colors resize-none font-medium"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderTypeTab = () => (
    <div class="space-y-5">
      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            What should this QR contain?
          </h3>
          <p class="text-sm text-gray-600">
            Pick a type, then fill in only the fields that matter.
          </p>
        </div>

        <div class="space-y-2">
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
        </div>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
          Files
        </h3>
        <ChoiceRow
          icon="📂"
          title="Share a file"
          description="Create a download page for one file."
          active={typeIntent === "share-file"}
          eyebrow="File"
          onClick={handleShareFileSelect}
        />
        <ChoiceRow
          icon="🪣"
          title="Collect files"
          description="Create a QR locker people can upload to."
          active={typeIntent === "collect-files" || lockerActive}
          eyebrow="Locker"
          onClick={handleCollectFilesSelect}
        />
      </section>

      <div class="pt-2">
        {typeIntent === "share-file" && <MediaHubForm url={url} />}
        {typeIntent === "collect-files" && showLockerSettings && (
          <LockerSettings
            isActive={lockerActive}
            bucketUrl={bucketUrl.value}
            defaultStyle={qrStyle.value || "sunset"}
            isCreating={isCreatingLocker}
            onClose={() => setShowLockerSettings(false)}
            onDisable={handleLockerDisableWrapper}
            onConfirm={handleLockerConfirmWrapper}
          />
        )}
        {typeIntent === "qr" && (
          <div class="animate-slide-down">{renderTemplateForm()}</div>
        )}
      </div>
    </div>
  );

  const renderOptionsTab = () => (
    <div class="space-y-6">
      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Link behavior
          </h3>
          <p class="text-sm text-gray-600">
            Start simple. Add editable or expiring behavior only when needed.
          </p>
        </div>

        <ChoiceRow
          icon="⚡"
          title="Static QR"
          description="The QR points directly at the current input."
          active={!isDynamic.value && !isBatchMode && !lockerActive}
          onClick={() => {
            disableDynamicBase();
            setIsBatchMode(false);
            isBucket.value = false;
            bucketUrl.value = "";
            haptics.light();
          }}
        />

        <ChoiceRow
          icon="🔗"
          title="Editable QR"
          description="Change the destination later without reprinting."
          active={isDynamic.value && !isSequential && !isLimitSettingsOpen &&
            !splashActive}
          onClick={() => {
            if (
              isDynamic.value && !isSequential && !isLimitSettingsOpen &&
              !splashActive
            ) {
              disableDynamicBase();
            } else {
              activateDynamicBase();
              setIsSequential(false);
              setIsLimitSettingsOpen(false);
              setScanLimit(null);
              setExpiryDate("");
              splashConfig.value = null;
            }
            haptics.light();
          }}
        />
        {isDynamic.value && !isSequential && !isLimitSettingsOpen &&
          !splashActive && (
          <EditableLinkSettings
            editUrl={editUrl}
            isSequential={isSequential}
            isTimeBombActive={isLimitSettingsOpen}
          />
        )}

        <ChoiceRow
          icon="🔁"
          title="Link rotation"
          description="Rotate through different URLs with each scan."
          active={isSequential}
          onClick={() => {
            const next = !isSequential;
            if (next) {
              activateDynamicBase();
              setIsLimitSettingsOpen(false);
              setScanLimit(null);
              setExpiryDate("");
            }
            setIsSequential(next);
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
          icon="⏳"
          title="Scan & date limits"
          description="Stop the QR after a scan count or expiry date."
          active={isLimitSettingsOpen}
          onClick={() => {
            const next = !isLimitSettingsOpen;
            if (next) {
              activateDynamicBase();
              setIsSequential(false);
            } else {
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
          icon="✨"
          title="Intro page"
          description="Show a short landing page before redirecting."
          active={splashActive}
          onClick={() => {
            const next = !splashActive;
            if (next) {
              activateDynamicBase();
              splashConfig.value = {
                enabled: true,
                title: "Welcome!",
                buttonText: "Continue",
              };
            } else {
              splashConfig.value = null;
            }
            haptics.light();
          }}
        />
        {splashActive && <SplashSettings splashConfig={splashConfig} />}
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
          Bulk
        </h3>
        <ChoiceRow
          icon="📦"
          title="Bulk create"
          description="Generate a ZIP of QR codes from a list."
          active={isBatchMode}
          onClick={() => {
            const next = !isBatchMode;
            setIsBatchMode(next);
            setShowBatchSettings(next);
            if (next) {
              disableDynamicBase();
              isBucket.value = false;
              bucketUrl.value = "";
            }
            haptics.light();
          }}
        />
        {(isBatchMode || showBatchSettings) && (
          <BatchSettings
            batchUrls={batchUrls}
            setBatchUrls={setBatchUrls}
            isGeneratingBatch={isGeneratingBatch}
            batchProgress={batchProgress}
            onGenerateBatch={onGenerateBatch}
          />
        )}
      </section>
    </div>
  );

  const renderDesignTab = () => (
    <div class="space-y-4">
      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Appearance
          </h3>
          <p class="text-sm text-gray-600">
            Style lives in the main picker. Use logo when the QR has enough
            contrast and room to scan cleanly.
          </p>
        </div>
        <div
          class={`w-full min-h-[64px] rounded-2xl border-3 px-3 py-3 text-left flex items-center gap-3 ${
            logoActive
              ? "border-black bg-[#FFF8F0] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "border-gray-200 bg-white"
          }`}
        >
          <span class="w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center text-xl shrink-0">
            🎨
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="font-black text-gray-900 leading-tight">Logo</span>
              {logoActive && (
                <span class="rounded-full bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  Added
                </span>
              )}
            </span>
            <span class="block text-xs sm:text-sm text-gray-600 leading-snug mt-0.5">
              Add a center mark to the QR.
            </span>
          </span>
        </div>
        <LogoSettings logoUrl={logoUrl} />
      </section>
    </div>
  );

  const tabs: Array<{ id: ActiveTab; label: string; icon: string }> = [
    { id: "type", label: "Type", icon: "🎯" },
    { id: "options", label: "Options", icon: "⚙️" },
    { id: "design", label: "Design", icon: "🎨" },
  ];

  return (
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div class="relative w-full max-w-3xl bg-white sm:border-4 sm:border-black rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col animate-slide-up sm:animate-pop-in overflow-hidden">
        <div class="flex items-start justify-between gap-3 p-4 sm:p-6 border-b-2 border-gray-100">
          <div>
            <p class="text-xs uppercase tracking-wide text-pink-500 font-black">
              Create
            </p>
            <h2 class="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              What should this QR do?
            </h2>
            <p class="text-sm text-gray-600">
              Pick the type first. Add options only when they help.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 transition-colors text-2xl font-black text-gray-500"
            aria-label="Close create modal"
          >
            ×
          </button>
        </div>

        <div class="px-4 sm:px-6 pt-3">
          <div class="grid grid-cols-3 gap-2 rounded-2xl bg-gray-100 p-1 border-2 border-gray-200">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  haptics.light();
                }}
                class={`min-h-[44px] rounded-xl text-sm font-black transition-all flex items-center justify-center gap-1 ${
                  activeTab === tab.id
                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "type" && renderTypeTab()}
          {activeTab === "options" && renderOptionsTab()}
          {activeTab === "design" && renderDesignTab()}
        </div>

        <div class="p-4 sm:p-6 border-t-2 border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            class="w-full min-h-[52px] bg-black text-white text-lg sm:text-xl font-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

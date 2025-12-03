import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";
import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import LockerSettings from "./extras/LockerSettings.tsx";
import BatchSettings from "./extras/BatchSettings.tsx";
import LogoSettings from "./extras/LogoSettings.tsx";
import EditableLinkSettings from "./extras/EditableLinkSettings.tsx";
import MultiLinkSettings from "./extras/MultiLinkSettings.tsx";
import TimeBombSettings from "./extras/TimeBombSettings.tsx";
import SplashSettings from "./extras/SplashSettings.tsx";

interface ExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  // Batch Mode Props
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: () => void;
  onLockerConfirm: (options: CreateBucketOptions) => Promise<boolean>;
  onLockerDisable: () => void;
  isCreatingLocker: boolean;
  splashConfig: Signal<{
    enabled: boolean;
    title: string;
    buttonText: string;
    imageUrl?: string;
    description?: string;
  } | null>;
}

export default function ExtrasModal({
  isOpen,
  onClose,
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
}: ExtrasModalProps) {
  const [showLogoUploader, setShowLogoUploader] = useState(false);
  const [lockerExpanded, setLockerExpanded] = useState(false);

  // New state for Time Bomb visibility (derived from limits being active)
  const [isTimeBombActive, setIsTimeBombActive] = useState(false);

  // Sync Time Bomb state with actual limits
  useEffect(() => {
    if (scanLimit !== null || expiryDate !== "") {
      setIsTimeBombActive(true);
    }
  }, [scanLimit, expiryDate]);

  useEffect(() => {
    if (!isOpen) {
      setLockerExpanded(false);
    }
  }, [isOpen]);

  const lockerActive = isBucket.value && bucketUrl.value !== "";
  const splashActive = splashConfig.value?.enabled ?? false;

  const handleLockerCardClick = () => {
    setLockerExpanded((prev) => !prev);
    haptics.light();
  };

  const handleLockerConfirmWrapper = async (options: CreateBucketOptions) => {
    const success = await onLockerConfirm(options);
    if (success) {
      setLockerExpanded(false);
      setIsTimeBombActive(false);
      setScanLimit(null);
      setExpiryDate("");
      splashConfig.value = null;
    }
    return success;
  };

  const handleLockerDisableWrapper = () => {
    onLockerDisable();
    setLockerExpanded(false);
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center px-4 py-4">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div class="relative z-10 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-bounce-in">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-pink-500 font-bold">
              Power-Ups
            </p>
            <p class="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Make it dynamic
            </p>
            <p class="text-xs sm:text-sm text-gray-600">
              Editable links, file buckets, custom logos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              addToast("Power Ups updated! 🚀");
            }}
            class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close power ups modal"
          >
            ×
          </button>
        </div>

        <div class="space-y-4">
          {/* Mutual Exclusion Notice */}
          {(isDynamic.value || isBucket.value) && (
            <div class="bg-[#FFF8F0] border-2 border-[#FFE5B4] rounded-xl p-3 text-xs text-gray-700 leading-relaxed animate-slide-down">
              💡 <strong>Note:</strong>{" "}
              Editable link and file locker are mutually exclusive—pick one per
              QR.
            </div>
          )}

          {/* Main Power-Up Cards */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Editable Link */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  const newState = !isDynamic.value;
                  isDynamic.value = newState;

                  if (newState) {
                    // Enable Editable Link -> Disable everything else
                    isBucket.value = false;
                    bucketUrl.value = "";
                    setLockerExpanded(false);
                    setIsBatchMode(false);
                    setIsSequential(false);
                    setIsTimeBombActive(false);
                    setScanLimit(null);
                    setExpiryDate("");
                    splashConfig.value = null;
                  } else {
                    // Disable Editable Link -> Disable dependent features too
                    setIsSequential(false);
                    setIsTimeBombActive(false);
                    setScanLimit(null);
                    setExpiryDate("");
                    splashConfig.value = null;
                  }
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  isDynamic.value && !isSequential && !isTimeBombActive && !splashActive
                    ? "bg-gradient-to-br from-[#FFB3D9] to-[#C9A0DC] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  🔗
                </div>
                <div class="font-black text-sm text-gray-900">
                  Editable link
                </div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Print once, update forever. Perfect for menus, events, or merch.
                </div>
                {isDynamic.value && !isSequential && !isTimeBombActive && !splashActive && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-[#9370DB]">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Editable Link Settings */}
              {isDynamic.value && !isSequential && !isTimeBombActive && !splashActive && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <EditableLinkSettings
                    editUrl={editUrl}
                    isSequential={isSequential}
                    isTimeBombActive={isTimeBombActive}
                  />
                </div>
              )}
            </div>

            {/* 2. File Locker */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={handleLockerCardClick}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  lockerActive
                    ? "bg-gradient-to-br from-[#B0E5E8] to-[#A3E4E1] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  🪣
                </div>
                <div class="font-black text-sm text-gray-900">
                  File Locker
                </div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Secure digital drop box. Scan to upload, scan again to download.
                </div>
                {lockerActive && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-[#3AA8A4]">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Locker Settings */}
              {lockerExpanded && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <LockerSettings
                    isActive={lockerActive}
                    bucketUrl={bucketUrl.value}
                    defaultStyle={qrStyle.value || "sunset"}
                    isCreating={isCreatingLocker}
                    onClose={() => setLockerExpanded(false)}
                    onDisable={handleLockerDisableWrapper}
                    onConfirm={handleLockerConfirmWrapper}
                  />
                </div>
              )}
            </div>

            {/* 3. Batch Mode */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  const newState = !isBatchMode;
                  setIsBatchMode(newState);
                  if (newState) {
                    isDynamic.value = false;
                    isBucket.value = false;
                    bucketUrl.value = "";
                    setLockerExpanded(false);
                    setIsSequential(false);
                    setIsTimeBombActive(false);
                    setScanLimit(null);
                    setExpiryDate("");
                    splashConfig.value = null;
                  }
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  isBatchMode
                    ? "bg-gradient-to-br from-blue-100 to-cyan-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  📦
                </div>
                <div class="font-black text-sm text-gray-900">Batch Mode</div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Generate multiple QRs at once from a list.
                </div>
                {isBatchMode && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Batch Settings */}
              {isBatchMode && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <BatchSettings
                    batchUrls={batchUrls}
                    setBatchUrls={setBatchUrls}
                    isGeneratingBatch={isGeneratingBatch}
                    batchProgress={batchProgress}
                    onGenerateBatch={onGenerateBatch}
                  />
                </div>
              )}
            </div>

            {/* 4. Custom Logo */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  setShowLogoUploader(!showLogoUploader);
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  showLogoUploader
                    ? "bg-gradient-to-br from-[#FFE5B4] to-[#FFDAB3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  🎨
                </div>
                <div class="font-black text-sm text-gray-900">Custom logo</div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Add your brand to the QR center.
                </div>
                {showLogoUploader && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-[#CC9966]">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Logo Settings */}
              {showLogoUploader && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <LogoSettings logoUrl={logoUrl} />
                </div>
              )}
            </div>

            {/* 5. Splash Screen (NEW) */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  const newState = !splashActive;
                  if (newState) {
                    isDynamic.value = true; // Must be dynamic
                    isBucket.value = false;
                    bucketUrl.value = "";
                    setLockerExpanded(false);
                    setIsBatchMode(false);
                    // Exclusive: Disable other dynamic modes? No, Splash can stack!
                    // But for MVP UI simplicity, let's keep it somewhat exclusive or just stack it.
                    // Let's allow stacking with Time Bomb and Multi-Link eventually.
                    // For now, let's just enable it.
                    splashConfig.value = {
                      enabled: true,
                      title: "Welcome!",
                      buttonText: "Continue",
                    };
                  } else {
                    splashConfig.value = null;
                    // If no other dynamic features are active, should we disable dynamic?
                    // Let's keep dynamic active if it was already active.
                    if (!isSequential && !isTimeBombActive && !editUrl.value) {
                      isDynamic.value = false;
                    }
                  }
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  splashActive
                    ? "bg-gradient-to-br from-green-100 to-emerald-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  ✨
                </div>
                <div class="font-black text-sm text-gray-900">Splash Page</div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Show a welcome screen before redirecting.
                </div>
                {splashActive && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Splash Settings */}
              {splashActive && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <SplashSettings splashConfig={splashConfig} />
                </div>
              )}
            </div>

            {/* 6. Multi-Link (Sequential) */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  const newState = !isSequential;
                  setIsSequential(newState);
                  if (newState) {
                    isDynamic.value = true; // Must be dynamic
                    isBucket.value = false;
                    bucketUrl.value = "";
                    setLockerExpanded(false);
                    setIsBatchMode(false);
                    // Exclusive: Disable Time Bomb
                    setIsTimeBombActive(false);
                    setScanLimit(null);
                    setExpiryDate("");
                  } else {
                    // isDynamic.value = false; // Don't disable dynamic, might have other features
                  }
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  isSequential
                    ? "bg-gradient-to-br from-purple-100 to-indigo-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  ⛓️
                </div>
                <div class="font-black text-sm text-gray-900">Multi-Link</div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Rotate through different URLs with each scan.
                </div>
                {isSequential && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-indigo-600">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Multi-Link Settings */}
              {isSequential && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <MultiLinkSettings
                    sequentialUrls={sequentialUrls}
                    setSequentialUrls={setSequentialUrls}
                    loopSequence={loopSequence}
                    setLoopSequence={setLoopSequence}
                  />
                </div>
              )}
            </div>

            {/* 7. Time Bomb (Limits) */}
            <div class="contents sm:block">
              <button
                type="button"
                onClick={() => {
                  const newState = !isTimeBombActive;
                  setIsTimeBombActive(newState);
                  if (newState) {
                    isDynamic.value = true; // Must be dynamic
                    isBucket.value = false;
                    bucketUrl.value = "";
                    setLockerExpanded(false);
                    setIsBatchMode(false);
                    // Exclusive: Disable Multi-Link
                    setIsSequential(false);
                  } else {
                    // isDynamic.value = false;
                    setScanLimit(null);
                    setExpiryDate("");
                  }
                  haptics.light();
                }}
                class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left w-full ${
                  isTimeBombActive
                    ? "bg-gradient-to-br from-red-100 to-orange-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }`}
              >
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                  💣
                </div>
                <div class="font-black text-sm text-gray-900">Time Bomb</div>
                <div class="text-xs text-gray-600 leading-snug mt-1">
                  Self-destruct after X scans or on a specific date.
                </div>
                {isTimeBombActive && (
                  <div class="mt-2 flex items-center gap-1 text-xs font-bold text-red-600">
                    <span>✓</span>
                    Active
                  </div>
                )}
              </button>

              {/* Mobile: Time Bomb Settings */}
              {isTimeBombActive && (
                <div class="sm:hidden mt-3 mb-4 animate-slide-down">
                  <TimeBombSettings
                    scanLimit={scanLimit}
                    setScanLimit={setScanLimit}
                    expiryDate={expiryDate}
                    setExpiryDate={setExpiryDate}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Bottom Settings Area */}
          <div class="hidden sm:block">
            {lockerExpanded && (
              <LockerSettings
                isActive={lockerActive}
                bucketUrl={bucketUrl.value}
                defaultStyle={qrStyle.value || "sunset"}
                isCreating={isCreatingLocker}
                onClose={() => setLockerExpanded(false)}
                onDisable={handleLockerDisableWrapper}
                onConfirm={handleLockerConfirmWrapper}
              />
            )}
            {isBatchMode && (
              <BatchSettings
                batchUrls={batchUrls}
                setBatchUrls={setBatchUrls}
                isGeneratingBatch={isGeneratingBatch}
                batchProgress={batchProgress}
                onGenerateBatch={onGenerateBatch}
              />
            )}
            {showLogoUploader && <LogoSettings logoUrl={logoUrl} />}
            {isDynamic.value && !isSequential && !isTimeBombActive && !splashActive && (
              <EditableLinkSettings
                editUrl={editUrl}
                isSequential={isSequential}
                isTimeBombActive={isTimeBombActive}
              />
            )}
            {splashActive && <SplashSettings splashConfig={splashConfig} />}
            {isSequential && (
              <MultiLinkSettings
                sequentialUrls={sequentialUrls}
                setSequentialUrls={setSequentialUrls}
                loopSequence={loopSequence}
                setLoopSequence={setLoopSequence}
              />
            )}
            {isTimeBombActive && (
              <TimeBombSettings
                scanLimit={scanLimit}
                setScanLimit={setScanLimit}
                expiryDate={expiryDate}
                setExpiryDate={setExpiryDate}
              />
            )}
          </div>
        </div>

        <div class="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            class="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl border-3 border-black bg-gradient-to-br from-gray-900 to-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}

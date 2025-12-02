import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import LogoUploader from "./LogoUploader.tsx";
import { addToast } from "./ToastManager.tsx";
import type { CreateBucketOptions } from "../hooks/useBucketCreator.ts";
import { useKeypad } from "../hooks/useKeypad.ts";

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
}: ExtrasModalProps) {
  const [showLogoUploader, setShowLogoUploader] = useState(false);
  const [lockerExpanded, setLockerExpanded] = useState(false);
  const [lockerMode, setLockerMode] = useState<"open" | "single" | "pingpong">(
    "open",
  );
  const [lockerRequirePin, setLockerRequirePin] = useState(false);
  const [lockerStyle, setLockerStyle] = useState(qrStyle.value || "sunset");
  const [lockerError, setLockerError] = useState<string | null>(null);

  // New state for Time Bomb visibility (derived from limits being active)
  const [isTimeBombActive, setIsTimeBombActive] = useState(false);

  // Sync Time Bomb state with actual limits
  useEffect(() => {
    if (scanLimit !== null || expiryDate !== "") {
      setIsTimeBombActive(true);
    }
  }, [scanLimit, expiryDate]);

  // Use shared keypad hook for PIN entry
  const {
    digits: lockerPinDigits,
    handlePress: handleKeypadPress,
    reset: resetLockerPin,
    value: lockerPinValue,
  } = useKeypad(4);
  const lockerStyleOptions = [
    { value: "sunset", label: "Sunset" },
    { value: "pool", label: "Pool" },
    { value: "terminal", label: "Terminal" },
    { value: "candy", label: "Candy" },
    { value: "vapor", label: "Vapor" },
    { value: "brutalist", label: "Brutalist" },
  ];

  useEffect(() => {
    if (!isOpen) {
      setLockerExpanded(false);
      setLockerMode("open");
      setLockerRequirePin(false);
      resetLockerPin();
      setLockerError(null);
      setLockerStyle(qrStyle.value || "sunset");
    }
  }, [isOpen, resetLockerPin]);

  const lockerActive = isBucket.value && bucketUrl.value !== "";

  useEffect(() => {
    if (!lockerActive) {
      setLockerStyle(qrStyle.value || "sunset");
    }
  }, [qrStyle.value, lockerActive]);

  const handleLockerCardClick = () => {
    setLockerExpanded((prev) => !prev);
    haptics.light();
  };

  const handleLockerConfirmClick = async () => {
    setLockerError(null);

    if (lockerRequirePin && lockerPinValue.length !== 4) {
      setLockerError("Enter a 4-digit PIN to lock the bucket.");
      haptics.error();
      return;
    }

    const success = await onLockerConfirm({
      bucketType: "file",
      isReusable: lockerMode === "open" || lockerMode === "pingpong",
      deleteOnDownload: lockerMode === "pingpong",
      style: lockerStyle,
      password: lockerRequirePin ? lockerPinValue : undefined,
    });

    if (success) {
      setLockerExpanded(false);
      setLockerMode("open");
      setLockerRequirePin(false);
      resetLockerPin();

      // Ensure mutual exclusivity
      setIsTimeBombActive(false);
      setScanLimit(null);
      setExpiryDate("");
    } else {
      setLockerError("Couldn't create locker. Try again in a moment.");
    }
  };

  const handleLockerDisableClick = () => {
    onLockerDisable();
    setLockerExpanded(false);
    setLockerMode("open");
    setLockerRequirePin(false);
    resetLockerPin();
    setLockerError(null);
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
                } else {
                  // Disable Editable Link -> Disable dependent features too
                  setIsSequential(false);
                  setIsTimeBombActive(false);
                  setScanLimit(null);
                  setExpiryDate("");
                }
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                isDynamic.value && !isSequential && !isTimeBombActive
                  ? "bg-gradient-to-br from-[#FFB3D9] to-[#C9A0DC] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
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
              {isDynamic.value && !isSequential && !isTimeBombActive && (
                <div class="mt-2 flex items-center gap-1 text-xs font-bold text-[#9370DB]">
                  <span>✓</span>
                  Active
                </div>
              )}
            </button>

            {/* 2. File Locker */}
            <button
              type="button"
              onClick={handleLockerCardClick}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
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

            {/* 3. Batch Mode */}
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
                }
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
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

            {/* 4. Custom Logo */}
            <button
              type="button"
              onClick={() => {
                setShowLogoUploader(!showLogoUploader);
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
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

            {/* 5. Multi-Link (Sequential) */}
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
                  isDynamic.value = false;
                }
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
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

            {/* 6. Time Bomb (Limits) - NEW */}
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
                  isDynamic.value = false;
                  setScanLimit(null);
                  setExpiryDate("");
                }
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
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
          </div>

          {lockerExpanded && (
            <div class="bg-[#F0FFFB] border-3 border-black rounded-2xl p-4 space-y-4 animate-slide-down">
              {lockerActive
                ? (
                  <div class="space-y-4">
                    <div>
                      <p class="text-sm font-bold text-gray-900">
                        Locker ready to share
                      </p>
                      <p class="text-xs text-gray-600">
                        Print or send this QR to let people drop files.
                      </p>
                    </div>
                    <div class="bg-white border-2 border-dashed border-teal-200 rounded-xl p-3 text-xs font-mono break-all text-gray-700">
                      {bucketUrl.value || "Generating URL..."}
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="px-4 py-2 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition"
                        onClick={() => setLockerExpanded(false)}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 rounded-xl border-2 border-red-500 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 transition"
                        onClick={handleLockerDisableClick}
                      >
                        Disconnect locker
                      </button>
                    </div>
                  </div>
                )
                : (
                  <div class="space-y-4">
                    <div>
                      <p class="text-sm font-bold text-gray-900">
                        Build a locker before we print
                      </p>
                      <p class="text-xs text-gray-600">
                        Pick how it behaves, add an optional PIN, then confirm.
                      </p>
                    </div>

                    <div class="space-y-2">
                      <p class="text-xs font-bold uppercase tracking-wide text-gray-600">
                        Mode
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setLockerMode("open")}
                          class={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition ${
                            lockerMode === "open"
                              ? "bg-teal-500 text-white border-teal-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                          }`}
                        >
                          Open (Persistent)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockerMode("pingpong")}
                          class={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition ${
                            lockerMode === "pingpong"
                              ? "bg-purple-500 text-white border-purple-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-purple-400"
                          }`}
                        >
                          Ping Pong (Auto-Clear)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockerMode("single")}
                          class={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition ${
                            lockerMode === "single"
                              ? "bg-orange-500 text-white border-orange-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                          }`}
                        >
                          Single Drop (One-Time)
                        </button>
                      </div>
                      <p class="text-[11px] text-gray-500 italic">
                        {lockerMode === "open" &&
                          "Files stay in the locker until you delete them."}
                        {lockerMode === "pingpong" &&
                          "File is deleted after download, but the locker stays open for new uploads."}
                        {lockerMode === "single" &&
                          "Locker and file self-destruct after one download."}
                      </p>
                    </div>

                    <div class="space-y-3">
                      <div class="flex items-center justify-between gap-4">
                        <div>
                          <p class="text-xs font-bold uppercase tracking-wide text-gray-600">
                            Require 4-digit PIN?
                          </p>
                          <p class="text-[11px] text-gray-500">
                            Keep the locker invite-only.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !lockerRequirePin;
                            setLockerRequirePin(next);
                            if (!next) resetLockerPin();
                            haptics.light();
                          }}
                          class={`px-4 py-1 rounded-full border-2 text-xs font-bold transition ${
                            lockerRequirePin
                              ? "bg-teal-500 text-white border-teal-600"
                              : "bg-white text-gray-700 border-gray-300"
                          }`}
                        >
                          {lockerRequirePin ? "On" : "Off"}
                        </button>
                      </div>

                      {lockerRequirePin && (
                        <div class="space-y-3">
                          <div class="flex justify-center gap-4">
                            {lockerPinDigits.map((digit, index) => (
                              <div
                                key={`locker-pin-${index}`}
                                class="w-10 h-12 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-800"
                              >
                                {digit ? "•" : ""}
                              </div>
                            ))}
                          </div>
                          <div class="grid grid-cols-3 gap-2">
                            {[
                              "1",
                              "2",
                              "3",
                              "4",
                              "5",
                              "6",
                              "7",
                              "8",
                              "9",
                              "clear",
                              "0",
                              "back",
                            ].map(
                              (key) => (
                                <button
                                  key={`locker-pad-${key}`}
                                  type="button"
                                  class={`py-3 rounded-xl text-sm font-semibold border-2 bg-white transition ${
                                    key === "clear" || key === "back"
                                      ? "border-gray-300 text-gray-600"
                                      : "border-teal-200 text-gray-900"
                                  } hover:border-teal-400`}
                                  onClick={() => handleKeypadPress(String(key))}
                                >
                                  {key === "clear"
                                    ? "Clear"
                                    : key === "back"
                                    ? "⌫"
                                    : key}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-bold uppercase tracking-wide text-gray-600">
                        QR Style
                      </label>
                      <select
                        value={lockerStyle}
                        class="w-full px-4 py-2 border-2 border-gray-300 rounded-xl text-sm bg-white focus:border-black focus:outline-none"
                        onInput={(e) =>
                          setLockerStyle((e.target as HTMLSelectElement).value)}
                      >
                        {lockerStyleOptions.map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {lockerError && (
                      <p class="text-xs text-red-500">{lockerError}</p>
                    )}

                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="px-4 py-2 rounded-xl border-2 border-black bg-black text-white text-sm font-bold shadow-chunky hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={handleLockerConfirmClick}
                        disabled={isCreatingLocker}
                      >
                        {isCreatingLocker
                          ? "Creating locker..."
                          : "Create locker"}
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition"
                        onClick={() => {
                          setLockerExpanded(false);
                          setLockerError(null);
                          setLockerRequirePin(false);
                          resetLockerPin();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Batch Mode UI */}
          {isBatchMode && (
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border-3 border-blue-200 rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">📦</span>
                  <h3 class="font-black text-gray-900">Batch Generator</h3>
                </div>
                <span class="text-xs font-bold text-blue-500 bg-white px-2 py-1 rounded-lg border border-blue-100">
                  {batchUrls.split("\n").filter((u) => u.trim()).length} URLs
                </span>
              </div>

              <textarea
                value={batchUrls}
                onInput={(e) =>
                  setBatchUrls((e.target as HTMLTextAreaElement).value)}
                placeholder={`https://example.com\nhttps://google.com\nhttps://bing.com`}
                rows={5}
                class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none font-mono bg-white/80"
                disabled={isGeneratingBatch}
              />

              {isGeneratingBatch
                ? (
                  <div class="space-y-2">
                    <div class="h-3 bg-blue-100 rounded-full overflow-hidden border border-blue-200">
                      <div
                        class="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${batchProgress}%` }}
                      />
                    </div>
                    <p class="text-center text-xs font-bold text-blue-600 animate-pulse">
                      Generating... {batchProgress}%
                    </p>
                  </div>
                )
                : (
                  <button
                    type="button"
                    onClick={onGenerateBatch}
                    disabled={!batchUrls.trim()}
                    class="w-full py-3 text-sm font-black text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>⚡️</span> Generate ZIP
                  </button>
                )}
            </div>
          )}

          {showLogoUploader && (
            <div class="bg-gradient-to-r from-[#FFF8F0] to-[#FFE5B4] border-3 border-[#FFE5B4] rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
              <LogoUploader logoUrl={logoUrl} />
            </div>
          )}

          {isDynamic.value && (
            <div class="bg-gradient-to-r from-[#FFE5F0] to-[#F5E6FF] border-3 border-[#FF69B4] rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
              {/* Default Guidance for Editable Link */}
              {!isSequential && !isTimeBombActive && !editUrl.value && (
                <div class="flex items-start gap-3">
                  <span class="text-2xl">✨</span>
                  <div>
                    <h4 class="font-bold text-sm text-[#9370DB]">
                      Editable Mode Ready
                    </h4>
                    <p class="text-xs text-gray-700 leading-relaxed">
                      Close this menu and enter your destination URL. We'll
                      create a magic link you can update anytime.
                    </p>
                  </div>
                </div>
              )}
              {/* Multi-Link Settings */}
              {isSequential && (
                <div class="bg-white/60 rounded-xl p-3 mb-4 border-2 border-indigo-200">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-bold text-sm text-indigo-900">
                      Link Chain
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setLoopSequence(!loopSequence);
                        haptics.light();
                      }}
                      class={`text-xs font-bold px-2 py-1 rounded border-2 transition-colors ${
                        loopSequence
                          ? "bg-indigo-500 text-white border-indigo-600"
                          : "bg-white text-gray-500 border-gray-300"
                      }`}
                    >
                      {loopSequence ? "Looping 🔄" : "Loop: Off"}
                    </button>
                  </div>

                  <div class="space-y-2">
                    {sequentialUrls.map((url, index) => (
                      <div key={index} class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-400 w-4">
                          {index + 1}.
                        </span>
                        <input
                          type="url"
                          value={url}
                          placeholder={`https://site-${index + 1}.com`}
                          onInput={(e) => {
                            const newUrls = [...sequentialUrls];
                            newUrls[index] =
                              (e.target as HTMLInputElement).value;
                            setSequentialUrls(newUrls);
                          }}
                          class="flex-1 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        />
                        {sequentialUrls.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSequentialUrls(
                                sequentialUrls.filter((_, i) => i !== index),
                              );
                              haptics.medium();
                            }}
                            class="text-red-400 hover:text-red-600 px-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSequentialUrls([...sequentialUrls, ""]);
                        haptics.light();
                      }}
                      class="w-full py-1.5 text-xs font-bold text-indigo-600 border-2 border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                    >
                      + Add Link
                    </button>
                  </div>
                </div>
              )}

              {/* Time Bomb Settings */}
              {isTimeBombActive && (
                <div class="bg-white/60 rounded-xl p-3 mb-4 border-2 border-red-200 animate-slide-down">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-xl">💣</span>
                    <h4 class="font-bold text-sm text-red-900">
                      Time Bomb Settings
                    </h4>
                  </div>

                  <div class="space-y-4">
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
                                ? "bg-[#FF69B4] text-white border-[#D84A94] scale-105"
                                : "bg-white text-gray-700 border-gray-300 hover:border-[#FF69B4]"
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
                        class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-[#FF69B4] focus:outline-none"
                      />
                    </div>

                    <div class="bg-[#FFE5F0] border-2 border-[#FF69B4] rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                      💡 <strong>Set to 1 for a self-destruct QR.</strong>{" "}
                      Higher limits let you reuse and edit anytime. No tracking,
                      ever.
                    </div>
                  </div>
                </div>
              )}

              {editUrl.value && (
                <div class="bg-gradient-to-r from-[#F5E6FF] to-[#FFE5F0] border-3 border-[#9370DB] rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">✨</span>
                    <p class="text-sm font-black text-[#6B46A8]">
                      Editable QR created!
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      value={editUrl.value}
                      readOnly
                      class="flex-1 px-3 py-2 bg-white border-2 border-[#9370DB] rounded-lg text-xs font-mono"
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
                      class="px-4 py-2 bg-[#9370DB] text-white rounded-lg font-semibold text-sm hover:bg-[#6B46A8] transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p class="text-xs text-[#6B46A8]">
                    Bookmark this link—you'll need it to edit your QR later.
                  </p>
                </div>
              )}
            </div>
          )}

          {isBucket.value && (
            <div class="bg-gradient-to-r from-[#E0FFFF] to-[#B0E5E8] border-3 border-[#4ECDC4] rounded-xl p-4 space-y-4 shadow-chunky animate-slide-down">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🪣</span>
                  <h3 class="font-black text-gray-900">
                    Locker Settings
                  </h3>
                </div>
                {bucketUrl.value && (
                  <button
                    type="button"
                    onClick={() => {
                      bucketUrl.value = "";
                      // Trigger creation happens in SmartInput effect
                      haptics.medium();
                    }}
                    class="text-xs font-bold text-[#3AA8A4] hover:text-teal-700 underline decoration-2 underline-offset-2"
                  >
                    ↻ Reset
                  </button>
                )}
              </div>

              {bucketUrl.value
                ? (
                  <div class="space-y-3">
                    <div class="bg-white/50 rounded-lg p-3 text-sm text-gray-800 leading-relaxed">
                      <strong>Your locker is active.</strong>
                      <br />
                      Scan the QR to upload files. Scan it again to download
                      them.
                    </div>

                    <div class="space-y-1">
                      <label class="text-xs font-bold text-[#3AA8A4] uppercase tracking-wide">
                        Locker URL
                      </label>
                      <div class="flex gap-2">
                        <input
                          type="text"
                          value={bucketUrl.value}
                          readOnly
                          class="flex-1 px-3 py-2 bg-white border-2 border-[#4ECDC4] rounded-lg text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(bucketUrl.value);
                            haptics.success();
                            const event = new CustomEvent("show-toast", {
                              detail: {
                                message: "Locker URL copied! 📋",
                                type: "success",
                              },
                            });
                            globalThis.dispatchEvent(event);
                          }}
                          class="px-4 py-2 bg-[#4ECDC4] text-white rounded-lg font-semibold text-sm hover:bg-[#3AA8A4] transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )
                : (
                  <div class="flex items-center gap-3 py-2">
                    <div class="animate-spin text-2xl">⚙️</div>
                    <p class="font-bold text-[#3AA8A4]">
                      Building your locker...
                    </p>
                  </div>
                )}
            </div>
          )}
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

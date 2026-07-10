import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { useKeypad } from "../../hooks/useKeypad.ts";
import type { CreateBucketOptions } from "../../hooks/useBucketCreator.ts";

interface LockerSettingsProps {
  isActive: boolean;
  bucketUrl: string;
  isCreating: boolean;
  onClose: () => void;
  onDisable: () => void;
  onConfirm: (options: CreateBucketOptions) => Promise<boolean>;
}

export default function LockerSettings({
  isActive,
  bucketUrl,
  isCreating,
  onClose,
  onDisable,
  onConfirm,
}: LockerSettingsProps) {
  const [lockerMode, setLockerMode] = useState<"open" | "single" | "pingpong">(
    "open",
  );
  const [lockerRequirePin, setLockerRequirePin] = useState(false);
  const [lockerError, setLockerError] = useState<string | null>(null);

  const {
    digits: lockerPinDigits,
    handlePress: handleKeypadPress,
    reset: resetLockerPin,
    value: lockerPinValue,
  } = useKeypad(4);

  const handleConfirm = async () => {
    if (isCreating) return;

    setLockerError(null);

    if (lockerRequirePin && lockerPinValue.length !== 4) {
      setLockerError("Enter a 4-digit PIN to lock the locker.");
      haptics.error();
      return;
    }

    // Style intentionally omitted — the locker inherits the current style
    // from the main picker (see SmartInput.handleLockerConfirm fallback).
    const success = await onConfirm({
      bucketType: "file",
      isReusable: lockerMode === "open" || lockerMode === "pingpong",
      deleteOnDownload: lockerMode === "pingpong",
      password: lockerRequirePin ? lockerPinValue : undefined,
    });

    if (!success) {
      setLockerError("Couldn't create locker. Try again in a moment.");
    }
  };

  const handleDisable = () => {
    onDisable();
    setLockerMode("open");
    setLockerRequirePin(false);
    resetLockerPin();
    setLockerError(null);
  };

  return (
    <div class="bg-[#F0FFFB] border-3 border-black rounded-2xl p-4 space-y-4 animate-slide-down">
      {isActive
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
              {bucketUrl || "Generating URL..."}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition"
                onClick={onClose}
              >
                Done
              </button>
              <button
                type="button"
                class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-red-500 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 transition"
                onClick={handleDisable}
              >
                Forget this locker
              </button>
            </div>
            <p class="text-[11px] text-gray-500">
              Forgetting only clears it from this device — the locker link keeps
              working for anyone who has it.
            </p>
          </div>
        )
        : (
          <div class="space-y-4">
            <div>
              <p class="text-sm font-bold text-gray-900">
                Create file locker
              </p>
              <p class="text-xs text-gray-600">
                Choose what happens after someone downloads the file.
              </p>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-600">
                Mode
              </p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLockerMode("open")}
                  class={`min-h-[64px] px-2 py-2 text-[11px] sm:text-xs font-black leading-tight rounded-xl border-2 transition ${
                    lockerMode === "open"
                      ? "bg-teal-500 text-white border-teal-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                  }`}
                >
                  Keep file
                </button>
                <button
                  type="button"
                  onClick={() => setLockerMode("pingpong")}
                  class={`min-h-[64px] px-2 py-2 text-[11px] sm:text-xs font-black leading-tight rounded-xl border-2 transition ${
                    lockerMode === "pingpong"
                      ? "bg-purple-500 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-purple-400"
                  }`}
                >
                  Clear after download
                </button>
                <button
                  type="button"
                  onClick={() => setLockerMode("single")}
                  class={`min-h-[64px] px-2 py-2 text-[11px] sm:text-xs font-black leading-tight rounded-xl border-2 transition ${
                    lockerMode === "single"
                      ? "bg-orange-500 text-white border-orange-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                  }`}
                >
                  Destroy after download
                </button>
              </div>
              <p class="text-[11px] text-gray-500 italic">
                {lockerMode === "open" &&
                  "The file stays in the locker for anyone to download."}
                {lockerMode === "pingpong" &&
                  "Download clears the file, then the locker accepts another upload."}
                {lockerMode === "single" &&
                  "The whole locker disappears after one download."}
              </p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-gray-600">
                    Require 4-digit PIN?
                  </p>
                  <p class="text-[11px] text-gray-500">
                    Guests need the code to upload or download.
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
                  class={`min-w-[64px] min-h-[44px] px-4 py-1 rounded-full border-2 text-xs font-bold transition ${
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
                          class={`min-h-[44px] rounded-xl text-sm font-semibold border-2 bg-white transition ${
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

            {lockerError && <p class="text-xs text-red-500">{lockerError}</p>}

            <div class="grid grid-cols-1 sm:grid-cols-[auto_auto] gap-2">
              <button
                type="button"
                class="min-h-[48px] px-4 py-2 rounded-xl border-2 border-black bg-black text-white text-sm font-bold shadow-chunky hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleConfirm}
                disabled={isCreating}
              >
                {isCreating ? "Creating locker..." : "Create locker"}
              </button>
              <button
                type="button"
                class="min-h-[48px] px-4 py-2 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition"
                onClick={() => {
                  onClose();
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
  );
}

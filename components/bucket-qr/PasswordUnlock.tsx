interface PasswordUnlockProps {
  pinDigits: string[];
  onKeypadPress: (key: string) => void;
  useManualPassword: boolean;
  manualPassword: string;
  onManualPasswordChange: (value: string) => void;
  onToggleMode: () => void;
  onCancel: () => void;
}

/** PIN keypad or manual-password field for unlocking a locked locker, plus
 * the "use keyboard instead"/"cancel" footer. Shared by the upload and
 * download action panels in BucketQR. */
export default function PasswordUnlock({
  pinDigits,
  onKeypadPress,
  useManualPassword,
  manualPassword,
  onManualPasswordChange,
  onToggleMode,
  onCancel,
}: PasswordUnlockProps) {
  return (
    <div class="space-y-4">
      {!useManualPassword && (
        <div class="space-y-3">
          <p class="sr-only" role="status" aria-live="polite">
            {pinDigits.filter(Boolean).length} of {pinDigits.length}{" "}
            digits entered
          </p>
          <div class="flex justify-center gap-4" aria-hidden="true">
            {pinDigits.map((digit, index) => (
              <div
                key={`pin-${index}`}
                class="w-12 h-14 bg-white border-3 border-black rounded-2xl flex items-center justify-center text-3xl font-black"
              >
                {digit ? "•" : ""}
              </div>
            ))}
          </div>
          <div
            class="grid grid-cols-3 gap-3"
            role="group"
            aria-label="PIN keypad"
          >
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
                  key={`keypad-${key}`}
                  type="button"
                  class={`min-h-[48px] rounded-2xl text-lg font-black border-3 border-black bg-white hover:-translate-y-0.5 transition ${
                    key === "clear" || key === "back"
                      ? "text-[#574c44]"
                      : "text-[#1e1714]"
                  }`}
                  onClick={() => onKeypadPress(String(key))}
                  aria-label={key === "back" ? "Delete last digit" : undefined}
                >
                  {key === "clear" ? "Clear" : key === "back" ? "⌫" : key}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {useManualPassword && (
        <input
          type="password"
          value={manualPassword}
          onInput={(e) =>
            onManualPasswordChange((e.target as HTMLInputElement).value)}
          placeholder="Enter password"
          aria-label="Locker password"
          class="w-full px-4 py-3 border-3 border-black rounded-xl text-lg"
        />
      )}

      <div class="flex items-center justify-between text-[11px] text-[#6e6058]">
        <button
          type="button"
          class="min-h-[44px] underline"
          onClick={onToggleMode}
        >
          {useManualPassword ? "Use keypad" : "Use keyboard"}
        </button>
        <button
          type="button"
          class="min-h-[44px] underline"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

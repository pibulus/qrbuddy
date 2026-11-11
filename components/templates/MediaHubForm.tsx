import { useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { useKeypad } from "../../hooks/useKeypad.ts";
import {
  MAX_FILE_SIZE,
  SUPPORTER_MAX_FILE_SIZE,
  validateFile,
} from "../../utils/file-validation.ts";
import { getSupporterPass } from "../../utils/supporter-pass.ts";

interface Props {
  url: Signal<string>;
  onCreated?: () => void;
}

export default function MediaHubForm({ url: _url, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creator, setCreator] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    digits: pinDigits,
    handlePress: handleKeypadPress,
    reset: resetPin,
    value: pinValue,
  } = useKeypad(4, isPasswordProtected);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selected = input.files[0];
      const validation = validateFile(
        selected,
        getSupporterPass() ? SUPPORTER_MAX_FILE_SIZE : MAX_FILE_SIZE,
      );
      if (!validation.valid) {
        setError(validation.error ?? "That file can't be shared.");
        setFile(null);
        haptics.error();
        return;
      }
      setError(null);
      setFile(selected);
      haptics.medium();
    }
  };

  const handleCreate = () => {
    if (
      !file || isCreating || (isPasswordProtected && pinValue.length !== 4)
    ) {
      return;
    }

    setError(null);
    setIsCreating(true);
    haptics.medium();

    const event = new CustomEvent("smart-media-create", {
      detail: {
        file,
        metadata: {
          title,
          description,
          creator,
        },
        password: isPasswordProtected ? pinValue : null,
        onComplete: (success: boolean) => {
          setIsCreating(false);
          if (success) {
            setFile(null);
            setTitle("");
            setDescription("");
            setCreator("");
            setIsPasswordProtected(false);
            resetPin();
            onCreated?.();
            haptics.success();
          } else {
            setError(
              "Couldn't create the file page. Check the file size and try again.",
            );
            haptics.error();
          }
        },
      },
    });
    globalThis.dispatchEvent(event);
  };

  return (
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      {/* File Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        class={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
          file
            ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)]/50"
            : "border-[#1e1714]/30 bg-[#fbf1e4] hover:border-[#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)]/40"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={handleFileSelect}
          class="hidden"
        />
        <div class="text-3xl mb-1.5">{file ? "📄" : "📂"}</div>
        <p class="font-black text-sm text-[#1e1714] truncate">
          {file ? file.name : "Select a single file, PDF, or track"}
        </p>
        <p class="text-xs font-semibold text-[#5c4f47] mt-0.5">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
            : "Images, video, audio, PDF · up to 50 MB"}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs font-bold text-amber-950 text-center"
        >
          {error}
        </p>
      )}

      {/* Metadata Inputs */}
      <div class="space-y-2">
        <span class="qr-field-label">
          <span class="qr-section-pip" aria-hidden="true" />
          <span>Card Details (optional)</span>
        </span>
        <input
          type="text"
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          placeholder="Title (e.g. Studio Mix, Dinner Menu)"
          class="qr-input text-sm"
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={creator}
            onInput={(e) => setCreator((e.target as HTMLInputElement).value)}
            placeholder="Creator / host (optional)"
            class="qr-input text-xs"
          />
          <input
            type="text"
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLInputElement).value)}
            placeholder="Short note (optional)"
            class="qr-input text-xs"
          />
        </div>
      </div>

      {/* Password Toggle */}
      <div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#fbf1e4] rounded-xl border-2 border-[#1e1714]/20">
        <span class="text-xs font-black text-[#1e1714] flex items-center gap-1.5">
          <span>🔒</span>
          <span>Require 4-digit PIN</span>
        </span>
        <button
          type="button"
          aria-pressed={isPasswordProtected}
          onClick={() => {
            const next = !isPasswordProtected;
            setIsPasswordProtected(next);
            if (!next) resetPin();
            haptics.light();
          }}
          class={`min-w-[58px] min-h-[32px] px-3 rounded-full border-2 text-xs font-black transition-all ${
            isPasswordProtected
              ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              : "border-[#1e1714]/25 bg-[#fffef7] text-[#4a3f39]"
          }`}
        >
          {isPasswordProtected ? "On" : "Off"}
        </button>
      </div>

      {isPasswordProtected && (
        <div class="space-y-2.5 animate-slide-down">
          <div class="flex justify-center gap-2.5">
            {pinDigits.map((digit, index) => (
              <div
                key={`media-pin-${index}`}
                class="w-10 h-11 bg-[#fffef7] border-2 border-[#1e1714] rounded-xl flex items-center justify-center text-xl font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              >
                {digit ? "•" : ""}
              </div>
            ))}
          </div>
          <div class="grid grid-cols-3 gap-1.5">
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
            ].map((key) => (
              <button
                key={`media-pad-${key}`}
                type="button"
                class={`min-h-[40px] rounded-xl text-xs font-black border-2 transition-all active:translate-y-[1px] ${
                  key === "clear" || key === "back"
                    ? "border-[#1e1714]/25 bg-[#fbf1e4] text-[#4a3f39] hover:border-[#1e1714]"
                    : "border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_1.5px_0_#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                }`}
                onClick={() => handleKeypadPress(String(key))}
              >
                {key === "clear" ? "Clear" : key === "back" ? "⌫" : key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!file || isCreating ||
          (isPasswordProtected && pinValue.length !== 4)}
        class="qr-pitch-cta"
      >
        <span>{isCreating ? "Creating..." : "Create file page →"}</span>
      </button>

      <p class="text-[11px] font-medium text-center text-[#6e6058]">
        Files stay live for 30 days after the latest download.
      </p>
    </div>
  );
}

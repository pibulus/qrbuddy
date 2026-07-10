import { useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { useKeypad } from "../../hooks/useKeypad.ts";
import { validateFile } from "../../utils/file-validation.ts";

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
  } = useKeypad(4);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selected = input.files[0];
      const validation = validateFile(selected);
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

    // Dispatch custom event for SmartInput to handle the complex bucket creation flow
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
              "Couldn't create the file page. Check the file size (max 50MB) and try again.",
            );
            haptics.error();
          }
        },
      },
    });
    globalThis.dispatchEvent(event);
  };

  return (
    <div class="space-y-4 animate-slide-down">
      {/* File Drop Zone */}
      <div
        class={`border-3 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          file
            ? "border-purple-500 bg-purple-50"
            : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
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
        <div class="text-4xl mb-2">{file ? "📄" : "📂"}</div>
        <p class="font-bold text-gray-700">
          {file ? file.name : "Tap to select a file"}
        </p>
        <p class="text-xs text-gray-500 mt-1">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
            : "Images, video, audio, PDF • up to 50MB"}
        </p>
      </div>

      {error && (
        <p class="text-red-600 text-sm text-center animate-slide-down">
          ❌ {error}
        </p>
      )}

      {/* Metadata Inputs */}
      <div class="space-y-3">
        <input
          type="text"
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          placeholder="Title (e.g. Project Proposal)"
          class="w-full px-4 py-3 border-3 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors font-bold"
        />
        <textarea
          value={description}
          onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
          placeholder="Description (optional)"
          rows={2}
          class="w-full px-4 py-3 border-3 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors resize-none"
        />
        <input
          type="text"
          value={creator}
          onInput={(e) => setCreator((e.target as HTMLInputElement).value)}
          placeholder="Created by (optional)"
          class="w-full px-4 py-3 border-3 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors"
        />
      </div>

      {/* Password Toggle */}
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
        <span class="font-bold text-gray-700 flex items-center gap-2">
          🔒 Require 4-digit PIN
        </span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPasswordProtected}
            onChange={(e) => {
              const next = (e.target as HTMLInputElement).checked;
              setIsPasswordProtected(next);
              if (!next) resetPin();
              haptics.light();
            }}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black">
          </div>
        </label>
      </div>

      {isPasswordProtected && (
        <div class="space-y-3 animate-slide-down">
          <div class="flex justify-center gap-3">
            {pinDigits.map((digit, index) => (
              <div
                key={`media-pin-${index}`}
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
            ].map((key) => (
              <button
                key={`media-pad-${key}`}
                type="button"
                class={`min-h-[44px] rounded-xl text-sm font-semibold border-2 bg-white transition ${
                  key === "clear" || key === "back"
                    ? "border-gray-300 text-gray-600"
                    : "border-purple-200 text-gray-900"
                } hover:border-purple-400`}
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
        class="w-full py-4 bg-black text-white text-xl font-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {isCreating ? "Creating..." : "Create file page 🚀"}
      </button>

      <p class="text-xs text-center text-gray-400">
        Makes a download page that stays up. One file per page — create a new QR
        to share a different file.
      </p>
    </div>
  );
}

import { useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function MediaHubForm({ url: _url }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creator, setCreator] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      setFile(input.files[0]);
      haptics.medium();
    }
  };

  const handleCreate = () => {
    if (!file) return;

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
        password: isPasswordProtected ? password : null,
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
            : "Images, Video, Audio, PDF"}
        </p>
      </div>

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
          🔒 Password Protect
        </span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPasswordProtected}
            onChange={(e) => {
              setIsPasswordProtected((e.target as HTMLInputElement).checked);
              haptics.light();
            }}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black">
          </div>
        </label>
      </div>

      {isPasswordProtected && (
        <input
          type="text"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder="Enter password"
          class="w-full px-4 py-3 border-3 border-black rounded-xl focus:outline-none font-mono animate-slide-down"
        />
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!file || isCreating || (isPasswordProtected && !password)}
        class="w-full py-4 bg-black text-white text-xl font-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {isCreating ? "Creating..." : "Create Secure Page 🚀"}
      </button>

      <p class="text-xs text-center text-gray-400">
        Creates a persistent, secure bucket for your file.
      </p>
    </div>
  );
}

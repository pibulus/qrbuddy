import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { decryptText, EncryptedPayload } from "../utils/crypto.ts";

interface NoteCardProps {
  code: string;
  content: string;
  openedLabel: string;
  unbranded?: boolean;
}

function tryParseEncrypted(raw: string): EncryptedPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed && parsed.isEncrypted && parsed.ciphertext && parsed.iv &&
      parsed.salt
    ) {
      return parsed as EncryptedPayload;
    }
  } catch {
    // Plaintext string
  }
  return null;
}

export default function NoteCard({
  code,
  content: initialContent,
  openedLabel,
  unbranded = false,
}: NoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [encryptedPayload] = useState<EncryptedPayload | null>(() =>
    tryParseEncrypted(initialContent)
  );
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isAutoDecrypted, setIsAutoDecrypted] = useState(false);

  useEffect(() => {
    if (!encryptedPayload) {
      setDecryptedText(initialContent);
      return;
    }

    // Check if key is in URL hash: #key=... or #...
    const hash = globalThis.location?.hash?.replace(/^#/, "") || "";
    const keyMatch = hash.match(/key=([^&]+)/) || [null, hash];
    const key = keyMatch[1]?.trim();

    if (key) {
      decryptText(encryptedPayload, key)
        .then((text) => {
          setDecryptedText(text);
          setIsAutoDecrypted(true);
        })
        .catch(() => {
          setDecryptError("Invalid encryption key in QR code");
        });
    }
  }, [encryptedPayload, initialContent]);

  const handleManualDecrypt = async (e: Event) => {
    e.preventDefault();
    if (!encryptedPayload || !manualKey.trim()) return;

    try {
      setDecryptError(null);
      const text = await decryptText(encryptedPayload, manualKey.trim());
      setDecryptedText(text);
      haptics.success();
    } catch {
      setDecryptError("Incorrect passkey. Could not decrypt.");
      haptics.error();
    }
  };

  const displayText = decryptedText || "";
  const charCount = displayText.trim().length;
  const isShort = charCount <= 60;
  const isMedium = charCount > 60 && charCount <= 200;

  const handleCopy = async () => {
    if (!displayText) return;
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      haptics.success();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      haptics.error();
    }
  };

  return (
    <article class="w-full max-w-xl animate-fade-in space-y-4">
      {/* Top pill bar */}
      <header class="flex items-center justify-between gap-3 px-1">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black bg-white shadow-chunky text-xs font-black uppercase tracking-wide text-gray-800">
          <span>{encryptedPayload ? "🔐" : "💌"}</span>
          <span>{encryptedPayload ? "Encrypted Note" : "Message"}</span>
        </div>
        <div class="flex items-center gap-2">
          {isAutoDecrypted && (
            <span class="text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-full">
              🔓 Zero-Knowledge Decrypted
            </span>
          )}
          <span class="text-xs font-mono text-gray-500 font-bold">
            #{code}
          </span>
        </div>
      </header>

      {/* Main Message Card */}
      <section class="border-4 border-black bg-white rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all">
        {/* Card Header Strip */}
        <div class="border-b-3 border-black bg-gradient-to-r from-pink-100 via-yellow-100 to-purple-100 px-4 py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#FF6B9D]" />
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#FFE66D]" />
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#4ECDC4]" />
          </div>
          {decryptedText && (
            <button
              type="button"
              onClick={handleCopy}
              class={`min-h-[34px] px-3 py-1 rounded-xl border-2 border-black font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5 ${
                copied
                  ? "bg-green-300 text-green-950"
                  : "bg-white text-gray-900 hover:bg-black hover:text-white"
              }`}
              title="Copy message to clipboard"
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          )}
        </div>

        {/* Dynamic Text Body or Passkey Prompt */}
        <div class="p-6 sm:p-8 bg-gradient-to-b from-white to-[#FFFDF9] min-h-[180px] flex items-center justify-center">
          {encryptedPayload && !decryptedText
            ? (
              <form
                onSubmit={handleManualDecrypt}
                class="w-full max-w-sm space-y-3 text-center"
              >
                <div class="text-4xl mb-1">🔒</div>
                <p class="font-black text-gray-900 text-base">
                  Zero-Knowledge Encrypted Note
                </p>
                <p class="text-xs text-gray-500">
                  This note was encrypted on the sender's device. Enter the
                  passkey to unlock:
                </p>
                <input
                  type="text"
                  value={manualKey}
                  onInput={(e) =>
                    setManualKey((e.target as HTMLInputElement).value)}
                  placeholder="Enter passkey or paste #key"
                  class="w-full text-center font-mono text-sm px-3 py-2.5 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {decryptError && (
                  <p class="text-xs font-bold text-red-600 animate-shake">
                    {decryptError}
                  </p>
                )}
                <button
                  type="submit"
                  class="w-full min-h-[44px] rounded-xl border-2 border-black bg-black font-black text-white text-sm hover:bg-gray-800 transition"
                >
                  🔓 Decrypt Note
                </button>
              </form>
            )
            : isShort
            ? (
              <p class="text-3xl sm:text-5xl font-black leading-tight text-center break-words text-gray-900 tracking-tight py-4">
                {displayText}
              </p>
            )
            : isMedium
            ? (
              <p class="text-xl sm:text-2xl font-black leading-snug break-words text-gray-900 text-left py-2">
                {displayText}
              </p>
            )
            : (
              <pre class="w-full whitespace-pre-wrap break-words font-mono text-base sm:text-lg leading-relaxed text-gray-900 text-left">
              {displayText}
              </pre>
            )}
        </div>
      </section>

      {/* Footer */}
      <footer class="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-gray-500 pt-2 px-1">
        <p class="font-mono">Opened {openedLabel}</p>
        {!unbranded && (
          <a
            href="/?utm_source=text_card&utm_medium=note"
            class="inline-flex items-center gap-1.5 font-bold text-gray-700 hover:text-pink-600 transition-colors"
          >
            <span>Make your own QR</span>
            <span>✨</span>
          </a>
        )}
      </footer>
    </article>
  );
}

import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { decryptText, EncryptedPayload } from "../utils/crypto.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface NoteCardProps {
  code: string;
  content: string;
  openedLabel: string;
  unbranded?: boolean;
  lang?: Locale;
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
  lang,
}: NoteCardProps) {
  const isSpanish = getClientLocale(lang) === "es";
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
          setDecryptError(
            isSpanish
              ? "Esa clave no corresponde a esta nota"
              : "That key does not match this note",
          );
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
      setDecryptError(
        isSpanish
          ? "Clave incorrecta. No se pudo descifrar."
          : "Incorrect passkey. Could not decrypt.",
      );
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
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black bg-white shadow-chunky text-xs font-black uppercase tracking-wide text-[#4a3f39]">
          <span>{encryptedPayload ? "🔐" : "💌"}</span>
          <span>
            {encryptedPayload
              ? (isSpanish ? "Nota cifrada" : "Encrypted Note")
              : (isSpanish ? "Mensaje" : "Message")}
          </span>
        </div>
        <div class="flex items-center gap-2">
          {isAutoDecrypted && (
            <span class="text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-full">
              🔓 {isSpanish
                ? "Descifrada (conocimiento cero)"
                : "Zero-Knowledge Decrypted"}
            </span>
          )}
          <span class="text-xs font-mono text-[#6e6058] font-bold">
            #{code}
          </span>
        </div>
      </header>

      {/* Main Message Card */}
      <section class="border-4 border-black bg-white rounded-3xl shadow-chunky overflow-hidden transition-all">
        {/* Card Header Strip */}
        <div class="border-b-3 border-black bg-[#fbf1e4] px-4 py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#ff8a7a]" />
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#f8de7e]" />
            <span class="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#9ef0c8]" />
          </div>
          {decryptedText && (
            <button
              type="button"
              onClick={handleCopy}
              class={`min-h-[34px] px-3 py-1 rounded-xl border-2 border-black font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:translate-y-0.5 ${
                copied
                  ? "bg-emerald-200 text-emerald-950"
                  : "bg-white text-[#1e1714] hover:bg-black hover:text-white"
              }`}
              title={isSpanish
                ? "Copiar mensaje al portapapeles"
                : "Copy message to clipboard"}
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>
                {copied
                  ? (isSpanish ? "¡Copiado!" : "Copied!")
                  : (isSpanish ? "Copiar" : "Copy")}
              </span>
            </button>
          )}
        </div>

        {/* Dynamic Text Body or Passkey Prompt */}
        <div class="p-6 sm:p-8 bg-[#fffef7] min-h-[180px] flex items-center justify-center">
          {encryptedPayload && !decryptedText
            ? (
              <form
                onSubmit={handleManualDecrypt}
                class="w-full max-w-sm space-y-3 text-center"
              >
                <div class="text-4xl mb-1">🔒</div>
                <p class="font-black text-[#1e1714] text-base">
                  {isSpanish
                    ? "Nota cifrada de conocimiento cero"
                    : "Zero-Knowledge Encrypted Note"}
                </p>
                <p class="text-xs text-[#6e6058]">
                  {isSpanish
                    ? "Esta nota se cifró en el dispositivo del remitente. Ingresa la clave para abrirla:"
                    : "This note was encrypted on the sender's device. Enter the passkey to unlock:"}
                </p>
                <input
                  type="text"
                  value={manualKey}
                  onInput={(e) =>
                    setManualKey((e.target as HTMLInputElement).value)}
                  placeholder={isSpanish
                    ? "Ingresa la clave o pega el #key"
                    : "Enter passkey or paste #key"}
                  class="w-full text-center font-mono text-sm px-3 py-2.5 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#1e1714]"
                />
                {decryptError && (
                  <p class="text-xs font-bold text-amber-800 animate-shake">
                    {decryptError}
                  </p>
                )}
                <button
                  type="submit"
                  class="qr-pitch-cta"
                >
                  {isSpanish ? "Descifrar nota" : "Decrypt note"}
                </button>
              </form>
            )
            : isShort
            ? (
              <p class="text-3xl sm:text-5xl font-black leading-tight text-center break-words text-[#1e1714] tracking-tight py-4">
                {displayText}
              </p>
            )
            : isMedium
            ? (
              <p class="text-xl sm:text-2xl font-black leading-snug break-words text-[#1e1714] text-left py-2">
                {displayText}
              </p>
            )
            : (
              <pre class="w-full whitespace-pre-wrap break-words font-mono text-base sm:text-lg leading-relaxed text-[#1e1714] text-left">
              {displayText}
              </pre>
            )}
        </div>
      </section>

      {/* Footer */}
      <footer class="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-[#6e6058] pt-2 px-1">
        <p class="font-mono">
          {isSpanish ? "Abierta" : "Opened"} {openedLabel}
        </p>
        {!unbranded && (
          <a
            href="/?utm_source=text_card&utm_medium=note"
            class="inline-flex items-center gap-1.5 font-bold text-[#4a3f39] hover:text-[#1e1714] transition-colors"
          >
            <span>{isSpanish ? "Crea tu propio QR" : "Make your own QR"}</span>
          </a>
        )}
      </footer>
    </article>
  );
}

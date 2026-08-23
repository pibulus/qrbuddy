import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";

interface NoteCardProps {
  code: string;
  content: string;
  openedLabel: string;
  unbranded?: boolean;
}

export default function NoteCard({
  code,
  content,
  openedLabel,
  unbranded = false,
}: NoteCardProps) {
  const [copied, setCopied] = useState(false);

  const charCount = content.trim().length;
  const isShort = charCount <= 60;
  const isMedium = charCount > 60 && charCount <= 200;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
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
          <span>💌</span>
          <span>Message</span>
        </div>
        <span class="text-xs font-mono text-gray-500 font-bold">
          #{code}
        </span>
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
        </div>

        {/* Dynamic Text Body */}
        <div class="p-6 sm:p-8 bg-gradient-to-b from-white to-[#FFFDF9] min-h-[180px] flex items-center justify-center">
          {isShort ? (
            <p class="text-3xl sm:text-5xl font-black leading-tight text-center break-words text-gray-900 tracking-tight py-4">
              {content}
            </p>
          ) : isMedium ? (
            <p class="text-xl sm:text-2xl font-black leading-snug break-words text-gray-900 text-left py-2">
              {content}
            </p>
          ) : (
            <pre class="w-full whitespace-pre-wrap break-words font-mono text-base sm:text-lg leading-relaxed text-gray-900 text-left">
              {content}
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

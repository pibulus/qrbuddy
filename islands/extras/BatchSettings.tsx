interface BatchSettingsProps {
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
  isGeneratingBatch: boolean;
  batchProgress: number;
  onGenerateBatch: () => void;
}

export default function BatchSettings({
  batchUrls,
  setBatchUrls,
  isGeneratingBatch,
  batchProgress,
  onGenerateBatch,
}: BatchSettingsProps) {
  return (
    <div class="bg-[#F0F7FF] border-3 border-black rounded-2xl p-4 space-y-3 shadow-chunky animate-slide-down">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📦</span>
          <h3 class="font-black text-gray-900">Batch Generator</h3>
        </div>
        <span class="text-xs font-black text-blue-900 bg-blue-100 border-2 border-black px-2.5 py-1 rounded-full shadow-sm">
          {batchUrls.split("\n").filter((u) => u.trim()).length} URLs
        </span>
      </div>

      <p class="text-xs text-gray-600">
        Paste links (one per line). All generated QRs will inherit your active
        gradient palette & center logo.
      </p>

      <textarea
        value={batchUrls}
        onInput={(e) => setBatchUrls((e.target as HTMLTextAreaElement).value)}
        placeholder={`https://example.com/item-1\nhttps://example.com/item-2\nhttps://example.com/item-3`}
        rows={5}
        class="w-full px-3.5 py-2.5 text-sm border-2 border-gray-300 focus:border-black rounded-xl focus:outline-none font-mono bg-white resize-none"
        disabled={isGeneratingBatch}
      />

      {isGeneratingBatch
        ? (
          <div class="space-y-2 pt-1">
            <div class="h-3.5 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
              <div
                class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <p class="text-center text-xs font-black text-blue-800 animate-pulse">
              Generating batch QRs... {batchProgress}%
            </p>
          </div>
        )
        : (
          <button
            type="button"
            onClick={onGenerateBatch}
            disabled={!batchUrls.trim()}
            class="w-full min-h-[48px] py-3 text-sm font-black text-white bg-black rounded-xl shadow-chunky hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>⚡️</span> Download Batch ZIP
          </button>
        )}
    </div>
  );
}

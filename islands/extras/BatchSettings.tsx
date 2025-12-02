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
        onInput={(e) => setBatchUrls((e.target as HTMLTextAreaElement).value)}
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
  );
}

import { useState } from "preact/hooks";
// @ts-expect-error — esm.sh's jszip types omit the default export the runtime ESM build has
import JSZip from "jszip";
import QRCodeStyling from "qr-code-styling";
import { haptics } from "../utils/haptics.ts";
import { Signal } from "@preact/signals";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";

import { QR_STYLES } from "../utils/qr-styles.ts";

interface UseBatchGeneratorProps {
  batchUrls: string;
  logoUrl: Signal<string>;
  qrStyle?: Signal<string>;
}

export function useBatchGenerator(
  { batchUrls, logoUrl, qrStyle }: UseBatchGeneratorProps,
) {
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const generateBatchZIP = async () => {
    try {
      const urls = batchUrls.split("\n").map((u) => u.trim()).filter((u) =>
        u.length > 0
      );

      if (urls.length === 0) {
        addToast("❌ No URLs provided!", 3000);
        return;
      }

      setIsGeneratingBatch(true);
      setBatchProgress(0);
      haptics.medium();

      const styleKey = (qrStyle?.value as keyof typeof QR_STYLES) || "sunset";
      const styleConfig = QR_STYLES[styleKey] || QR_STYLES.sunset;

      const zip = new JSZip();
      const qrCode = new QRCodeStyling({
        width: 1000,
        height: 1000,
        type: "canvas",
        image: logoUrl.value || undefined,
        dotsOptions: {
          type: "rounded",
          ...("gradient" in styleConfig.dots
            ? { gradient: styleConfig.dots.gradient }
            : { color: styleConfig.dots.color }),
        },
        backgroundOptions: {
          ...("gradient" in styleConfig.background
            ? { gradient: styleConfig.background.gradient }
            : { color: styleConfig.background.color }),
        },
        cornersSquareOptions: {
          type: "extra-rounded",
          ...("gradient" in styleConfig.cornersSquare
            ? { gradient: styleConfig.cornersSquare.gradient }
            : { color: styleConfig.cornersSquare.color }),
        },
        cornersDotOptions: {
          type: "dot",
          ...("gradient" in styleConfig.cornersDot
            ? { gradient: styleConfig.cornersDot.gradient }
            : { color: styleConfig.cornersDot.color }),
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
        },
      });

      // Process each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        qrCode.update({ data: url });
        const blob = await qrCode.getRawData("png");
        if (blob) {
          // Create safe filename
          const safeName = url.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
          zip.file(`qr_${i + 1}_${safeName}.png`, blob);
        }

        // Update progress
        setBatchProgress(Math.round(((i + 1) / urls.length) * 100));
        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Generate ZIP
      const content = await zip.generateAsync({ type: "blob" });

      // Trigger download
      const link = document.createElement("a");
      const blobUrl = URL.createObjectURL(content);
      link.href = blobUrl;
      link.download = "qrbuddy_batch.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL to prevent memory leak
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      haptics.success();
      setIsGeneratingBatch(false);

      addToast(`📦 Batch complete! Downloaded ${urls.length} QR codes.`, 3000);
    } catch (error) {
      setIsGeneratingBatch(false);
      reportFailure("Batch generation failed", error, "❌ Batch failed");
    }
  };

  return {
    isGeneratingBatch,
    batchProgress,
    generateBatchZIP,
  };
}

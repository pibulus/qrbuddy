import { useState } from "preact/hooks";
import JSZip from "jszip";
import QRCodeStyling from "qr-code-styling";
import { haptics } from "../utils/haptics.ts";
import { Signal } from "@preact/signals";

interface UseBatchGeneratorProps {
  batchUrls: string;
  logoUrl: Signal<string>;
}

export function useBatchGenerator(
  { batchUrls, logoUrl }: UseBatchGeneratorProps,
) {
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const generateBatchZIP = async () => {
    try {
      const urls = batchUrls.split("\n").map((u) => u.trim()).filter((u) =>
        u.length > 0
      );

      if (urls.length === 0) {
        const event = new CustomEvent("show-toast", {
          detail: {
            message: "❌ No URLs provided!",
            type: "error",
          },
        });
        globalThis.dispatchEvent(event);
        return;
      }

      setIsGeneratingBatch(true);
      setBatchProgress(0);
      haptics.medium();

      const zip = new JSZip();
      const qrCode = new QRCodeStyling({
        width: 1000,
        height: 1000,
        type: "canvas",
        image: logoUrl.value || undefined,
        dotsOptions: {
          color: "#000000",
          type: "rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
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

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `📦 Batch complete! Downloaded ${urls.length} QR codes.`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);
    } catch (error) {
      console.error("Batch generation failed:", error);
      setIsGeneratingBatch(false);
      haptics.error();
      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Batch failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
    }
  };

  return {
    isGeneratingBatch,
    batchProgress,
    generateBatchZIP,
  };
}

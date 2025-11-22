import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";

interface UseDynamicQRProps {
  url: Signal<string>;
  editUrl: Signal<string>;
  scanLimit: number | null;
  expiryDate: string;
}

export function useDynamicQR(
  { url, editUrl, scanLimit, expiryDate }: UseDynamicQRProps,
) {
  const [isCreating, setIsCreating] = useState(false);

  const createDynamicQR = async (destinationUrl: string) => {
    try {
      setIsCreating(true);
      haptics.medium();

      const apiUrl = getApiUrl();

      const body: Record<string, string | number> = {
        destination_url: destinationUrl,
      };
      if (scanLimit) body.max_scans = scanLimit;
      if (expiryDate) body.expires_at = new Date(expiryDate).toISOString();

      const response = await fetch(
        `${apiUrl}/create-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create dynamic QR");
      }

      const data = await response.json();

      // Update URL to the redirect URL
      url.value = data.redirect_url;
      editUrl.value = data.edit_url;

      // Store owner token securely for future edits
      await saveOwnerToken("qr", data.short_code, data.owner_token);

      // Success feedback
      haptics.success();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `✅ Dynamic QR created! You can edit this anytime 🔗`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

      setIsCreating(false);
    } catch (error) {
      console.error("Create dynamic QR error:", error);
      setIsCreating(false);
      haptics.error();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Failed to create dynamic QR: ${
            error instanceof Error ? error.message : String(error)
          }`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
    }
  };

  return {
    isCreating,
    createDynamicQR,
  };
}

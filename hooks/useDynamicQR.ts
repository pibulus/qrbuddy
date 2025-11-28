import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import { apiRequest, ApiError } from "../utils/api-request.ts";

interface UseDynamicQRProps {
  url: Signal<string>;
  editUrl: Signal<string>;
  scanLimit: number | null;
  expiryDate: string;
  routingMode?: "simple" | "sequential";
  routingConfig?: { urls: string[]; loop: boolean };
}

export function useDynamicQR(
  { url, editUrl, scanLimit, expiryDate, routingMode, routingConfig }:
    UseDynamicQRProps,
) {
  const [isCreating, setIsCreating] = useState(false);

  const createDynamicQR = async (destinationUrl: string) => {
    try {
      setIsCreating(true);
      haptics.medium();

      const apiUrl = getApiUrl();

      const body: Record<string, unknown> = {
        destination_url: destinationUrl,
      };
      if (scanLimit) body.max_scans = scanLimit;
      if (expiryDate) body.expires_at = new Date(expiryDate).toISOString();
      if (routingMode) body.routing_mode = routingMode;
      if (routingConfig) body.routing_config = routingConfig;

      // Use shared API helper (automatically includes auth headers)
      const data = await apiRequest<{
        success: boolean;
        short_code: string;
        redirect_url: string;
        edit_url: string;
        owner_token: string;
      }>(
        `${apiUrl}/create-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        "Failed to create dynamic QR",
      );

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
      console.error("[HOOK:useDynamicQR] Create failed:", {
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });

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

import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import { apiRequest } from "../utils/api-request.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";

interface UseDynamicQRProps {
  url: Signal<string>;
  editUrl: Signal<string>;
  scanLimit: number | null;
  expiryDate: string;
  routingMode?: "simple" | "sequential";
  routingConfig?: { urls: string[]; loop: boolean };
  splashConfig?: {
    enabled: boolean;
    title: string;
    buttonText: string;
    imageUrl?: string;
    description?: string;
  } | null;
}

export function useDynamicQR(
  {
    url,
    editUrl,
    scanLimit,
    expiryDate,
    routingMode,
    routingConfig,
    splashConfig,
  }: UseDynamicQRProps,
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
      if (splashConfig && splashConfig.enabled) {
        body.splash_config = splashConfig;
      }

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

      // Auto-Copy URL
      try {
        await navigator.clipboard.writeText(data.redirect_url);
      } catch (err) {
        console.warn("Auto-copy failed:", err);
      }

      // Success feedback
      haptics.success();

      addToast("✅ Dynamic QR created! Link copied 🔗");

      setIsCreating(false);
    } catch (error) {
      setIsCreating(false);
      reportFailure(
        "[HOOK:useDynamicQR] Create failed",
        error,
        "❌ Failed to create dynamic QR",
      );
    }
  };

  return {
    isCreating,
    createDynamicQR,
  };
}

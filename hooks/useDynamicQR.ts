import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";

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

      // Construct API URL from SUPABASE_URL or use local dev API
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const apiUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1`
        : "http://localhost:8005";

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

      // Store owner token in localStorage
      localStorage.setItem(`qr_${data.short_code}`, data.owner_token);

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

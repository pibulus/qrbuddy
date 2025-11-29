import { useEffect, useState } from "preact/hooks";
import { getSupabaseUrl } from "../utils/api.ts";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { ApiError, apiRequest } from "../utils/api-request.ts";

export interface QRData {
  short_code: string;
  destination_url: string;
  created_at: string;
  expires_at: string | null;
  max_scans: number | null;
  scan_count: number;
  is_active: boolean;
  routing_mode: string;
  routing_config: {
    urls?: string[];
    loop?: boolean;
    ios?: string;
    android?: string;
    fallback?: string;
    startHour?: string;
    endHour?: string;
    activeUrl?: string;
    inactiveUrl?: string;
    timezoneOffset?: number;
  } | null;
  analytics?: {
    sparkline: number[];
    last_scan: string | null;
    devices: { ios: number; android: number; desktop: number; other: number };
  };
}

export function useQRData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [ownerToken, setOwnerToken] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Get token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No owner token provided");
      setLoading(false);
      return;
    }

    setOwnerToken(token);
    loadQRData(token);
  }, []);

  const loadQRData = async (token: string) => {
    try {
      setLoading(true);
      const supabaseUrl = getSupabaseUrl();

      if (!supabaseUrl) {
        throw new Error(
          "Supabase is not configured. Please set SUPABASE_URL environment variable.",
        );
      }

      // Use shared API helper (automatically includes auth headers)
      const result = await apiRequest<{ data: QRData }>(
        `${supabaseUrl}/functions/v1/get-dynamic-qr?token=${token}`,
        {},
        "Failed to load QR data",
      );

      setQrData(result.data);
      setLoading(false);
    } catch (err) {
      console.error("[HOOK:useQRData] Load failed:", {
        error: err instanceof Error ? err.message : String(err),
        statusCode: err instanceof ApiError ? err.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });

      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const saveQRData = async (updateData: Partial<QRData>) => {
    try {
      setIsSaving(true);
      haptics.medium();

      const supabaseUrl = getSupabaseUrl();

      if (!supabaseUrl) {
        throw new Error(
          "Supabase is not configured. Please set SUPABASE_URL environment variable.",
        );
      }

      const body = {
        owner_token: ownerToken,
        ...updateData,
      };

      // Use shared API helper (automatically includes auth headers)
      const result = await apiRequest<{ data: QRData }>(
        `${supabaseUrl}/functions/v1/update-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        "Failed to update QR",
      );

      setQrData(result.data);

      // Success feedback
      haptics.success();
      addToast("✅ QR updated successfully!", 3000);

      setIsSaving(false);
      return true;
    } catch (err) {
      console.error("[HOOK:useQRData] Update failed:", {
        error: err instanceof Error ? err.message : String(err),
        statusCode: err instanceof ApiError ? err.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });

      addToast(
        `❌ Failed to update: ${
          err instanceof Error ? err.message : String(err)
        }`,
        3500,
      );
      haptics.error();
      setIsSaving(false);
      return false;
    }
  };

  return {
    loading,
    error,
    qrData,
    isSaving,
    saveQRData,
    ownerToken,
  };
}

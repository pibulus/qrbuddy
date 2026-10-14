// Client-side Library API service for QRBuddy Plus
// Interacts with /library edge function with authenticated requests.

import { getApiUrl } from "./api.ts";
import { apiRequest } from "./api-request.ts";
import { getHistory } from "./history.ts";
import { getOwnerToken } from "./token-vault.ts";

export interface LibraryCodeItem {
  id: string;
  short_code: string;
  destination_url: string;
  title: string | null;
  created_at: string;
  expires_at: string | null;
  max_scans: number | null;
  scan_count: number;
  is_active: boolean;
  is_legacy: boolean;
  routing_mode: string;
  redirect_url: string;
}

export interface LibraryQuota {
  tier: "free" | "plus";
  is_active_plus: boolean;
  paid_through: string | null;
  total_allowed: number;
  used_count: number;
  legacy_count: number;
  can_create: boolean;
}

export interface LibraryResponse {
  success: boolean;
  codes: LibraryCodeItem[];
  quota: LibraryQuota;
  pagination?: {
    offset: number;
    limit: number;
    count: number;
  };
}

/** Fetch all codes in user's library with optional search filter. */
export async function fetchLibrary(search?: string): Promise<LibraryResponse> {
  const apiUrl = getApiUrl();
  const searchParam = search
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";
  return await apiRequest<LibraryResponse>(
    `${apiUrl}/library${searchParam}`,
    {
      method: "GET",
      useUserAuth: true,
    },
    "Failed to load your QR library",
  );
}

/** Fetch user's current library capacity and entitlement. */
export async function fetchLibraryQuota(): Promise<LibraryQuota> {
  const apiUrl = getApiUrl();
  const data = await apiRequest<{ success: boolean; quota: LibraryQuota }>(
    `${apiUrl}/library/quota`,
    {
      method: "GET",
      useUserAuth: true,
    },
    "Failed to check library quota",
  );
  return data.quota;
}

/** Claim an existing pre-launch / grandfathered code into the library using its owner token. */
export async function claimLegacyCode(
  ownerToken: string,
  title?: string,
): Promise<
  { success: boolean; short_code?: string; title?: string; message?: string }
> {
  const apiUrl = getApiUrl();
  return await apiRequest<{
    success: boolean;
    short_code?: string;
    title?: string;
    message?: string;
  }>(
    `${apiUrl}/library/claim-legacy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_token: ownerToken.trim(),
        title: title?.trim() || undefined,
      }),
      useUserAuth: true,
    },
    "Failed to claim QR code into library",
  );
}

/** Scan local browser history / token vault for dynamic codes and import them into the library.
 * Grandfathered codes do not consume the 5-code allowance. */
export async function importLocalHistoryCodes(): Promise<{
  attempted: number;
  claimed: number;
  errors: string[];
}> {
  const history = getHistory();
  const dynamicItems = history.filter((h) => h.type === "dynamic");
  let attempted = 0;
  let claimed = 0;
  const errors: string[] = [];

  for (const item of dynamicItems) {
    const shortCode = item.metadata?.shortCode as string | undefined;
    let ownerToken = item.metadata?.ownerToken as string | undefined;

    if (!ownerToken && shortCode) {
      ownerToken = await getOwnerToken("qr", shortCode) ?? undefined;
    }

    if (ownerToken) {
      attempted++;
      try {
        const title = item.metadata?.title as string | undefined;
        const res = await claimLegacyCode(ownerToken, title);
        if (res.success) {
          claimed++;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return { attempted, claimed, errors };
}

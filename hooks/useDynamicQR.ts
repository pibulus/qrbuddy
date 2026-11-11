import { Signal } from "@preact/signals";
import { useRef, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { getOwnerToken, saveOwnerToken } from "../utils/token-vault.ts";
import { apiRequest } from "../utils/api-request.ts";
import { isPlusLibraryEnabled } from "../utils/auth.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";
import { looksLikeUrl, normalizeUrl } from "../utils/url.ts";
import { addToHistory, updateHistoryItem } from "../utils/history.ts";

export interface DynamicSplashConfig {
  enabled: boolean;
  title: string;
  buttonText: string;
  imageUrl?: string;
  description?: string;
  brandName?: string;
  accentColor?: string;
  unbranded?: boolean;
}

export interface DynamicSequentialRoutingConfig {
  urls: string[];
  loop: boolean;
  random?: boolean;
  dailySpins?: number | null;
}

export interface SavedDynamicQRConfig {
  destinationUrl: string;
  routingMode: "simple" | "sequential" | "device" | "time";
  routingConfig:
    | DynamicSequentialRoutingConfig
    | Record<string, unknown>
    | null;
  splashConfig: DynamicSplashConfig | null;
  scanLimit: number | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ServerDynamicQRRecord {
  short_code: string;
  destination_url: string;
  expires_at: string | null;
  max_scans: number | null;
  is_active: boolean;
  routing_mode?: string | null;
  routing_config?: Record<string, unknown> | string | null;
  splash_config?: DynamicSplashConfig | null;
}

export interface DynamicQRUpdateInput {
  ownerToken: string;
  destinationUrl: string;
  redirectUrl?: string;
  isSequential: boolean;
  sequentialUrls: string[];
  loopSequence: boolean;
  randomSequence?: boolean;
  dailySpins?: number | null;
  splashConfig: DynamicSplashConfig | null;
  scanLimit: number | null;
  expiryDate: string;
  isActive?: boolean;
}

export interface HydratedDynamicBehaviorState {
  destinationUrl: string;
  isSequential: boolean;
  sequentialUrls: string[];
  loopSequence: boolean;
  randomSequence: boolean;
  dailySpins: number | null;
  splashConfig: DynamicSplashConfig | null;
  scanLimit: number | null;
  expiryDate: string;
  isActive: boolean;
}

export function extractOwnerTokenFromEditUrl(editUrl: string): string | null {
  const raw = (editUrl || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, "https://qrbuddy.app");
    const token = parsed.searchParams.get("token")?.trim();
    return token || null;
  } catch {
    return null;
  }
}

export function extractShortCodeFromRedirectUrl(
  redirectUrl: string,
): string | null {
  const raw = (redirectUrl || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, "https://qrbuddy.app");
    const code = parsed.searchParams.get("code")?.trim() ||
      parsed.searchParams.get("c")?.trim();
    return code || null;
  } catch {
    return null;
  }
}

export function toLocalDateTimeInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function parseServerRoutingConfig(
  value: unknown,
): Record<string, unknown> | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

export function normalizeServerQRToSavedConfig(
  record: ServerDynamicQRRecord,
): SavedDynamicQRConfig {
  const mode = record.routing_mode === "sequential" ||
      record.routing_mode === "device" ||
      record.routing_mode === "time"
    ? record.routing_mode
    : "simple";
  const parsedRouting = parseServerRoutingConfig(record.routing_config);

  return {
    destinationUrl: record.destination_url,
    routingMode: mode,
    routingConfig: mode === "simple" ? null : parsedRouting,
    splashConfig: record.splash_config?.enabled
      ? { ...record.splash_config }
      : null,
    scanLimit: typeof record.max_scans === "number" ? record.max_scans : null,
    expiresAt: record.expires_at ?? null,
    isActive: record.is_active !== false,
  };
}

export function hydrateBehaviorStateFromConfig(
  config: SavedDynamicQRConfig,
): HydratedDynamicBehaviorState {
  const isSequential = config.routingMode === "sequential";
  const rawConfig = config.routingConfig as Record<string, unknown> | null;
  const rawUrls = isSequential && Array.isArray(rawConfig?.urls)
    ? rawConfig.urls.filter((u): u is string => typeof u === "string")
    : [];
  const sequentialUrls = rawUrls.length >= 2
    ? [...rawUrls]
    : rawUrls.length === 1
    ? [rawUrls[0], ""]
    : ["", ""];
  const dailySpins = isSequential &&
      typeof rawConfig?.dailySpins === "number" &&
      Number.isInteger(rawConfig.dailySpins) &&
      rawConfig.dailySpins >= 1 &&
      rawConfig.dailySpins <= 99
    ? rawConfig.dailySpins
    : null;

  return {
    destinationUrl: config.destinationUrl,
    isSequential,
    sequentialUrls,
    loopSequence: isSequential ? rawConfig?.loop === true : false,
    randomSequence: isSequential ? rawConfig?.random === true : false,
    dailySpins,
    splashConfig: config.splashConfig?.enabled
      ? { ...config.splashConfig }
      : null,
    scanLimit: config.scanLimit ?? null,
    expiryDate: config.expiresAt ? toLocalDateTimeInput(config.expiresAt) : "",
    isActive: config.isActive !== false,
  };
}

export function buildDynamicQRUpdatePayload(
  input: DynamicQRUpdateInput,
):
  | {
    ok: true;
    payload: Record<string, unknown>;
    nextConfig: SavedDynamicQRConfig;
  }
  | { ok: false; error: string } {
  const cleanToken = (input.ownerToken || "").trim();
  if (!cleanToken) {
    return { ok: false, error: "Missing edit key for this QR." };
  }

  const cleanRedirect = (input.redirectUrl || "").trim();
  const rawDest = (input.destinationUrl || "").trim();
  const destIsRedirect = Boolean(
    cleanRedirect && rawDest &&
      normalizeUrl(rawDest) === normalizeUrl(cleanRedirect),
  );

  let resolvedDest = !destIsRedirect && looksLikeUrl(rawDest)
    ? normalizeUrl(rawDest)
    : "";
  let routingMode: "simple" | "sequential" = "simple";
  let routingConfig: DynamicSequentialRoutingConfig | null = null;

  if (input.isSequential) {
    const validUrls = (input.sequentialUrls || [])
      .filter((u) => looksLikeUrl(u))
      .map((u) => normalizeUrl(u))
      .filter((u) => u.trim() !== "");
    if (validUrls.length < 2) {
      return {
        ok: false,
        error: "Add at least 2 valid links for rotation.",
      };
    }
    if (!resolvedDest) {
      resolvedDest = validUrls[0];
    }
    const validDailySpins = input.randomSequence &&
        typeof input.dailySpins === "number" &&
        Number.isInteger(input.dailySpins) &&
        input.dailySpins >= 1 &&
        input.dailySpins <= 99
      ? input.dailySpins
      : null;

    routingMode = "sequential";
    routingConfig = {
      urls: validUrls,
      loop: Boolean(input.loopSequence),
      ...(input.randomSequence ? { random: true } : {}),
      ...(validDailySpins !== null ? { dailySpins: validDailySpins } : {}),
    };
  } else if (!resolvedDest) {
    return {
      ok: false,
      error: "Add a valid destination link before saving.",
    };
  }

  let maxScans: number | null = null;
  if (input.scanLimit !== null && input.scanLimit !== undefined) {
    if (!Number.isInteger(input.scanLimit) || input.scanLimit < 1) {
      return { ok: false, error: "Scan limit must be at least 1." };
    }
    maxScans = input.scanLimit;
  }

  let expiresAt: string | null = null;
  const cleanExpiry = (input.expiryDate || "").trim();
  if (cleanExpiry) {
    const parsedExpiry = new Date(cleanExpiry);
    if (!Number.isFinite(parsedExpiry.getTime())) {
      return { ok: false, error: "Invalid expiry date." };
    }
    expiresAt = parsedExpiry.toISOString();
  }

  let normalizedSplash: DynamicSplashConfig | null = null;
  if (input.splashConfig && input.splashConfig.enabled) {
    const cleanTitle = (input.splashConfig.title || "").trim().slice(0, 100) ||
      "Welcome!";
    const cleanBtn =
      (input.splashConfig.buttonText || "").trim().slice(0, 50) || "Continue";
    const cleanDesc = (input.splashConfig.description || "").trim().slice(
      0,
      500,
    );
    const cleanBrand = (input.splashConfig.brandName || "").trim().slice(0, 60);
    const rawImg = (input.splashConfig.imageUrl || "").trim();
    const cleanImg = rawImg ? normalizeUrl(rawImg) : "";
    if (cleanImg) {
      try {
        const parsedImg = new URL(cleanImg);
        if (parsedImg.protocol !== "http:" && parsedImg.protocol !== "https:") {
          return {
            ok: false,
            error: "Cover image requires an http or https link.",
          };
        }
      } catch {
        return {
          ok: false,
          error: "Cover image requires a valid http or https link.",
        };
      }
    }
    const cleanAccent = (input.splashConfig.accentColor || "").trim();

    normalizedSplash = {
      enabled: true,
      title: cleanTitle,
      buttonText: cleanBtn,
      ...(cleanDesc ? { description: cleanDesc } : {}),
      ...(cleanImg ? { imageUrl: cleanImg } : {}),
      ...(cleanBrand ? { brandName: cleanBrand } : {}),
      ...(/^#[0-9a-fA-F]{6}$/.test(cleanAccent)
        ? { accentColor: cleanAccent }
        : {}),
      ...(input.splashConfig.unbranded === true ? { unbranded: true } : {}),
    };
  }

  const isActive = input.isActive !== false;

  const payload: Record<string, unknown> = {
    owner_token: cleanToken,
    destination_url: resolvedDest,
    max_scans: maxScans,
    expires_at: expiresAt,
    is_active: isActive,
    routing_mode: routingMode,
    routing_config: routingConfig,
    splash_config: normalizedSplash,
  };

  return {
    ok: true,
    payload,
    nextConfig: {
      destinationUrl: resolvedDest,
      routingMode,
      routingConfig,
      splashConfig: normalizedSplash,
      scanLimit: maxScans,
      expiresAt,
      isActive,
    },
  };
}

interface UseDynamicQRProps {
  url: Signal<string>;
  editUrl: Signal<string>;
  scanLimit: number | null;
  expiryDate: string;
  routingMode?: "simple" | "sequential";
  routingConfig?: DynamicSequentialRoutingConfig;
  splashConfig?: DynamicSplashConfig | null;
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [shortCode, setShortCode] = useState("");
  const [ownerToken, setOwnerToken] = useState("");
  const [savedDynamicConfig, setSavedDynamicConfig] = useState<
    SavedDynamicQRConfig | null
  >(null);

  const creating = useRef(false);
  const updating = useRef(false);
  const redirectUrlRef = useRef("");

  const resolveActiveToken = async (
    tokenOverride?: string,
  ): Promise<string | null> => {
    if (tokenOverride?.trim()) return tokenOverride.trim();
    if (ownerToken.trim()) return ownerToken.trim();
    const fromEditUrl = extractOwnerTokenFromEditUrl(editUrl.value);
    if (fromEditUrl) return fromEditUrl;
    const code = shortCode || extractShortCodeFromRedirectUrl(url.value);
    if (code) {
      return await getOwnerToken("qr", code);
    }
    return null;
  };

  const createDynamicQR = async (destinationUrl: string) => {
    if (creating.current) return;
    creating.current = true;
    try {
      setIsCreating(true);
      haptics.medium();

      const apiUrl = getApiUrl();
      const normalizedDest = normalizeUrl(destinationUrl);

      const normalizedRoutingConfig = routingConfig
        ? {
          ...routingConfig,
          urls: (routingConfig.urls || []).map(normalizeUrl).filter((u) =>
            u.trim() !== ""
          ),
        }
        : undefined;

      const resolvedMode = routingMode ?? "simple";
      const resolvedExpiresAt = expiryDate
        ? new Date(expiryDate).toISOString()
        : null;
      const resolvedSplash = splashConfig && splashConfig.enabled
        ? splashConfig
        : null;

      const body: Record<string, unknown> = {
        destination_url: normalizedDest,
        title: normalizedDest,
      };
      if (scanLimit) body.max_scans = scanLimit;
      if (resolvedExpiresAt) body.expires_at = resolvedExpiresAt;
      if (routingMode) body.routing_mode = routingMode;
      if (normalizedRoutingConfig) {
        body.routing_config = normalizedRoutingConfig;
      }
      if (resolvedSplash) {
        body.splash_config = resolvedSplash;
      }

      // Use shared API helper (automatically includes auth headers and user session if signed in)
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
          useUserAuth: isPlusLibraryEnabled(),
        },
        "Failed to create dynamic QR",
      );

      // Update URL to the redirect URL and track minted metadata
      redirectUrlRef.current = data.redirect_url;
      url.value = data.redirect_url;
      editUrl.value = data.edit_url;
      setShortCode(data.short_code);
      setOwnerToken(data.owner_token);
      setSavedDynamicConfig({
        destinationUrl: normalizedDest,
        routingMode: resolvedMode,
        routingConfig: resolvedMode === "sequential" && normalizedRoutingConfig
          ? normalizedRoutingConfig
          : null,
        splashConfig: resolvedSplash,
        scanLimit: scanLimit ?? null,
        expiresAt: resolvedExpiresAt,
        isActive: true,
      });

      // Store owner token securely for future edits
      const ownerTokenStored = await saveOwnerToken(
        "qr",
        data.short_code,
        data.owner_token,
      );
      const historyStored = addToHistory({
        type: "dynamic",
        content: data.redirect_url,
        metadata: {
          title: normalizedDest,
          destinationUrl: normalizedDest,
          shortCode: data.short_code,
          editUrl: data.edit_url,
          ...(ownerTokenStored ? { ownerScope: "qr" } : {}),
        },
      });

      // Auto-Copy URL
      let linkCopied = false;
      try {
        await navigator.clipboard.writeText(data.redirect_url);
        linkCopied = true;
      } catch (err) {
        console.warn("Auto-copy failed:", err);
      }

      // Success feedback
      haptics.success();

      let successMessage = "✅ Dynamic QR created";
      successMessage += linkCopied
        ? " · link copied 🔗"
        : " · scan or save the QR to share it";
      if (!ownerTokenStored) {
        successMessage +=
          " · save the edit link below; this device couldn't remember it";
      }
      if (!historyStored) successMessage += " · history couldn't be saved";
      addToast(successMessage, ownerTokenStored && historyStored ? 3000 : 6000);

      setIsCreating(false);
    } catch (error) {
      setIsCreating(false);
      reportFailure(
        "[HOOK:useDynamicQR] Create failed",
        error,
        "❌ Failed to create dynamic QR",
      );
    } finally {
      creating.current = false;
      setIsCreating(false);
    }
  };

  const hydrateDynamicQR = async (
    tokenOverride?: string,
  ): Promise<SavedDynamicQRConfig | null> => {
    const resolvedToken = await resolveActiveToken(tokenOverride);
    if (!resolvedToken) return savedDynamicConfig;
    if (savedDynamicConfig && ownerToken === resolvedToken) {
      return savedDynamicConfig;
    }

    setIsHydrating(true);
    try {
      const apiUrl = getApiUrl();
      const result = await apiRequest<{ data?: ServerDynamicQRRecord }>(
        `${apiUrl}/get-dynamic-qr?token=${encodeURIComponent(resolvedToken)}`,
        {
          useUserAuth: isPlusLibraryEnabled(),
        },
        "Failed to load QR settings",
      );
      if (!result?.data) return savedDynamicConfig;

      const normalized = normalizeServerQRToSavedConfig(result.data);
      setOwnerToken(resolvedToken);
      if (result.data.short_code) {
        setShortCode(result.data.short_code);
      }
      setSavedDynamicConfig(normalized);
      return normalized;
    } catch (err) {
      console.warn("[HOOK:useDynamicQR] Hydrate failed:", err);
      return savedDynamicConfig;
    } finally {
      setIsHydrating(false);
    }
  };

  const updateDynamicQR = async (
    updates: Omit<DynamicQRUpdateInput, "ownerToken"> & { ownerToken?: string },
  ): Promise<
    { ok: true; data: SavedDynamicQRConfig } | { ok: false; error: string }
  > => {
    if (updating.current) {
      return { ok: false, error: "Save already in progress." };
    }
    updating.current = true;
    setIsUpdating(true);
    haptics.medium();

    try {
      const resolvedToken = await resolveActiveToken(updates.ownerToken);
      const activeRedirect = updates.redirectUrl ||
        redirectUrlRef.current ||
        (extractShortCodeFromRedirectUrl(url.value) ? url.value : "");

      const built = buildDynamicQRUpdatePayload({
        ...updates,
        ownerToken: resolvedToken || "",
        redirectUrl: activeRedirect,
      });
      if (!built.ok) {
        haptics.error();
        return built;
      }

      const apiUrl = getApiUrl();
      const response = await apiRequest<{
        success?: boolean;
        data?: ServerDynamicQRRecord;
      }>(
        `${apiUrl}/update-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(built.payload),
          useUserAuth: isPlusLibraryEnabled(),
        },
        "Failed to save QR settings",
      );

      const nextSaved = response?.data
        ? normalizeServerQRToSavedConfig(response.data)
        : built.nextConfig;
      const activeShortCode = response?.data?.short_code ||
        shortCode ||
        extractShortCodeFromRedirectUrl(activeRedirect) ||
        "";

      if (resolvedToken) setOwnerToken(resolvedToken);
      if (activeShortCode) setShortCode(activeShortCode);
      setSavedDynamicConfig(nextSaved);

      // Keep the encoded QR matrix locked to the short redirect link
      if (activeRedirect && url.value !== activeRedirect) {
        url.value = activeRedirect;
      }

      if (activeShortCode && nextSaved.destinationUrl) {
        updateHistoryItem(
          (item) =>
            item.metadata?.shortCode === activeShortCode ||
            item.content.includes(`code=${activeShortCode}`),
          (item) => ({
            ...item,
            metadata: {
              ...item.metadata,
              title: nextSaved.destinationUrl,
              url: nextSaved.destinationUrl,
              destinationUrl: nextSaved.destinationUrl,
            },
          }),
        );
      }

      haptics.success();
      return { ok: true, data: nextSaved };
    } catch (error) {
      haptics.error();
      const message = error instanceof Error
        ? error.message
        : "Failed to save QR settings";
      return { ok: false, error: message };
    } finally {
      updating.current = false;
      setIsUpdating(false);
    }
  };

  const resetDynamicQR = () => {
    redirectUrlRef.current = "";
    setShortCode("");
    setOwnerToken("");
    setSavedDynamicConfig(null);
  };

  return {
    isCreating,
    isUpdating,
    isHydrating,
    shortCode,
    ownerToken,
    savedDynamicConfig,
    createDynamicQR,
    hydrateDynamicQR,
    updateDynamicQR,
    resetDynamicQR,
  };
}

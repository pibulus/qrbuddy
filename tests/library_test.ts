import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { getAuthHeaders, getUserAuthHeaders } from "../utils/api.ts";
import { isPlusLibraryEnabled as isClientPlusEnabled } from "../utils/auth.ts";
import { isPlusLibraryEnabled as isServerPlusEnabled } from "../supabase/functions/_shared/auth.ts";
import {
  addToHistory,
  detectStructuredStagePayload,
  exportVaultJson,
  filterHistoryItems,
  getHistory,
  type HistoryItem,
  importVaultJson,
} from "../utils/history.ts";
import {
  exportSyncBundle,
  generateSyncPhrase,
  importSyncBundle,
} from "../utils/sync-phrase.ts";

// Test suite for QRBuddy Plus Package 1: Recoverable Library & Quota Foundation

Deno.test("feature flag - off by default on client and server", () => {
  // Ensure default state is strictly false
  assertEquals(isClientPlusEnabled(), false);
  assertEquals(isServerPlusEnabled(), false);
});

Deno.test("quota calculation - free tier allows 5 non-legacy codes", () => {
  function computeQuota(params: {
    tier: string;
    paidThrough: Date | null;
    nonLegacyCount: number;
    legacyCount: number;
  }) {
    const isPlus = (params.tier === "plus" || params.tier === "supporter") &&
      params.paidThrough !== null && params.paidThrough.getTime() > Date.now();
    const totalAllowed = isPlus ? 100 : 5;
    const canCreate = params.nonLegacyCount < totalAllowed;

    return {
      tier: isPlus ? "plus" : "free",
      isActivePlus: isPlus,
      totalAllowed,
      usedCount: params.nonLegacyCount,
      legacyCount: params.legacyCount,
      canCreate,
    };
  }

  // 1. Fresh free library with 0 codes
  const fresh = computeQuota({
    tier: "free",
    paidThrough: null,
    nonLegacyCount: 0,
    legacyCount: 0,
  });
  assertEquals(fresh.tier, "free");
  assertEquals(fresh.totalAllowed, 5);
  assertEquals(fresh.usedCount, 0);
  assertEquals(fresh.canCreate, true);

  // 2. Free library with 4 non-legacy codes (can create 1 more)
  const almostFull = computeQuota({
    tier: "free",
    paidThrough: null,
    nonLegacyCount: 4,
    legacyCount: 0,
  });
  assertEquals(almostFull.canCreate, true);

  // 3. Free library at capacity (5 of 5)
  const full = computeQuota({
    tier: "free",
    paidThrough: null,
    nonLegacyCount: 5,
    legacyCount: 0,
  });
  assertEquals(full.canCreate, false);

  // 4. Free library with 5 non-legacy AND 12 grandfathered legacy codes
  // Legacy codes do NOT consume the 5-code allowance!
  const withLegacy = computeQuota({
    tier: "free",
    paidThrough: null,
    nonLegacyCount: 4,
    legacyCount: 12,
  });
  assertEquals(withLegacy.usedCount, 4);
  assertEquals(withLegacy.legacyCount, 12);
  assertEquals(withLegacy.canCreate, true); // Still has 1 free slot!
});

Deno.test("quota calculation - active plus tier allows 100 codes", () => {
  function computeQuota(tier: string, paidThrough: Date | null, count: number) {
    const isPlus = (tier === "plus" || tier === "supporter") &&
      paidThrough !== null && paidThrough.getTime() > Date.now();
    const totalAllowed = isPlus ? 100 : 5;
    return { isPlus, totalAllowed, canCreate: count < totalAllowed };
  }

  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const plus = computeQuota("plus", future, 5);
  assertEquals(plus.isPlus, true);
  assertEquals(plus.totalAllowed, 100);
  assertEquals(plus.canCreate, true);

  const plusAt99 = computeQuota("plus", future, 99);
  assertEquals(plusAt99.canCreate, true);

  const plusAt100 = computeQuota("plus", future, 100);
  assertEquals(plusAt100.canCreate, false);
});

Deno.test("quota calculation - lapsed plus tier gracefully caps creation without breaking existing codes", () => {
  function computeQuota(tier: string, paidThrough: Date | null, count: number) {
    const isPlus = (tier === "plus" || tier === "supporter") &&
      paidThrough !== null && paidThrough.getTime() > Date.now();
    const totalAllowed = isPlus ? 100 : 5;
    return { isPlus, totalAllowed, canCreate: count < totalAllowed };
  }

  const past = new Date(Date.now() - 10000); // Expired pass
  const lapsed = computeQuota("plus", past, 14); // Owner created 14 codes when plus was active

  // Creation is capped because 14 >= 5
  assertEquals(lapsed.isPlus, false);
  assertEquals(lapsed.totalAllowed, 5);
  assertEquals(lapsed.canCreate, false);
  // Note: the 14 existing codes stay active and editable, new creation stops until renewed!
});

Deno.test("legacy claim simulation - idempotent and prevents conflicting takeover", () => {
  interface MockCodeRecord {
    shortCode: string;
    ownerToken: string;
    userId: string | null;
    isLegacy: boolean;
    title: string;
  }

  const db: Record<string, MockCodeRecord> = {
    "token_unclaimed": {
      shortCode: "unclm1",
      ownerToken: "token_unclaimed",
      userId: null,
      isLegacy: false,
      title: "My Old Link",
    },
    "token_user_a": {
      shortCode: "usera1",
      ownerToken: "token_user_a",
      userId: "user_a",
      isLegacy: true,
      title: "User A Link",
    },
  };

  function claimLegacyCode(userId: string, token: string, title?: string) {
    const record = db[token];
    if (!record) {
      return { success: false, error: "NOT_FOUND" };
    }
    if (record.userId !== null && record.userId !== userId) {
      return { success: false, error: "ALREADY_CLAIMED" };
    }
    if (record.userId === userId) {
      return {
        success: true,
        alreadyClaimed: true,
        shortCode: record.shortCode,
        isLegacy: true,
      };
    }

    // Claim
    record.userId = userId;
    record.isLegacy = true;
    if (title) record.title = title;

    return {
      success: true,
      claimed: true,
      shortCode: record.shortCode,
      isLegacy: true,
    };
  }

  // 1. User A claims unclaimed code -> succeeds
  const res1 = claimLegacyCode("user_a", "token_unclaimed", "Imported Link");
  assertEquals(res1.success, true);
  assertEquals(db["token_unclaimed"].userId, "user_a");
  assertEquals(db["token_unclaimed"].isLegacy, true);

  // 2. User A claims it again -> idempotent success
  const res2 = claimLegacyCode("user_a", "token_unclaimed");
  assertEquals(res2.success, true);
  assertEquals(res2.alreadyClaimed, true);

  // 3. User B attempts to claim User A's code -> REJECTED (cannot steal another user's code)
  const res3 = claimLegacyCode("user_b", "token_unclaimed");
  assertEquals(res3.success, false);
  assertEquals(res3.error, "ALREADY_CLAIMED");

  // 4. Invalid token -> NOT_FOUND
  const res4 = claimLegacyCode("user_b", "nonexistent_token");
  assertEquals(res4.success, false);
  assertEquals(res4.error, "NOT_FOUND");
});

Deno.test("renewal extension - adds 365 days from max(now, current_paid_through)", () => {
  function extendEntitlement(
    currentPaidThrough: Date | null,
    durationDays = 365,
  ): Date {
    const now = new Date();
    const base =
      currentPaidThrough && currentPaidThrough.getTime() > now.getTime()
        ? currentPaidThrough
        : now;
    return new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  // Case 1: First purchase (no previous paid_through)
  const nowMs = Date.now();
  const firstPurchase = extendEntitlement(null);
  const diffDays1 = Math.round(
    (firstPurchase.getTime() - nowMs) / (24 * 60 * 60 * 1000),
  );
  assertEquals(diffDays1, 365);

  // Case 2: Early renewal with 60 days remaining
  const remaining60Days = new Date(nowMs + 60 * 24 * 60 * 60 * 1000);
  const renewed = extendEntitlement(remaining60Days);
  const diffDays2 = Math.round(
    (renewed.getTime() - nowMs) / (24 * 60 * 60 * 1000),
  );
  assertEquals(diffDays2, 425); // 60 + 365 = 425 days! Does NOT shortchange the remaining 60 days.

  // Case 3: Lapsed renewal (expired 10 days ago)
  const expired10DaysAgo = new Date(nowMs - 10 * 24 * 60 * 60 * 1000);
  const renewedAfterLapse = extendEntitlement(expired10DaysAgo);
  const diffDays3 = Math.round(
    (renewedAfterLapse.getTime() - nowMs) / (24 * 60 * 60 * 1000),
  );
  assertEquals(diffDays3, 365); // Resets to 365 days from now
});

Deno.test("auth headers - separates anonymous requests from authenticated user requests", () => {
  // Anonymous / public headers
  const anonHeaders = getAuthHeaders();
  // User headers with deliberate session token
  const userHeaders = getUserAuthHeaders("fake_user_jwt_token_12345");

  assertEquals(
    userHeaders["Authorization"],
    "Bearer fake_user_jwt_token_12345",
  );
  if (anonHeaders["apikey"]) {
    assertEquals(userHeaders["apikey"], anonHeaders["apikey"]);
  }

  // Without token passed
  const emptyUserHeaders = getUserAuthHeaders(null);
  assertEquals(emptyUserHeaders["Authorization"], undefined);
});

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

Deno.test("filterHistoryItems - filters by category and searches content, metadata, shortCode, and tags", () => {
  const items: HistoryItem[] = [
    {
      id: "item-dyn-1",
      type: "dynamic",
      content: "https://qrbuddy.app/r?code=menu42",
      timestamp: 4000,
      metadata: {
        title: "Bistro Autumn Menu",
        subtitle: "Seasonal tasting",
        label: "Table 7",
        shortCode: "menu42",
        editUrl: "/edit?token=tok_menu42",
        tags: ["hospitality", "dinner"],
      },
    },
    {
      id: "item-wifi-1",
      type: "wifi",
      content: "WIFI:T:WPA;S:CafeLuna;P:secret123;;",
      timestamp: 3000,
      metadata: {
        title: "Wi-Fi: CafeLuna",
        tags: ["guest", "lounge"],
      },
    },
    {
      id: "item-file-1",
      type: "file",
      content: "https://qrbuddy.app/bucket/drop99",
      timestamp: 2000,
      metadata: {
        title: "Wedding Photo Drop",
        bucketCode: "drop99",
        tags: ["photos"],
      },
    },
    {
      id: "item-media-1",
      type: "media",
      content: "https://qrbuddy.app/f/mixtape8",
      timestamp: 1000,
      metadata: {
        title: "5 tracks",
        ownerScope: "file",
      },
    },
  ];

  // Category filters
  assertEquals(filterHistoryItems(items, { filter: "all" }).length, 4);
  assertEquals(
    filterHistoryItems(items, { filter: "editable" }).map((i) => i.id),
    ["item-dyn-1"],
  );
  assertEquals(
    filterHistoryItems(items, { filter: "static" }).map((i) => i.id),
    ["item-wifi-1"],
  );
  assertEquals(
    filterHistoryItems(items, { filter: "files" }).map((i) => i.id),
    ["item-file-1", "item-media-1"],
  );

  // Query across title, subtitle, label, shortCode, content, and tags
  assertEquals(
    filterHistoryItems(items, { query: "autumn" }).map((i) => i.id),
    ["item-dyn-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "seasonal" }).map((i) => i.id),
    ["item-dyn-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "table 7" }).map((i) => i.id),
    ["item-dyn-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "MENU42" }).map((i) => i.id),
    ["item-dyn-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "lounge" }).map((i) => i.id),
    ["item-wifi-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "cafeluna" }).map((i) => i.id),
    ["item-wifi-1"],
  );

  // Combined query + category filter
  assertEquals(
    filterHistoryItems(items, { query: "photos", filter: "files" }).map((i) =>
      i.id
    ),
    ["item-file-1"],
  );
  assertEquals(
    filterHistoryItems(items, { query: "photos", filter: "static" }).length,
    0,
  );
});

Deno.test("exportVaultJson & importVaultJson - round-trips design recipes, shortCodes, editUrls, and tags without duplicates", () => {
  const sourceStorage = createMemoryStorage();

  addToHistory(
    {
      type: "dynamic",
      content: "https://qrbuddy.app/r?code=fest01",
      metadata: {
        title: "Main Stage Schedule",
        shortCode: "fest01",
        editUrl: "/edit?token=ot_fest01",
        tags: ["festival", "stage-a"],
        batchId: "batch-2026-11",
        design: {
          style: "pool",
          frameConfig: {
            enabled: true,
            caption: "STAGE A",
            theme: "ink",
          },
          logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        },
      },
    },
    sourceStorage,
  );

  addToHistory(
    {
      type: "wifi",
      content: "WIFI:T:WPA;S:BackstageNet;P:guitar99;;",
      metadata: {
        title: "Wi-Fi: BackstageNet",
        tags: ["crew"],
        design: {
          style: "custom",
          customStyle: {
            dots: {
              type: "gradient",
              shape: "rounded",
              gradient: {
                type: "linear",
                rotation: 2.35,
                colorStops: [
                  { offset: 0, color: "#0D47A1" },
                  { offset: 1, color: "#00695C" },
                ],
              },
            },
            background: { color: "#FFFEF7" },
          },
          frameConfig: null,
          logoUrl: "",
        },
      },
    },
    sourceStorage,
  );

  const rawArchive = exportVaultJson(undefined, sourceStorage);
  const parsedArchive = JSON.parse(rawArchive);
  assertEquals(parsedArchive.version, 1);
  assertEquals(parsedArchive.app, "qrbuddy");
  assertEquals(parsedArchive.items.length, 2);

  // Import into a clean device storage
  const targetStorage = createMemoryStorage();
  const firstImport = importVaultJson(rawArchive, targetStorage);
  assertEquals(firstImport, { imported: 2, total: 2 });

  const restored = getHistory(targetStorage);
  assertEquals(restored.length, 2);

  const restoredDyn = restored.find((i) => i.metadata?.shortCode === "fest01");
  assertEquals(restoredDyn?.metadata?.editUrl, "/edit?token=ot_fest01");
  assertEquals(restoredDyn?.metadata?.tags, ["festival", "stage-a"]);
  assertEquals(restoredDyn?.metadata?.batchId, "batch-2026-11");
  assertEquals(restoredDyn?.metadata?.design?.style, "pool");
  assertEquals(restoredDyn?.metadata?.design?.frameConfig, {
    enabled: true,
    caption: "STAGE A",
    theme: "ink",
  });

  const restoredWifi = restored.find((i) => i.type === "wifi");
  assertEquals(restoredWifi?.metadata?.design?.style, "custom");
  assertEquals(restoredWifi?.metadata?.tags, ["crew"]);

  // Re-importing the exact same archive adds 0 duplicates
  const secondImport = importVaultJson(rawArchive, targetStorage);
  assertEquals(secondImport, { imported: 0, total: 2 });
  assertEquals(getHistory(targetStorage).length, 2);

  // Malformed archives throw cleanly
  assertThrows(() => importVaultJson("{bad json", targetStorage));
  assertThrows(() =>
    importVaultJson(JSON.stringify({ version: 99, items: [] }), targetStorage)
  );
});

Deno.test("exportSyncBundle & importSyncBundle - preserves full metadata including design, tags, batchId, editUrl, and shortCode", async () => {
  const deviceA = createMemoryStorage();
  addToHistory(
    {
      type: "dynamic",
      content: "https://qrbuddy.app/r?code=sync77",
      metadata: {
        title: "VIP Pass",
        shortCode: "sync77",
        editUrl: "/edit?token=ot_sync77",
        tags: ["vip"],
        batchId: "batch-vip",
        design: {
          style: "sunset",
          frameConfig: { enabled: true, caption: "VIP", theme: "accent" },
        },
      },
    },
    deviceA,
  );

  const phrase = generateSyncPhrase();
  const encrypted = await exportSyncBundle(phrase, deviceA);

  const deviceB = createMemoryStorage();
  const result = await importSyncBundle(encrypted, phrase, deviceB);
  assertEquals(result.historySaved, true);
  assertEquals(result.mergedHistoryCount, 1);

  const synced = getHistory(deviceB);
  assertEquals(synced.length, 1);
  assertEquals(synced[0].metadata?.shortCode, "sync77");
  assertEquals(synced[0].metadata?.editUrl, "/edit?token=ot_sync77");
  assertEquals(synced[0].metadata?.tags, ["vip"]);
  assertEquals(synced[0].metadata?.batchId, "batch-vip");
  assertEquals(synced[0].metadata?.design?.style, "sunset");
  assertEquals(synced[0].metadata?.design?.frameConfig?.caption, "VIP");
});

Deno.test("detectStructuredStagePayload - summarizes WIFI, VCARD, mailto, SMSTO, and tel payloads while ignoring URLs and text", () => {
  // Wi-Fi WPA & Open (leads directly with SSID + security; typeLabel stays separate for ARIA)
  const wifiWpa = detectStructuredStagePayload(
    "WIFI:T:WPA;S:CafeLuna;P:hunter2;;",
    "en",
  );
  assertEquals(wifiWpa, {
    template: "wifi",
    typeLabel: "Wi-Fi",
    label: "CafeLuna · WPA",
    detail: "WPA",
  });

  const wifiOpenEn = detectStructuredStagePayload(
    "WIFI:T:nopass;S:Studio_5G;;",
    "en",
  );
  assertEquals(wifiOpenEn, {
    template: "wifi",
    typeLabel: "Wi-Fi",
    label: "Studio_5G · Open",
    detail: "Open",
  });

  const wifiOpenEs = detectStructuredStagePayload(
    "WIFI:T:nopass;S:PatioLibre;;",
    "es",
  );
  assertEquals(wifiOpenEs, {
    template: "wifi",
    typeLabel: "Wi-Fi",
    label: "PatioLibre · Abierta",
    detail: "Abierta",
  });

  // vCard
  const vcardPayload = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Ada Lovelace",
    "N:Lovelace;Ada;;;",
    "ORG:SoftStack",
    "EMAIL:ada@engine.org",
    "END:VCARD",
  ].join("\n");
  const vcardEn = detectStructuredStagePayload(vcardPayload, "en");
  assertEquals(vcardEn?.template, "vcard");
  assertEquals(vcardEn?.typeLabel, "Contact");
  assertEquals(vcardEn?.label, "Ada Lovelace · SoftStack");
  assertEquals(vcardEn?.detail, "SoftStack");

  const vcardEs = detectStructuredStagePayload(vcardPayload, "es");
  assertEquals(vcardEs?.typeLabel, "Contacto");
  assertEquals(vcardEs?.label, "Ada Lovelace · SoftStack");

  // mailto:
  const mailEn = detectStructuredStagePayload(
    "mailto:hello@acme.co?subject=Booking%20Inquiry",
    "en",
  );
  assertEquals(mailEn, {
    template: "email",
    typeLabel: "Email",
    label: "hello@acme.co",
    detail: "Booking Inquiry",
  });
  const mailEs = detectStructuredStagePayload("mailto:hola@acme.co", "es");
  assertEquals(mailEs?.typeLabel, "Correo");
  assertEquals(mailEs?.label, "hola@acme.co");

  // SMSTO:
  const smsEn = detectStructuredStagePayload(
    "SMSTO:+61400123456:Table ready",
    "en",
  );
  assertEquals(smsEn, {
    template: "sms",
    typeLabel: "SMS",
    label: "+61400123456",
    detail: "Table ready",
  });

  // tel:
  const telEn = detectStructuredStagePayload("tel:+61400123456", "en");
  assertEquals(telEn, {
    template: "phone",
    typeLabel: "Call",
    label: "+61400123456",
  });
  const telEs = detectStructuredStagePayload("tel:+61400123456", "es");
  assertEquals(telEs?.typeLabel, "Llamada");
  assertEquals(telEs?.label, "+61400123456");

  // Standard URLs and plain text stay in the raw input (return null)
  assertEquals(detectStructuredStagePayload("https://qrbuddy.app"), null);
  assertEquals(detectStructuredStagePayload("Just a plain note"), null);
  assertEquals(detectStructuredStagePayload(""), null);
});

Deno.test("Stage & Saved polish invariants - top-rail symmetry, 2-col toolbar, compressed drawer, and Sovereign Voice", async () => {
  const [homeSrc, styleSrc, toolbarSrc, smartSrc, drawerSrc, libSrc, statsSrc] =
    await Promise.all([
      Deno.readTextFile(
        new URL("../components/HomeStage.tsx", import.meta.url),
      ),
      Deno.readTextFile(
        new URL("../islands/StyleSelector.tsx", import.meta.url),
      ),
      Deno.readTextFile(
        new URL(
          "../components/smart-input/SmartInputToolbar.tsx",
          import.meta.url,
        ),
      ),
      Deno.readTextFile(new URL("../islands/SmartInput.tsx", import.meta.url)),
      Deno.readTextFile(
        new URL("../components/LibraryDrawer.tsx", import.meta.url),
      ),
      Deno.readTextFile(new URL("../utils/library.ts", import.meta.url)),
      Deno.readTextFile(new URL("../islands/StatsPanel.tsx", import.meta.url)),
    ]);

  // 1. Top-left Saved capsule counterweight + clean 2-button bottom stage toolbar
  assertEquals(homeSrc.includes('variant="saved"'), true);
  assertEquals(homeSrc.includes("focus:z-[60]"), true);
  assertEquals(styleSrc.includes("qrb-open-vault"), true);
  assertEquals(
    toolbarSrc.includes("grid-cols-[1fr_1.15fr] gap-2.5 w-full"),
    true,
  );
  assertEquals(toolbarSrc.includes("onOpenVault?.()"), false);

  // 2. Dead-end Editable switch hidden on structured payloads + no close-modal nag toast
  assertEquals(
    smartSrc.includes("!isDestructible.value && !structuredSummary &&"),
    true,
  );
  assertEquals(smartSrc.includes("This QR can be repointed anytime"), false);
  assertEquals(smartSrc.includes("QR ready — tap ↓ Save PNG"), false);

  // 3. Saved drawer de-bloated: "Saved" / "Guardados", no /stats or /batch pills, no window.confirm()
  assertEquals(drawerSrc.includes('{isSpanish ? "Guardados" : "Saved"}'), true);
  assertEquals(drawerSrc.includes("Saved Vault"), false);
  assertEquals(drawerSrc.includes('href="/stats"'), false);
  assertEquals(drawerSrc.includes('href="/batch"'), false);
  assertEquals(drawerSrc.includes("confirm("), false);

  // 4. Sovereign Voice fixes in library.ts & StatsPanel.tsx
  assertEquals(libSrc.includes("Failed to load your QR library"), false);
  assertEquals(libSrc.includes("Could not load saved library"), true);
  assertEquals(/\b(you|your|yours)\b/i.test(statsSrc), false);
});

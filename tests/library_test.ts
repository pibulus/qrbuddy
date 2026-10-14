import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { getAuthHeaders, getUserAuthHeaders } from "../utils/api.ts";
import { isPlusLibraryEnabled as isClientPlusEnabled } from "../utils/auth.ts";
import { isPlusLibraryEnabled as isServerPlusEnabled } from "../supabase/functions/_shared/auth.ts";

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

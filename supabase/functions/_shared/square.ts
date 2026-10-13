// Square payment provider, ported from TalkType's squareProvider.js to Deno.
// One product: the A$49 annual Supporter Pass. Payment links are created per
// checkout (idempotent on checkout_id); the webhook confirms payment.

import { timingSafeEqual } from "https://deno.land/std@0.216.0/crypto/timing_safe_equal.ts";

const DEFAULT_SQUARE_VERSION = "2026-01-22";

function getSquareBaseUrl(): string {
  return Deno.env.get("SQUARE_ENVIRONMENT") === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function getSquareConfig() {
  return {
    accessToken: Deno.env.get("SQUARE_ACCESS_TOKEN")?.trim() ?? "",
    locationId: Deno.env.get("SQUARE_LOCATION_ID")?.trim() ?? "",
    apiVersion: Deno.env.get("SQUARE_API_VERSION")?.trim() ||
      DEFAULT_SQUARE_VERSION,
    webhookSignatureKey: Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY")?.trim() ??
      "",
    notificationUrl: Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL")?.trim() ??
      "",
  };
}

export function isSquareCheckoutConfigured(): boolean {
  const config = getSquareConfig();
  return Deno.env.get("SQUARE_CHECKOUT_ENABLED") === "true" &&
    Boolean(
      config.accessToken && config.locationId &&
        config.webhookSignatureKey && config.notificationUrl,
    );
}

export function getSupporterPriceMoney() {
  // Keep the public offer and provider aligned. A different offer requires a
  // reviewed product change, not an invisible environment-only price change.
  const amount = Number(Deno.env.get("SUPPORTER_PRICE_CENTS") ?? 4900);
  const currency = Deno.env.get("SUPPORTER_CURRENCY") ?? "AUD";
  if (amount !== 4900 || currency !== "AUD") {
    throw new Error("Supporter checkout must match the A$49 offer");
  }
  return { amount, currency };
}

export async function createSquareCheckout(
  { checkoutId, redirectUrl }: { checkoutId: string; redirectUrl: string },
) {
  const config = getSquareConfig();
  if (!isSquareCheckoutConfigured()) {
    throw new Error("Square checkout is not configured");
  }

  const priceMoney = getSupporterPriceMoney();
  const locationResponse = await fetch(
    `${getSquareBaseUrl()}/v2/locations/${
      encodeURIComponent(config.locationId)
    }`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Square-Version": config.apiVersion,
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  const location = (await locationResponse.json().catch(() => ({}))).location;
  if (
    !locationResponse.ok || location?.status !== "ACTIVE" ||
    location?.currency !== priceMoney.currency
  ) {
    throw new Error("Square location does not match the active AUD offer");
  }
  const response = await fetch(
    `${getSquareBaseUrl()}/v2/online-checkout/payment-links`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Square-Version": config.apiVersion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: checkoutId,
        description: `QRBuddy Supporter Pass ${checkoutId}`,
        quick_pay: {
          name: "QRBuddy Supporter Pass (1 year)",
          price_money: priceMoney,
          location_id: config.locationId,
        },
        checkout_options: {
          redirect_url: redirectUrl,
        },
        payment_note: `QRBuddy supporter checkout ${checkoutId}`,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.payment_link?.url) {
    console.error("[Square] Failed to create checkout:", payload);
    throw new Error("Could not start Square checkout");
  }

  return {
    paymentLinkId: payload.payment_link.id as string,
    providerOrderId: payload.payment_link.order_id as string,
    checkoutUrl:
      (payload.payment_link.long_url || payload.payment_link.url) as string,
    amount: priceMoney.amount,
    currency: priceMoney.currency,
  };
}

export async function verifySquareWebhookSignature(
  { rawBody, signature, notificationUrl }: {
    rawBody: string;
    signature: string;
    notificationUrl: string;
  },
): Promise<boolean> {
  const signatureKey = getSquareConfig().webhookSignatureKey;
  if (!signatureKey || !signature || !notificationUrl) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${notificationUrl}${rawBody}`),
    ),
  );

  let provided: Uint8Array;
  try {
    provided = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  return provided.length === expected.length &&
    timingSafeEqual(provided, expected);
}

// deno-lint-ignore no-explicit-any
export function extractSquarePayment(event: any) {
  const payment = event?.data?.object?.payment;
  if (!payment?.id || !payment?.order_id) {
    return null;
  }
  return payment;
}

export function paymentMatchesCheckout(
  payment: {
    amount_money?: { amount?: number; currency?: string };
    location_id?: string;
  },
  checkout: { amount: number; currency: string },
): boolean {
  return payment.amount_money?.amount === checkout.amount &&
    payment.amount_money?.currency === checkout.currency &&
    payment.location_id === getSquareConfig().locationId;
}

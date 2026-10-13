import { assertEquals, assertRejects, assertThrows } from "$std/assert/mod.ts";
import {
  createSquareCheckout,
  getSupporterPriceMoney,
  isSquareCheckoutConfigured,
  paymentMatchesCheckout,
  verifySquareWebhookSignature,
} from "../supabase/functions/_shared/square.ts";

function env(
  values: Record<string, string>,
  fn: () => void | Promise<void>,
) {
  const previous = new Map(
    Object.keys(values).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(values)) Deno.env.set(key, value);
  return Promise.resolve().then(fn).finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

Deno.test("checkout stays closed until explicitly enabled with complete fulfillment config", () =>
  env({
    SQUARE_CHECKOUT_ENABLED: "false",
    SQUARE_ACCESS_TOKEN: "test",
    SQUARE_LOCATION_ID: "location",
    SQUARE_WEBHOOK_SIGNATURE_KEY: "key",
    SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.com/webhook",
  }, () => {
    assertEquals(isSquareCheckoutConfigured(), false);
    Deno.env.set("SQUARE_CHECKOUT_ENABLED", "true");
    assertEquals(isSquareCheckoutConfigured(), true);
    Deno.env.set("SQUARE_WEBHOOK_SIGNATURE_KEY", "");
    assertEquals(isSquareCheckoutConfigured(), false);
  }));

Deno.test("charge price and currency cannot drift silently from the offer", () =>
  env({ SUPPORTER_PRICE_CENTS: "4900", SUPPORTER_CURRENCY: "AUD" }, () => {
    assertEquals(getSupporterPriceMoney(), { amount: 4900, currency: "AUD" });
    Deno.env.set("SUPPORTER_CURRENCY", "USD");
    assertThrows(getSupporterPriceMoney);
    Deno.env.set("SUPPORTER_CURRENCY", "AUD");
    Deno.env.set("SUPPORTER_PRICE_CENTS", "1900");
    assertThrows(getSupporterPriceMoney);
  }));

Deno.test("payment fulfillment requires exact checkout money and merchant location", () =>
  env({ SQUARE_LOCATION_ID: "correct" }, () => {
    const checkout = { amount: 4900, currency: "AUD" };
    assertEquals(
      paymentMatchesCheckout(
        { amount_money: checkout, location_id: "correct" },
        checkout,
      ),
      true,
    );
    assertEquals(
      paymentMatchesCheckout({
        amount_money: { amount: 1900, currency: "AUD" },
        location_id: "correct",
      }, checkout),
      false,
    );
    assertEquals(
      paymentMatchesCheckout({
        amount_money: { amount: 4900, currency: "USD" },
        location_id: "correct",
      }, checkout),
      false,
    );
    assertEquals(
      paymentMatchesCheckout(
        { amount_money: checkout, location_id: "wrong" },
        checkout,
      ),
      false,
    );
  }));

Deno.test("webhook signature binds exact body and notification URL", () =>
  env({ SQUARE_WEBHOOK_SIGNATURE_KEY: "test-signature-key" }, async () => {
    const notificationUrl = "https://example.com/webhook";
    const rawBody = '{"type":"payment.updated"}';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("test-signature-key"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const bytes = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(notificationUrl + rawBody),
      ),
    );
    const signature = btoa(String.fromCharCode(...bytes));
    assertEquals(
      await verifySquareWebhookSignature({
        notificationUrl,
        rawBody,
        signature,
      }),
      true,
    );
    assertEquals(
      await verifySquareWebhookSignature({
        notificationUrl,
        rawBody: rawBody + " ",
        signature,
      }),
      false,
    );
    assertEquals(
      await verifySquareWebhookSignature({
        notificationUrl: notificationUrl + "/",
        rawBody,
        signature,
      }),
      false,
    );
  }));

Deno.test("checkout refuses currency mismatch before creating a payment link", () =>
  env({
    SQUARE_CHECKOUT_ENABLED: "true",
    SQUARE_ACCESS_TOKEN: "test",
    SQUARE_LOCATION_ID: "location",
    SQUARE_WEBHOOK_SIGNATURE_KEY: "key",
    SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.com/webhook",
    SUPPORTER_PRICE_CENTS: "4900",
    SUPPORTER_CURRENCY: "AUD",
  }, async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = () => {
      calls++;
      return Promise.resolve(
        Response.json({ location: { status: "ACTIVE", currency: "USD" } }),
      );
    };
    try {
      await assertRejects(
        () =>
          createSquareCheckout({
            checkoutId: "test",
            redirectUrl: "https://example.com",
          }),
        Error,
        "AUD offer",
      );
      assertEquals(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }));

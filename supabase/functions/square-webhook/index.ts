// Edge Function: Square Webhook
// Square calls this on payment events. HMAC signature is the gate (no rate
// limit — dropping a legit retry would strand a paid supporter). On a
// COMPLETED payment matching a pending checkout, mints the license exactly
// once. Persistence failures return 500 on purpose so Square retries.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractSquarePayment,
  getSquareConfig,
  verifySquareWebhookSignature,
} from "../_shared/square.ts";
import { issueSupporterToken } from "../_shared/license.ts";

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  if (!getSquareConfig().webhookSignatureKey) {
    console.error("[SquareWebhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return new Response(
      JSON.stringify({ error: "Square webhook is not configured." }),
      { headers: jsonHeaders, status: 503 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
  // Square signs URL+body with the URL as registered in the dashboard.
  // The env override exists because the gateway-visible req.url can differ
  // from the registered notification URL.
  const notificationUrl =
    Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL")?.trim() ||
    req.url;

  if (
    !(await verifySquareWebhookSignature({
      rawBody,
      signature,
      notificationUrl,
    }))
  ) {
    console.warn("[SquareWebhook] Invalid signature");
    return new Response(JSON.stringify({ error: "Invalid signature." }), {
      headers: jsonHeaders,
      status: 403,
    });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON." }), {
      headers: jsonHeaders,
      status: 400,
    });
  }

  const payment = extractSquarePayment(payload);
  if (!payment || payment.status !== "COMPLETED") {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      headers: jsonHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const license = await issueSupporterToken();

    // Idempotent mint: `license is null` means a retry after success is a
    // clean no-op — the first-minted license stays untouched.
    const { data: updated, error: updateError } = await supabase
      .from("supporter_checkouts")
      .update({
        status: "paid",
        payment_id: payment.id,
        license,
        paid_at: new Date().toISOString(),
      })
      .eq("provider_order_id", payment.order_id)
      .is("license", null)
      .select("checkout_id")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      // Either already licensed (retry) or an order that isn't ours.
      const { data: existing } = await supabase
        .from("supporter_checkouts")
        .select("checkout_id")
        .eq("provider_order_id", payment.order_id)
        .maybeSingle();
      if (!existing) {
        console.warn(
          "[SquareWebhook] Payment did not match a QRBuddy checkout:",
          payment.order_id,
        );
      }
    }
  } catch (error) {
    console.error(
      `[SquareWebhook] Failed to process paid order ${payment.order_id}:`,
      error instanceof Error ? error.message : error,
    );
    return new Response(
      JSON.stringify({ error: "Payment processing failed. Retry expected." }),
      { headers: jsonHeaders, status: 500 },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: jsonHeaders,
  });
});

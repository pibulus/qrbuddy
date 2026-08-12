// Edge Function: Create Checkout
// Mints a checkout id, creates a Square payment link for the Supporter Pass,
// records the pending row, and hands the browser the checkout URL.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  createSquareCheckout,
  isSquareCheckoutConfigured,
} from "../_shared/square.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  const jsonHeaders = {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
  };

  try {
    // Payments are deliberate acts — 5 checkout starts per 15 minutes is
    // plenty for a human and boring for a bot.
    const rateLimitResult = checkRateLimit(getClientIP(req), {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    if (!isSquareCheckoutConfigured()) {
      return new Response(
        JSON.stringify({ error: "Payments are not configured yet" }),
        { headers: jsonHeaders, status: 503 },
      );
    }

    const checkoutId = crypto.randomUUID();
    const appUrl = Deno.env.get("APP_URL") ?? "https://qrbuddy.app";
    const checkout = await createSquareCheckout({
      checkoutId,
      redirectUrl: `${appUrl}/?checkout=${checkoutId}`,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { error: insertError } = await supabase
      .from("supporter_checkouts")
      .insert({
        checkout_id: checkoutId,
        provider_order_id: checkout.providerOrderId,
        amount: checkout.amount,
        currency: checkout.currency,
      });
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        checkout_id: checkoutId,
        checkout_url: checkout.checkoutUrl,
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Create checkout failed:", error);
    return new Response(
      JSON.stringify({ error: "Could not start checkout. Please try again." }),
      { headers: jsonHeaders, status: 500 },
    );
  }
});

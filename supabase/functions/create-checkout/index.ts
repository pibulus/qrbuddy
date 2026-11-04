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
import { getAuthenticatedUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  const jsonHeaders = {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ available: isSquareCheckoutConfigured() }),
      {
        headers: jsonHeaders,
      },
    );
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Use POST to start checkout" }),
      {
        status: 405,
        headers: { ...jsonHeaders, Allow: "GET, POST, OPTIONS" },
      },
    );
  }

  try {
    // Payments are deliberate acts — 5 checkout starts per 15 minutes is
    // plenty for a human and boring for a bot.
    const rateLimitResult = await checkRateLimit(getClientIP(req), {
      scope: "create-checkout",
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

    const { user } = await getAuthenticatedUser(req, supabase);
    // A Passport UUID is the identity the library and API keys use, so it must
    // be carried through checkout too. Excluding it meant Passport buyers paid
    // but never received the library entitlement.
    const verifiedAuthUserId = user?.id ?? null;

    const { error: insertError } = await supabase
      .from("supporter_checkouts")
      .insert({
        checkout_id: checkoutId,
        provider_order_id: checkout.providerOrderId,
        amount: checkout.amount,
        currency: checkout.currency,
        user_id: verifiedAuthUserId,
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

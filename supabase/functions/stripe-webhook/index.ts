import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.8.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Generate Pro access token
      const proToken = crypto.randomUUID();
      const customerEmail = session.customer_email || session.customer_details?.email;

      // Store in database
      const { error } = await supabase
        .from("pro_subscriptions")
        .insert({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          email: customerEmail,
          pro_token: proToken,
          status: "active",
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        });

      if (error) {
        console.error("Database error:", error);
        return new Response("Database error", { status: 500 });
      }

      console.log(`✅ Pro subscription created for ${customerEmail}`);
    }

    // Handle subscription.deleted (cancellation)
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from("pro_subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Database error:", error);
      }

      console.log(`❌ Subscription cancelled: ${subscription.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

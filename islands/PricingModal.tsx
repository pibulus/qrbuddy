import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { PRICING_TIERS, PRICING_ANNUAL_DISCOUNT } from "../types/pricing.ts";

// Global signal for modal state
export const pricingModalOpen = signal(false);
const billingPeriod = signal<"monthly" | "annual">("monthly");

export function openPricingModal() {
  pricingModalOpen.value = true;
}

export function closePricingModal() {
  pricingModalOpen.value = false;
}

export function PricingModal() {
  const isOpen = pricingModalOpen.value;
  const isAnnual = billingPeriod.value === "annual";

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closePricingModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    // Track conversion intent
    if ((window as any).posthog) {
      (window as any).posthog.capture("upgrade_clicked", {
        plan: "pro",
        billing: billingPeriod.value,
      });
    }

    // Get Stripe price ID from env (injected by server)
    const stripePriceId = isAnnual
      ? (window as any).__STRIPE_PRICE_ID_PRO_ANNUAL__
      : (window as any).__STRIPE_PRICE_ID_PRO__;

    if (!stripePriceId) {
      alert("Stripe is not configured yet. Check back soon!");
      return;
    }

    // Redirect to Stripe Checkout
    const supabaseUrl = (window as any).__SUPABASE_URL__;
    const checkoutUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

    try {
      const response = await fetch(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: stripePriceId,
          successUrl: `${window.location.origin}/?upgrade=success`,
          cancelUrl: `${window.location.origin}/?upgrade=cancelled`,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again!");
    }
  };

  const proPrice = isAnnual
    ? PRICING_TIERS.pro.price * 12 * (1 - PRICING_ANNUAL_DISCOUNT)
    : PRICING_TIERS.pro.price;

  const proPriceDisplay = isAnnual ? `$${proPrice.toFixed(0)}/year` : `$${proPrice}/mo`;
  const savingsText = isAnnual ? "Save 20%" : "";

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);"
        onClick={closePricingModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-5xl animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h2
                  id="pricing-modal-title"
                  class="text-3xl font-black text-black"
                >
                  Choose Your Plan
                </h2>
                <p class="text-sm text-purple-900 mt-1">
                  Start free. Upgrade when you need analytics and advanced features.
                </p>
              </div>
              <button
                type="button"
                onClick={closePricingModal}
                class="text-3xl leading-none font-bold text-black transition-transform hover:scale-110"
                aria-label="Close pricing dialog"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="p-8 bg-qr-cream border-4 border-black rounded-b-3xl shadow-chunky space-y-6">
            {/* Billing Toggle */}
            <div class="flex justify-center items-center gap-3 mb-6">
              <span class={`font-bold ${!isAnnual ? "text-black" : "text-gray-400"}`}>
                Monthly
              </span>
              <button
                type="button"
                onClick={() =>
                  billingPeriod.value = billingPeriod.value === "monthly" ? "annual" : "monthly"}
                class={`relative w-14 h-8 rounded-full border-3 border-black transition-colors ${
                  isAnnual ? "bg-green-400" : "bg-gray-300"
                }`}
                aria-label="Toggle billing period"
              >
                <div
                  class={`absolute top-0.5 left-0.5 w-6 h-6 bg-black rounded-full transition-transform ${
                    isAnnual ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span class={`font-bold ${isAnnual ? "text-black" : "text-gray-400"}`}>
                Annual
                {isAnnual && (
                  <span class="ml-2 text-xs bg-green-200 text-green-900 px-2 py-0.5 rounded-full border-2 border-green-400">
                    Save 20%
                  </span>
                )}
              </span>
            </div>

            {/* Pricing Cards */}
            <div class="grid md:grid-cols-2 gap-6">
              {/* Free Tier */}
              <div class="bg-white border-4 border-black rounded-2xl p-6 shadow-chunky">
                <div class="text-center mb-4">
                  <h3 class="text-2xl font-black text-black">Free</h3>
                  <div class="text-4xl font-black text-black mt-2">$0</div>
                  <p class="text-sm text-gray-600 mt-1">Forever free</p>
                </div>

                <ul class="space-y-2 text-sm">
                  {PRICING_TIERS.free.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-green-600 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div class="mt-4 pt-4 border-t-2 border-gray-200">
                  <p class="text-xs text-gray-500 font-bold mb-2">Limitations:</p>
                  <ul class="space-y-1 text-xs text-gray-500">
                    {PRICING_TIERS.free.limitations?.map((limit) => (
                      <li key={limit} class="flex items-start gap-2">
                        <span>•</span>
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled
                  class="w-full mt-6 px-4 py-3 bg-gray-200 text-gray-600 border-3 border-black rounded-xl font-bold cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>

              {/* Pro Tier */}
              <div class="bg-gradient-to-br from-pink-100 to-purple-100 border-4 border-black rounded-2xl p-6 shadow-chunky relative">
                <div class="absolute -top-3 -right-3 bg-yellow-300 text-black text-xs font-black px-3 py-1 border-3 border-black rounded-full rotate-12 shadow-chunky">
                  BEST VALUE
                </div>

                <div class="text-center mb-4">
                  <h3 class="text-2xl font-black text-black">Pro</h3>
                  <div class="text-4xl font-black text-black mt-2">
                    {proPriceDisplay}
                  </div>
                  {isAnnual && (
                    <p class="text-sm text-gray-600 mt-1">
                      <span class="line-through">${PRICING_TIERS.pro.price * 12}/year</span>
                      {" "}
                      <span class="text-green-600 font-bold">{savingsText}</span>
                    </p>
                  )}
                </div>

                <ul class="space-y-2 text-sm">
                  {PRICING_TIERS.pro.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-purple-600 font-bold">✓</span>
                      <span class={feature.startsWith("Everything") ? "font-bold" : ""}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleUpgrade}
                  class="w-full mt-6 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95"
                >
                  Upgrade to Pro →
                </button>

                <p class="text-xs text-center text-gray-600 mt-3">
                  Cancel anytime. No questions asked.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div class="mt-8 pt-6 border-t-3 border-black">
              <h4 class="font-black text-lg mb-3">FAQ</h4>
              <div class="space-y-2 text-sm">
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Can I upgrade/downgrade anytime?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    Yep! Upgrade or cancel anytime. No contracts, no commitments.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    What payment methods do you accept?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    All major credit cards via Stripe. Safe and secure.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Do my existing QR codes keep working if I cancel?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    Yes! All your QR codes continue working. You just lose access to analytics
                    and Pro features.
                  </p>
                </details>
              </div>
            </div>
          </div>

          {/* ESC hint */}
          <div class="text-center mt-4">
            <p class="text-xs text-gray-400">
              Press ESC or click outside to close
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes modal-in {
            0% {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .animate-modal-in {
            animation: modal-in 0.3s ease-out forwards;
          }
        `}
      </style>
    </>
  );
}

// Pricing Link Button
interface PricingLinkProps {
  label?: string;
  className?: string;
}

export function PricingLink({
  label = "Upgrade to Pro ✨",
  className = "",
}: PricingLinkProps) {
  return (
    <button
      type="button"
      onClick={openPricingModal}
      class={`px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";

type PostHogClient = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

type PricingGlobal = typeof globalThis & {
  posthog?: PostHogClient;
  __PAYMENT_URL_PRO__?: string;
};

const getPricingGlobal = (): PricingGlobal => globalThis as PricingGlobal;

// Global signal for modal state
export const pricingModalOpen = signal(false);

export function openPricingModal() {
  pricingModalOpen.value = true;
}

export function closePricingModal() {
  pricingModalOpen.value = false;
}

export function PricingModal() {
  const isOpen = pricingModalOpen.value;

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

  const _handleUpgrade = () => {
    // Track conversion intent
    const globalScope = getPricingGlobal();

    if (globalScope.posthog) {
      globalScope.posthog.capture("upgrade_clicked", {
        plan: "pro",
        billing: "lifetime",
      });
    }

    // Get payment URL from env (injected by server)
    // This can be Lemon Squeezy, Ko-fi, Gumroad, or any payment link
    const paymentUrl = globalScope.__PAYMENT_URL_PRO__;

    if (!paymentUrl) {
      addToast(
        "✨ Pro tier coming soon! Email pablo@qrbuddy.app for early access.",
        4000,
      );
      return;
    }

    // Redirect to payment page (Lemon Squeezy, Ko-fi, etc.)
    globalScope.location.href = paymentUrl;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={closePricingModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-md sm:max-w-2xl lg:max-w-5xl max-h-[90vh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-4 sm:p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2
                  id="pricing-modal-title"
                  class="text-2xl sm:text-3xl font-black text-black"
                >
                  Choose Your Plan
                </h2>
                <p class="text-xs sm:text-sm text-purple-900 mt-1">
                  Start free. Upgrade for power tools and zero branding.
                </p>
              </div>
              <button
                type="button"
                onClick={closePricingModal}
                class="text-3xl leading-none font-bold text-black transition-transform hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Close pricing dialog"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="p-4 sm:p-8 bg-qr-cream border-4 border-black rounded-b-3xl shadow-chunky space-y-6">
            {/* Pricing Cards */}
            <div class="grid md:grid-cols-2 gap-6 items-stretch">
              {/* Free Tier */}
              <div class="bg-white border-4 border-black rounded-2xl p-6 shadow-chunky flex flex-col h-full">
                <div class="text-center mb-4">
                  <h3 class="text-2xl font-black text-black">Free</h3>
                  <div class="text-4xl font-black text-black mt-2">$0</div>
                  <p class="text-sm text-gray-600 mt-1">Forever free</p>
                </div>

                <ul class="space-y-3 text-sm flex-grow">
                  {PRICING_TIERS.free.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled
                  class="w-full mt-8 px-4 py-3 bg-gray-200 text-gray-600 border-3 border-black rounded-xl font-bold cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>

              {/* Pro Tier */}
              <div class="bg-gradient-to-br from-pink-100 to-purple-100 border-4 border-black rounded-2xl p-6 shadow-chunky relative flex flex-col h-full">
                <div class="absolute -top-3 -right-3 bg-yellow-300 text-black text-xs font-black px-3 py-1 border-3 border-black rounded-full rotate-12 shadow-chunky">
                  PAY ONCE, OWN FOREVER
                </div>

                <div class="text-center mb-4">
                  <h3 class="text-2xl font-black text-black">Pro</h3>
                  <div class="text-4xl font-black text-black mt-2">
                    ${PRICING_TIERS.pro.price}
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    One-time payment, lifetime access
                  </p>
                </div>

                <ul class="space-y-3 text-sm flex-grow">
                  {PRICING_TIERS.pro.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-purple-600 font-bold flex-shrink-0">✓</span>
                      <span
                        class={feature.startsWith("Everything") ||
                            feature.includes("Lifetime")
                          ? "font-bold"
                          : ""}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                  
                  {PRICING_TIERS.pro.upcomingFeatures && (
                    <>
                      <li class="pt-2 pb-1">
                        <span class="text-xs font-bold text-purple-800 uppercase tracking-wide">Coming Soon:</span>
                      </li>
                      {PRICING_TIERS.pro.upcomingFeatures.map((feature) => (
                        <li key={feature} class="flex items-start gap-2">
                          <span class="text-purple-400 flex-shrink-0">✨</span>
                          <span class="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>

                <button
                  type="button"
                  disabled
                  class="w-full mt-8 px-4 py-3 bg-gray-300 text-gray-500 border-3 border-gray-400 rounded-xl font-bold shadow-none cursor-not-allowed"
                >
                  Pro Tier Coming Soon ✨
                </button>

                <p class="text-xs text-center text-gray-600 mt-3">
                  No subscriptions. No recurring fees. Own it forever.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div class="mt-8 pt-6 border-t-3 border-black">
              <div class="space-y-2 text-sm">
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Why one-time payment instead of subscription?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    No recurring anxiety. Pay once, own it forever. We believe
                    in fair, transparent pricing - not rent-seeking.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    What payment methods do you accept?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    All major credit cards via our payment processor. Safe and
                    secure.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Do I get future Pro features included?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    Yep! Any new Pro features we add are yours too. One payment,
                    lifetime updates.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Can I get a refund?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    Absolutely. 30-day no-questions-asked refund policy. Email
                    pablo@qrbuddy.app
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
    </>
  );
}

// Pricing Link Button
interface PricingLinkProps {
  label?: string;
  className?: string;
}

export function PricingLink({
  label = "Pro",
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

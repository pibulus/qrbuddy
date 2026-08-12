import { signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import { useModalShell } from "./modal/useModalShell.ts";
import { getApiUrl } from "../utils/api.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
import {
  clearPendingCheckout,
  getPendingCheckout,
  getSupporterPass,
  setPendingCheckout,
  setSupporterPass,
  supporterPassExpiry,
} from "../utils/supporter-pass.ts";

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

function trackUmami(event: string, data?: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  const win = globalThis as any;
  if (win.umami) win.umami.track(event, data);
}

function stripCheckoutParam() {
  const url = new URL(globalThis.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  history.replaceState(null, "", url.toString());
}

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
  const shell = useModalShell({ open: isOpen, onClose: closePricingModal });
  const [hasPass, setHasPass] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [pastedPass, setPastedPass] = useState("");

  // Claim poller: back from Square (?checkout=) or a pending checkout in
  // storage → poll get-license until the webhook lands, then store the pass.
  useEffect(() => {
    setHasPass(getSupporterPass() !== null);

    const fromUrl = new URL(globalThis.location.href).searchParams.get(
      "checkout",
    );
    const checkoutId = fromUrl || getPendingCheckout();
    if (!checkoutId || getSupporterPass()) {
      if (fromUrl) stripCheckoutParam();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const data = await apiRequest<
          { status: string; license: string | null }
        >(
          `${getApiUrl()}/get-license`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkout_id: checkoutId }),
          },
          "Could not check the pass",
        );
        if (data.license && setSupporterPass(data.license)) {
          setHasPass(true);
          clearPendingCheckout();
          stripCheckoutParam();
          addToast("Supporter pass active 💜 Thank you!", 5000);
          trackUmami("upgrade_completed", { plan: "pro", billing: "year" });
          return;
        }
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          // Not a real checkout — stop chasing it.
          clearPendingCheckout();
          stripCheckoutParam();
          return;
        }
        // Network hiccup: fall through and retry.
      }
      if (attempts < 12) {
        setTimeout(poll, 2500);
      } else if (fromUrl) {
        addToast(
          "Payment still processing — reopen this page in a minute",
          5000,
        );
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!shell.mounted) return null;

  const handleUpgrade = async () => {
    trackUmami("upgrade_clicked", { plan: "pro", billing: "year" });
    setIsStartingCheckout(true);
    try {
      const data = await apiRequest<
        { checkout_id: string; checkout_url: string }
      >(
        `${getApiUrl()}/create-checkout`,
        { method: "POST" },
        "Could not start checkout",
      );
      setPendingCheckout(data.checkout_id);
      globalThis.location.href = data.checkout_url;
    } catch (error) {
      setIsStartingCheckout(false);
      if (error instanceof ApiError && error.statusCode === 503) {
        addToast(
          "✨ Passes open very soon! Email pablo@qrbuddy.app for early access.",
          4000,
        );
      } else {
        addToast("Couldn't start checkout — try again", 3500);
      }
    }
  };

  const handlePastePass = () => {
    if (setSupporterPass(pastedPass)) {
      setHasPass(true);
      setPastedPass("");
      addToast("Pass restored 💜", 4000);
    } else {
      addToast("That doesn't look like a supporter pass", 3500);
    }
  };

  const handleCopyPass = async () => {
    const pass = getSupporterPass();
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      addToast("Pass copied — keep it somewhere safe 📋");
    } catch {
      addToast("Couldn't reach the clipboard", 3000);
    }
  };

  const expiry = hasPass ? supporterPassExpiry() : null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={shell.backdropRef}
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-qr-scrim/60 backdrop-blur-sm animate-fade-in"
        role="presentation"
        onClick={shell.onBackdropClick}
      >
        {/* Modal */}
        <div
          ref={shell.dialogRef}
          class="relative w-full max-w-md sm:max-w-2xl lg:max-w-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          tabindex={-1}
        >
          {/* Header */}
          <div class="p-4 sm:p-6 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 border-4 border-black border-b-0 rounded-t-3xl">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2
                  id="pricing-modal-title"
                  class="text-2xl sm:text-3xl font-black text-black"
                >
                  Support
                </h2>
                <p class="text-xs sm:text-sm text-purple-900 mt-1">
                  Free forever. The pass lifts the limits and funds more tools
                  like this.
                </p>
              </div>
              <button
                type="button"
                onClick={shell.requestClose}
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
                  <p class="text-sm text-gray-600 mt-1">
                    Make QRs. Keep your data. No strings.
                  </p>
                </div>

                <ul class="space-y-3 text-sm flex-grow">
                  {PRICING_TIERS.free.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-green-600 font-bold flex-shrink-0">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Supporter Tier */}
              <div class="bg-gradient-to-br from-pink-100 to-purple-100 border-4 border-black rounded-2xl p-6 shadow-chunky relative flex flex-col h-full">
                {hasPass && (
                  <div class="absolute -top-3 -right-3 bg-green-300 text-black text-xs font-black px-3 py-1 border-3 border-black rounded-full rotate-12 shadow-chunky">
                    Active 💜
                  </div>
                )}

                <div class="text-center mb-4">
                  <h3 class="text-2xl font-black text-black">Supporter</h3>
                  <div class="text-4xl font-black text-black mt-2">
                    ${PRICING_TIERS.pro.price}
                    <span class="text-lg font-bold text-gray-600">/year</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    A year, paid up front. That's it.
                  </p>
                </div>

                <ul class="space-y-3 text-sm flex-grow">
                  {PRICING_TIERS.pro.features.map((feature) => (
                    <li key={feature} class="flex items-start gap-2">
                      <span class="text-purple-600 font-bold flex-shrink-0">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {hasPass
                  ? (
                    <div class="mt-8 space-y-2">
                      <div class="w-full px-4 py-3 border-3 border-black rounded-xl font-bold text-center bg-green-100 text-green-900">
                        ✓ Pass active{expiry
                          ? ` until ${
                            expiry.toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          }`
                          : ""}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPass}
                        class="w-full min-h-[44px] px-4 py-2 border-3 border-black rounded-xl font-bold bg-white text-gray-900 shadow-chunky hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm"
                      >
                        Copy my pass
                      </button>
                    </div>
                  )
                  : (
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={isStartingCheckout}
                      class="w-full mt-8 px-4 py-3 border-3 rounded-xl font-bold shadow-chunky transition-all bg-purple-600 text-white border-black hover:bg-purple-700 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                    >
                      {isStartingCheckout
                        ? "Opening checkout..."
                        : "Support 💜"}
                    </button>
                  )}

                <p class="text-xs text-center text-gray-600 mt-3">
                  One payment. No auto-renew, no card on file.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div class="mt-8 pt-6 border-t-3 border-black">
              <div class="space-y-2 text-sm">
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Is this a subscription?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    No. You pay $24, you get a year, and nothing ever charges
                    you again. If you still love it next year, that's your call
                    — next year.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    What payment methods?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    All major cards, through Square checkout.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Already have a pass?
                  </summary>
                  <div class="mt-2 ml-4 flex gap-2">
                    <input
                      type="text"
                      value={pastedPass}
                      onInput={(e) =>
                        setPastedPass((e.target as HTMLInputElement).value)}
                      placeholder="Paste your supporter pass"
                      class="flex-1 min-w-0 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-mono focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePastePass}
                      disabled={pastedPass.trim() === ""}
                      class="min-h-[44px] px-4 py-2 bg-black text-white rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Do I get future features?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    Yep. Anything we add while your year is running is yours.
                  </p>
                </details>
                <details class="group">
                  <summary class="font-bold cursor-pointer hover:text-purple-600">
                    Refunds?
                  </summary>
                  <p class="mt-1 text-gray-700 ml-4">
                    30-day no-questions-asked. Email pablo@qrbuddy.app
                  </p>
                </details>
              </div>
            </div>
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
  label = "Support",
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

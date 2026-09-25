import { signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { PRICING_TIERS } from "../types/pricing.ts";
import { addToast } from "./ToastManager.tsx";
import {
  CardModal,
  CardPrimaryButton,
  CardSecondaryButton,
} from "./modal/CardModal.tsx";
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
  // "Everything in Free, forever" is implied by the single-tier card.
  const perks = PRICING_TIERS.pro.features.filter((f) =>
    !f.startsWith("Everything in Free")
  );

  return (
    <CardModal
      open={isOpen}
      onClose={closePricingModal}
      labelledby="pricing-modal-title"
      badge={hasPass ? "💜" : "✨"}
      badgeClass="from-pink-300 via-qr-pop to-purple-500"
    >
      <div class="text-center space-y-5">
        <div class="space-y-1.5">
          <h2
            id="pricing-modal-title"
            class="font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
          >
            {hasPass ? "You're a Supporter." : "Unlock QRBuddy Supporter."}
          </h2>
          <p class="text-base font-bold text-qr-pop">
            {hasPass
              ? "Thank you. The limits are off."
              : "One pass lifts the limits. Funds honest tools."}
          </p>
        </div>

        <ul class="text-left space-y-2 text-base font-medium text-gray-800">
          {perks.map((perk) => (
            <li key={perk} class="flex items-start gap-3">
              <span
                class="mt-2 w-2 h-2 shrink-0 rounded-full bg-qr-pop"
                aria-hidden="true"
              />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {hasPass
          ? (
            <div class="space-y-2">
              <div class="w-full min-h-[52px] flex items-center justify-center rounded-full border-3 border-black bg-green-100 text-green-900 font-black text-base">
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
              <div class="flex gap-2">
                <CardSecondaryButton onClick={handleCopyPass}>
                  Copy my pass
                </CardSecondaryButton>
              </div>
            </div>
          )
          : (
            <div class="space-y-2">
              <CardPrimaryButton
                onClick={handleUpgrade}
                disabled={isStartingCheckout}
              >
                {isStartingCheckout
                  ? "Opening checkout…"
                  : `Get Supporter Pass — $${PRICING_TIERS.pro.price}/yr`}
              </CardPrimaryButton>
              <p class="text-xs text-gray-500 font-medium">
                One payment. Lasts a year. No card on file, no auto-renew.
              </p>
            </div>
          )}

        {/* FAQ tucked under one toggle — the card stays a manifesto */}
        <details class="group text-left pt-2 border-t-2 border-black/10">
          <summary class="cursor-pointer list-none min-h-[44px] flex items-center justify-center gap-1 text-sm font-bold text-gray-600 hover:text-black transition-colors">
            Questions, or have a pass already?
            <span class="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div class="space-y-3 text-sm pt-1">
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                Is this a subscription?
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                No. You pay ${PRICING_TIERS.pro.price}, you get a year, and
                nothing ever charges you again. If you still love it next year,
                that's your call — next year.
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                What payment methods?
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                All major cards, through Square checkout.
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                Do I get future features?
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                Yep. Anything QRBuddy adds while your year is running is yours.
              </p>
            </details>
            <details>
              <summary class="font-bold cursor-pointer hover:text-qr-pop">
                Refunds?
              </summary>
              <p class="mt-1 text-gray-700 ml-4">
                30-day no-questions-asked. Email pablo@qrbuddy.app
              </p>
            </details>
            {!hasPass && (
              <details>
                <summary class="font-bold cursor-pointer hover:text-qr-pop">
                  Already have a pass?
                </summary>
                <div class="mt-2 ml-4 flex gap-2">
                  <input
                    type="text"
                    value={pastedPass}
                    onInput={(e) =>
                      setPastedPass((e.target as HTMLInputElement).value)}
                    placeholder="Paste your supporter pass"
                    class="flex-1 min-w-0 px-3 py-2 border-2 border-black rounded-full text-sm font-mono bg-white focus:border-qr-pop focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handlePastePass}
                    disabled={pastedPass.trim() === ""}
                    class="min-h-[44px] px-4 bg-black text-white rounded-full font-bold text-sm border-2 border-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              </details>
            )}
          </div>
        </details>
      </div>
    </CardModal>
  );
}

// Pricing Link Button
interface PricingLinkProps {
  label?: string;
  className?: string;
}

export function PricingLink({
  label = "Supporter ✨",
  className = "",
}: PricingLinkProps) {
  return (
    <button
      type="button"
      onClick={openPricingModal}
      class={`inline-flex items-center justify-center px-4 min-h-[44px] rounded-full border-2 border-black bg-qr-pop text-white text-sm font-bold shadow-chunky transition-all hover:scale-105 hover:bg-qr-popDeep active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

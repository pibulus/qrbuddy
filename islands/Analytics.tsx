import { useEffect } from "preact/hooks";
import { Signal } from "@preact/signals";

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

interface AnalyticsProps {
  url: Signal<string>;
  style: Signal<string>;
  isDynamic: Signal<boolean>;
  isDestructible: Signal<boolean>;
  logoUrl: Signal<string>;
}

export default function Analytics({
  url,
  style,
  isDynamic,
  isDestructible,
  logoUrl,
}: AnalyticsProps) {
  // Track QR generation
  useEffect(() => {
    if (!url.value) return;

    // Debounce slightly to avoid tracking every keystroke if they type fast
    const timeoutId = setTimeout(() => {
      // deno-lint-ignore no-explicit-any
      const win = globalThis as any;
      if (win.umami) {
        // Determine QR type
        let qrType = "url";
        if (url.value.startsWith("WIFI:")) qrType = "wifi";
        else if (url.value.startsWith("BEGIN:VCARD")) qrType = "vcard";
        else if (url.value.startsWith("SMSTO:")) qrType = "sms";
        else if (url.value.startsWith("mailto:")) qrType = "email";
        else if (url.value.startsWith("http")) qrType = "url";
        else qrType = "text";

        win.umami.track("qr_generated", {
          style: style.value,
          type: qrType,
          has_logo: !!logoUrl.value,
          is_dynamic: isDynamic.value,
          is_destructible: isDestructible.value,
        });
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [url.value]);

  // Track conversion events (upgrade success/cancel)
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const upgradeStatus = urlParams.get("upgrade");

    // deno-lint-ignore no-explicit-any
    const win = globalThis as any;

    if (upgradeStatus && win.umami) {
      if (upgradeStatus === "success") {
        win.umami.track("upgrade_completed", {
          plan: "pro",
        });

        // Clean URL
        globalThis.history.replaceState(
          {},
          "",
          globalThis.location.pathname,
        );
      } else if (upgradeStatus === "cancelled") {
        win.umami.track("upgrade_cancelled", {
          plan: "pro",
        });

        // Clean URL
        globalThis.history.replaceState(
          {},
          "",
          globalThis.location.pathname,
        );
      }
    }
  }, []);

  return null;
}

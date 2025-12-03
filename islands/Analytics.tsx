import { useEffect } from "preact/hooks";
import { Signal } from "@preact/signals";

type PostHogClient = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

type AnalyticsGlobal = typeof globalThis & {
  posthog?: PostHogClient;
  __PAYMENT_URL_PRO__?: string;
  doNotTrack?: string;
};

const getAnalyticsGlobal = (): AnalyticsGlobal => globalThis as AnalyticsGlobal;

interface AnalyticsProps {
  posthogKey: string | undefined;
  url: Signal<string>;
  style: Signal<string>;
  isDynamic: Signal<boolean>;
  isDestructible: Signal<boolean>;
  logoUrl: Signal<string>;
}

export default function Analytics({
  posthogKey,
  url,
  style,
  isDynamic,
  isDestructible,
  logoUrl,
}: AnalyticsProps) {
  useEffect(() => {
    // Skip if no PostHog key configured
    if (!posthogKey) {
      return;
    }

    // Check if Do Not Track is enabled
    const globalScope = getAnalyticsGlobal();
    const navigatorWithMsDnt = navigator as Navigator & {
      msDoNotTrack?: string;
    };
    const dnt = navigator.doNotTrack || globalScope.doNotTrack ||
      navigatorWithMsDnt.msDoNotTrack;
    if (dnt === "1" || dnt === "yes") {
      return;
    }

    // Extract UTM parameters and referrer for campaign tracking
    const urlParams = new URLSearchParams(globalScope.location?.search ?? "");
    const utmSource = urlParams.get("utm_source");
    const utmMedium = urlParams.get("utm_medium");
    const utmCampaign = urlParams.get("utm_campaign");
    const referrer = document.referrer;

    // Load PostHog script
    const script = document.createElement("script");
    script.innerHTML = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('${posthogKey}', {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_persistence: false,
        respect_dnt: true,
        person_profiles: 'never',
        ip: false,
        loaded: function(ph) {

          // Track pageview with campaign data
          const pageviewProps = {
            referrer: '${referrer}' || 'direct'
          };

          if ('${utmSource}') pageviewProps.utm_source = '${utmSource}';
          if ('${utmMedium}') pageviewProps.utm_medium = '${utmMedium}';
          if ('${utmCampaign}') pageviewProps.utm_campaign = '${utmCampaign}';

          ph.capture('pageview', pageviewProps);
        }
      });
    `;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [posthogKey]);

  // Track QR generation with minimal, non-identifying data
  useEffect(() => {
    const globalScope = getAnalyticsGlobal();
    if (!url.value || !globalScope.posthog) return;

    const ph = globalScope.posthog;
    if (!ph || typeof ph.capture !== "function") return;

    // Determine QR type without revealing actual content
    let qrType = "url";
    if (url.value.startsWith("WIFI:")) qrType = "wifi";
    else if (url.value.startsWith("BEGIN:VCARD")) qrType = "vcard";
    else if (url.value.startsWith("SMSTO:")) qrType = "sms";
    else if (url.value.startsWith("mailto:")) qrType = "email";
    else if (url.value.startsWith("http")) qrType = "url";
    else qrType = "text";

    // Track with zero personal data
    ph.capture("qr_generated", {
      style: style.value,
      type: qrType,
      has_logo: !!logoUrl.value,
      is_dynamic: isDynamic.value,
      is_destructible: isDestructible.value,
    });
  }, [url.value]);

  // Track conversion events (upgrade success/cancel)
  useEffect(() => {
    const globalScope = getAnalyticsGlobal();
    const urlParams = new URLSearchParams(globalScope.location?.search ?? "");
    const upgradeStatus = urlParams.get("upgrade");

    if (upgradeStatus && globalScope.posthog) {
      const ph = globalScope.posthog;

      if (upgradeStatus === "success") {
        ph.capture("upgrade_completed", {
          plan: "pro",
        });

        // Clean URL
        globalScope.history?.replaceState(
          {},
          "",
          globalScope.location?.pathname ?? "/",
        );
      } else if (upgradeStatus === "cancelled") {
        ph.capture("upgrade_cancelled", {
          plan: "pro",
        });

        // Clean URL
        globalScope.history?.replaceState(
          {},
          "",
          globalScope.location?.pathname ?? "/",
        );
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

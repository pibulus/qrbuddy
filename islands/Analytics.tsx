import { useEffect } from "preact/hooks";
import { Signal } from "@preact/signals";

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
      console.log("📊 PostHog not configured (set POSTHOG_KEY env var)");
      return;
    }

    // Check if Do Not Track is enabled
    const dnt = navigator.doNotTrack || (window as any).doNotTrack ||
      (navigator as any).msDoNotTrack;
    if (dnt === "1" || dnt === "yes") {
      console.log("🔒 PostHog disabled: respecting Do Not Track");
      return;
    }

    // Load PostHog script
    const script = document.createElement("script");
    script.innerHTML = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('${posthogKey}', {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_persistence: false,
        respect_dnt: true,
        person_profiles: 'never',
        ip: false,
        loaded: function(ph) {
          console.log('📊 PostHog loaded (privacy-first mode)');
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
    if (!url.value || !(window as any).posthog) return;

    const ph = (window as any).posthog;
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

  return null; // This component doesn't render anything
}

import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../components/VerticalLandingHead.tsx";
import { getSupabaseUrl } from "../../utils/api.ts";

interface PageData {
  supabaseUrl?: string;
}

export const handler: Handlers<PageData> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

const VALUE_CARDS: ValueCard[] = [
  {
    icon: "🛡️",
    title: "Zero-Auto-Open Airlock",
    desc:
      "Native phone cameras often follow redirects on a single tap. The Airlock decodes the raw payload in browser memory first so nothing opens uninvited.",
  },
  {
    icon: "🕵️",
    title: "Unmasks Hidden Shortlinks",
    desc:
      "When a sticker hides behind bit.ly, t.co, tinyurl, or qr.ae, the server-side Peek resolver traces up to 5 redirect hops and reveals the true final domain.",
  },
  {
    icon: "📶",
    title: "Parses Wi-Fi, vCard & SMS Payloads",
    desc:
      "Inspects structured QR payloads cleanly — displaying Wi-Fi network names, security types, contact cards, or pre-filled SMS commands before any device action.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Zero-Auto-Open Quarantine",
    free: "Included — decodes inside a visual buffer before any tab opens ($0)",
    supporter: "Included",
  },
  {
    feature: "Shortlink Redirect Unmasking",
    free: "Follows up to 5 hops (bit.ly, tinyurl, qr.ae, rebrand.ly, etc.)",
    supporter: "Included",
  },
  {
    feature: "Camera & Screenshot Decoding",
    free:
      "100% client-side image & webcam decoding; photos never leave the device",
    supporter: "Included",
  },
  {
    feature: "Structured Payload Inspector",
    free: "Reveals raw Wi-Fi, vCard, mailto, tel, and GS1 Digital Link strings",
    supporter: "Included",
  },
  {
    feature: "QRBuddy Passport",
    free: "No purchase required for scanning or link inspection",
    supporter:
      "~$32 USD (A$49) once for 365 days of 100 editable links & 500 MB drops",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What is 'quishing' (QR phishing) and how does the Airlock stop it?",
    a: "Quishing is when a malicious sticker is pasted over a legitimate parking meter, café menu, or poster QR code, often hiding behind a URL shortener. The QRBuddy Airlock decodes the raw text locally and traces shortener redirects on the server without executing scripts or loading the destination page in the browser.",
  },
  {
    q: "Are uploaded screenshots or camera frames sent to a server?",
    a: "Never. Both camera frames and uploaded screenshots are decoded 100% locally in browser memory using client-side JavaScript. Only when a decoded URL uses a known shortener domain does the optional Peek resolver query the redirect headers.",
  },
  {
    q: "Can the Inspector unmask shortened URLs like bit.ly or tinyurl?",
    a: "Yes. Whenever the Inspector detects a known shortlink host (such as bit.ly, t.co, tinyurl.com, qr.ae, qrco.de, or shorturl.at) — or when any URL is pasted into the Unmask bar — QRBuddy traces up to 5 HTTP redirect hops and displays the final destination domain clearly.",
  },
  {
    q: "Does the Street-Safe QR Inspector cost anything or require an account?",
    a: "No. The QR Inspector and Shortlink Airlock are 100% free forever with no login, no app store download, and no tracking.",
  },
];

export default function InspectPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/inspect";
  const title =
    "Free Safe QR Code Scanner & Shortlink Inspector (Anti-Quishing Airlock) | QRBuddy";
  const description =
    "Scan mystery street QR codes or upload a screenshot safely without opening the link. Unmasks bit.ly and tinyurl redirects and reveals raw Wi-Fi or URL payloads in a zero-auto-open browser airlock.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/escanear"
        ogTitle="Street-Safe QR Code Scanner & Redirect Inspector — Zero Auto-Open"
        ogImageAlt="QRBuddy Street-Safe QR Airlock unmasking a mystery QR code"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Street-Safe QR Code Scanner & Link Inspector"
        applicationCategory="SecurityApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Free browser-based QR code scanner, screenshot decoder, and shortlink redirect inspector"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Street-Safe QR Airlock"
        title="Look Inside Any QR Code Before Opening It."
        tagline="Scan a street sticker with the camera, drop a screenshot, or paste a mystery shortlink. The Airlock reveals the true destination while keeping the browser quarantined."
        subtagline="Test the live Shortlink Unmasker or launch the camera & screenshot scanner below — 100% free, no app install."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/?inspect=1"
        defaultCaption="SCAN SAFELY"
        toolPreset="inspect"
        featuresTitle="Built for Parking Meters, Street Posters, Menus & Screenshots"
        faqTitle="Safe QR Scanning & Anti-Quishing Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free Street-Safe Airlock and the QRBuddy Studio"
        comparisonSubtitle="Scanning, screenshot decoding, and shortlink unmasking are 100% free forever"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

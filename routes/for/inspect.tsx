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
    tag: "Nothing Auto-Opens",
    title: "Stop Fake Sticker Scams",
    desc:
      "Fake stickers get pasted over parking meters and café tables. Preview the real website and page title safely before deciding to visit.",
  },
  {
    icon: "🕵️",
    tag: "Up to 5 Hops",
    title: "Unmask Shortened Links",
    desc:
      "Links like bit.ly or tinyurl hide where they actually lead. Unroll the full redirect chain in one click to see the true final domain.",
  },
  {
    icon: "📸",
    tag: "100% On-Device",
    title: "Scan Screenshots Privately",
    desc:
      "Drop a screenshot from a text message, email, or flyer. Images are read right inside the browser and never uploaded to any server.",
  },
  {
    icon: "📶",
    tag: "Plain English",
    title: "Read Wi-Fi & Contact Cards",
    desc:
      "See the exact Wi-Fi network name, password, phone number, or contact card tucked inside a code before connecting.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Mystery Street Stickers",
    free: "Often opens link on first tap",
    supporter: "Previews safely · Never auto-opens",
  },
  {
    feature: "Hidden Shortlinks (bit.ly)",
    free: "Blindly follows redirect",
    supporter: "Unmasks up to 5 redirect hops",
  },
  {
    feature: "Scan from Screenshots",
    free: "Awkward or requires photo upload",
    supporter: "Drop any image · 100% local",
  },
  {
    feature: "Wi-Fi & Contact Details",
    free: "Hides raw password or fields",
    supporter: "Shows plain text & password",
  },
  {
    feature: "Ads & App Store Traps",
    free: "$9.99/wk scanner app subscriptions",
    supporter: "$0 · Free forever in browser",
  },
  {
    feature: "QR Creation Studio",
    free: "Scanner only",
    supporter: "Full Studio + ~$32/yr Pass",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Why is scanning street QR codes with a regular phone camera risky?",
    a: "Scammers sometimes paste fake QR stickers over parking meters, café menus, or EV chargers, hiding a phishing site behind a shortened link. QRBuddy reads the code in a safe preview window first and traces shortened links so the real domain is visible before anything opens.",
  },
  {
    q: "Are uploaded screenshots or camera photos sent to a server?",
    a: "Never. Both camera scans and uploaded screenshots are read 100% locally on the device inside the browser. Only when a link uses a shortener does QRBuddy check where that web address redirects.",
  },
  {
    q: "Can the scanner reveal where bit.ly or tinyurl links actually go?",
    a: "Yes. Whenever a code contains a shortened link (such as bit.ly, t.co, tinyurl.com, qr.ae, qrco.de, or shorturl.at) — or when any link is pasted into the Reveal bar — QRBuddy follows up to 5 redirect steps and shows the real final website.",
  },
  {
    q: "Does the Safe QR Scanner cost anything or require an account?",
    a: "No. Scanning QR codes, reading screenshots, and unmasking shortened links are 100% free forever with no login, no app install, and no ads.",
  },
];

export default function InspectPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/inspect";
  const title =
    "Free Safe QR Code Scanner & Shortlink Checker (Scan From Image or Camera) | QRBuddy";
  const description =
    "See where any QR code goes before opening it. Scan street stickers with the camera, drop a screenshot, or unmask bit.ly and tinyurl links safely in the browser.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/escanear"
        ogTitle="Safe QR Code Scanner & Link Checker — See Where Any QR Goes First"
        ogImageAlt="QRBuddy Safe QR Scanner revealing the real website behind a mystery QR code"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Safe QR Code Scanner & Link Inspector"
        applicationCategory="SecurityApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Free browser-based QR code scanner, screenshot reader, and shortened link checker"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Safe QR Scanner 🛡️"
        title="See Where Any QR Code Goes."
        titleHighlight="Before Opening It."
        tagline="Point the camera at a street sticker, drop a screenshot, or paste a shortened link to see the real website behind it — before anything opens."
        subtagline="Test the live Link Unmasker or launch the camera & screenshot scanner below — 100% free, zero app install."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/?inspect=1"
        defaultCaption="SCAN SAFELY"
        toolPreset="inspect"
        featuresTitle="Built for Parking Meters, Street Posters, Menus & Screenshots"
        faqTitle="Safe QR Scanning Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy Safe Scanner vs. Default Camera Apps"
        comparisonSubtitle="Preview any QR code or shortened link safely in the browser — 100% free forever"
        comparisonColumns={{
          feature: "What Matters",
          col1: "Phone Camera / Scanner Apps",
          col2: "QRBuddy Safe Scanner",
        }}
        qrbuddyFirst
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

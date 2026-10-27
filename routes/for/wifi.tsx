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
    icon: "📶",
    tag: "Zero Typing",
    title: "One Scan Joins the Network",
    desc:
      "iPhone and Android cameras read the Wi-Fi card natively and connect guests in one tap — no more spelling out long router passwords.",
  },
  {
    icon: "🔒",
    tag: "100% On-Device",
    title: "Password Never Leaves the Browser",
    desc:
      "Network names and passwords are baked directly into the QR squares on the device. Credentials are never uploaded to any server.",
  },
  {
    icon: "♾️",
    tag: "$0 Forever",
    title: "Works Offline & Never Expires",
    desc:
      "A Wi-Fi QR card is a direct graphic with zero middleman server. Print it once for a café wall or Airbnb binder and it works for years.",
  },
  {
    icon: "🖼️",
    tag: "Print-Ready",
    title: "Table-Tent & Frame Ready",
    desc:
      "Export a 3000px framed PNG or true Vector SVG with a custom 'JOIN WIFI' caption for acrylic stands, stickers, and welcome books.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Wi-Fi QR Cards",
    free: "Unlimited · Never expires ($0)",
    supporter: "Included",
  },
  {
    feature: "Password Privacy",
    free: "100% local in browser",
    supporter: "Same zero-server privacy",
  },
  {
    feature: "Vector SVG & 3000px PNG",
    free: "Included free with frames",
    supporter: "Included + 50-code batch ZIPs",
  },
  {
    feature: "Editable House Manual / Menu Links",
    free: "5 permanent editable links",
    supporter: "100 editable links + 90-day stats",
  },
  {
    feature: "Welcome Guide PDF / Photo Drops",
    free: "Up to 50 MB file drops",
    supporter: "Up to 500 MB drops + white-label",
  },
  {
    feature: "QRBuddy Passport",
    free: "$0 · No account needed",
    supporter: "~$32/yr once · No auto-renew",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Does a Wi-Fi QR code ever expire or stop working?",
    a: "Never. A Wi-Fi QR code is a static matrix that stores the SSID, encryption type, and password directly in the printed squares. It works offline forever as long as the router's network name and password remain unchanged.",
  },
  {
    q: "Is the Wi-Fi password sent to a server when generating the code?",
    a: "No. QRBuddy encodes the WIFI: string locally inside the browser using client-side JavaScript. Neither the network name nor the password leaves the device.",
  },
  {
    q: "Which phones can scan a Wi-Fi QR card without an extra app?",
    a: "Every iPhone running iOS 11 or newer and Android phones running Android 10 or newer recognize Wi-Fi QR codes natively in the default camera app and display a one-tap 'Join Network' prompt.",
  },
  {
    q: "What if the router password changes after printing the sign?",
    a: "Because native Wi-Fi QR codes store the password directly inside the graphic, changing the router password requires printing a fresh QR sticker — or setting the router's guest SSID and password to match the printed card.",
  },
];

export default function WifiPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/wifi";
  const title =
    "Free Wi-Fi QR Code Generator for Cafés, Airbnbs & Offices (PNG & SVG) | QRBuddy";
  const description =
    "Print a café, Airbnb, or office Wi-Fi QR card in 10 seconds. 100% client-side WPA/WPA2 Wi-Fi QR generator with custom gradients, frames, and free Vector SVG export.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/wifi"
        ogTitle="Instant Wi-Fi QR Card Generator — Free Vector SVG & Print Frames"
        ogImageAlt="Styled Wi-Fi QR code card for cafes and Airbnbs"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Wi-Fi QR Code Generator"
        applicationCategory="UtilitiesApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Free forever client-side Wi-Fi QR code generator with PNG and Vector SVG export"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Cafés, Airbnbs & Studios"
        title="Print a Wi-Fi QR Card."
        titleHighlight="Join in One Scan."
        tagline="One camera scan connects guests to the network. Zero password typos, zero server uploads, zero expiration."
        subtagline="Enter the network name and password below — the QR card updates live and exports in high-res PNG or Vector SVG."
        defaultStyle="pool"
        defaultCaption="JOIN WIFI"
        toolPreset="wifi"
        featuresTitle="Built for Countertops, Welcome Binders & Meeting Rooms"
        faqTitle="Wi-Fi QR Code Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free Wi-Fi Studio and the QRBuddy Passport"
        comparisonSubtitle="Wi-Fi cards are 100% free forever; the Passport unlocks heavy-duty venue links and media drops"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

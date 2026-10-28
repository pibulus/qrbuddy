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
    icon: "📜",
    tag: "Never Reprint",
    title: "Static or Editable Menu Links",
    desc:
      "Make a permanent direct menu QR ($0 forever), or toggle Editable Link to swap seasonal menus without reprinting table tents.",
  },
  {
    icon: "🕰️",
    tag: "Smart Schedule",
    title: "Breakfast, Lunch & Dinner Routing",
    desc:
      "One printed table QR can automatically open the coffee & breakfast menu at 8 AM and the dinner & drinks list at 6 PM.",
  },
  {
    icon: "🍷",
    tag: "Dim-Light Safe",
    title: "Scans Fast in Candlelit Bars",
    desc:
      "Every palette is locked to high print contrast so older phone cameras scan table cards effortlessly in dim dining rooms.",
  },
  {
    icon: "🎨",
    tag: "Print-Shop SVG",
    title: "Vector SVG, Logos & Table ZIPs",
    desc:
      "Drop a venue logo in the center and export a 3000px PNG, true Vector SVG, or a 50-table batch ZIP in one click.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static Menu QR Codes",
    free: "Unlimited · Works forever ($0)",
    supporter: "Included",
  },
  {
    feature: "Editable Menu Links",
    free: "5 permanent editable links",
    supporter: "100 editable links + time routing",
  },
  {
    feature: "Hosted Menu PDF Drops",
    free: "Up to 50 MB per menu PDF",
    supporter: "Up to 500 MB + white-label page",
  },
  {
    feature: "Scan Stats & Rush Hours",
    free: "Live total scan counter",
    supporter: "90-day Field Report & CSV export",
  },
  {
    feature: "QRBuddy Passport",
    free: "$0 · No account needed",
    supporter: "~$32/yr once · No auto-renew",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Can a restaurant menu link change without reprinting table cards?",
    a: "Yes. Toggle 'Editable after print + Stats' below the URL input before downloading. QRBuddy mints an editable redirect link and saves its edit key locally (and in the 4-word Sovereign Passport) so the destination URL can change anytime while the code remains active. Static QRs encode the URL directly into the image and cannot be edited after printing.",
  },
  {
    q: "What happens when the 1-year QRBuddy Passport ends?",
    a: "The Passport runs for 365 days and never renews automatically. Free features stay available, static QR codes work forever on their own, and existing free-tier editable links continue operating within fair-use limits.",
  },
  {
    q: "Does this work with PDF menus, Square, Toast, and Google Drive links?",
    a: "Yes. Paste any HTTPS link — a website menu, Square or Toast online ordering page, Google Drive PDF, or Notion page — or generate a batch ZIP of up to 50 table-specific ordering URLs.",
  },
  {
    q: "Can one printed QR code switch between breakfast and dinner menus automatically?",
    a: "Yes. On an editable QR's management page (/edit), enable Time-of-Day Smart Routing to point morning scans to a breakfast or coffee menu and evening scans to a dinner or drinks list.",
  },
];

export default function RestaurantMenusPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/menus";
  const title =
    "Restaurant & Café Menu QR Code Generator (No Monthly Fee) | QRBuddy";
  const description =
    "Create print-ready static or editable QR codes for restaurant menus, coffee shops, and table ordering. Free vector SVG export, time-of-day menu routing, and zero subscription traps.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/menus"
        ogTitle="Restaurant & Café Menu QR Codes — No Monthly Hostage Fees"
        ogImageAlt="Styled QR codes for restaurant and cafe menus"
        themeColor="#2E7D32"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Restaurant Menu QR Studio"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Hospitality & Dining"
        title="Menu QR Codes."
        titleHighlight="Built for the Dining Room."
        tagline="Mint permanent static menu QRs or editable links that swap from breakfast to dinner without reprinting table tents."
        subtagline="Paste a menu URL below — export 3000px PNGs or print-shop Vector SVGs with zero account wall."
        defaultStyle="matcha"
        defaultUrl="https://qrbuddy.app/demo/menu"
        defaultCaption="VIEW MENU"
        featuresTitle="Built for Cafés, Bars, Food Trucks & Print Shops"
        faqTitle="Restaurant Menu QR Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free Menu Studio and the QRBuddy Passport"
        comparisonSubtitle="Static codes and 5 editable links are free; the Passport unlocks 100 links and 90-day dining room analytics"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

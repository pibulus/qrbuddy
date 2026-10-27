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
    icon: "👤",
    tag: "One-Tap Save",
    title: "Saves Straight to Contacts",
    desc:
      "One camera scan opens the native 'Add to Contacts' sheet on iPhone and Android with name, role, phone, email, and website pre-filled.",
  },
  {
    icon: "✈️",
    tag: "100% Offline",
    title: "Works Without Cell Signal",
    desc:
      "Direct contact cards need zero Wi-Fi or reception in busy expo halls — the contact details live right inside the printed squares.",
  },
  {
    icon: "⚡",
    tag: "Editable Option",
    title: "Pair With an Editable Link",
    desc:
      "Update a portfolio URL or job title after printing 500 cards. Toggle Editable Link to keep the destination flexible.",
  },
  {
    icon: "📐",
    tag: "Print & Lockscreen",
    title: "Sharp on Paper or Lockscreens",
    desc:
      "Download true Vector SVG for letterpress and print shops, or save a 3000px framed PNG for a phone lockscreen badge.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Direct Contact Card QR",
    free: "Unlimited · Works offline ($0)",
    supporter: "Included",
  },
  {
    feature: "Vector SVG for Print Cards",
    free: "Included free + custom logos",
    supporter: "Included + 50-card team ZIPs",
  },
  {
    feature: "Editable Portfolio / Bio Links",
    free: "5 permanent editable links",
    supporter: "100 editable links + 90-day stats",
  },
  {
    feature: "Press Kit / Lookbook Drops",
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
    q: "What is the difference between a direct vCard QR and an editable link QR?",
    a: "A direct vCard QR stores the name, phone, email, company, and website directly inside the QR matrix so phones can save the contact card completely offline. An editable link QR points to a short redirect URL (or social bio hub) that can be updated later if details change.",
  },
  {
    q: "Can a vCard QR code be used as a phone lockscreen wallpaper?",
    a: "Yes. Export the framed 2000px or 3000px PNG and place it on a lockscreen widget or photo album for instant badge-scanning at events and trade shows.",
  },
  {
    q: "How many fields should go into a printed business card vCard?",
    a: "Including more text increases the density of the QR modules. On a standard 2-inch business card, keeping the vCard to Name, Role, Company, Phone, Email, and one Website keeps the modules chunky and effortless to scan.",
  },
  {
    q: "Can a studio generate vCards or portfolio QRs for an entire team at once?",
    a: "Open Customize → Options → Bulk Create to paste up to 50 rows and download a single ZIP containing print-ready PNGs, Vector SVGs, and a manifest.csv file.",
  },
];

export default function VCardPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/vcard";
  const title =
    "Free vCard QR Code Generator for Business Cards & Lockscreens | QRBuddy";
  const description =
    "Create a vCard 3.0 digital business card QR code that saves straight to iPhone and Android contacts offline. Free Vector SVG and 3000px PNG export with zero subscription.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/vcard"
        ogTitle="vCard Business Card QR Generator — Offline Contact Cards & Vector SVG"
        ogImageAlt="vCard QR code for business cards and phone lockscreens"
        themeColor="#3C096C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy vCard Business Card Generator"
        applicationCategory="BusinessApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Free vCard 3.0 QR code generator with Vector SVG export; optional A$49 1-year Passport"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Business Cards & Badges"
        title="Digital Contact Cards."
        titleHighlight="Saved in One Scan."
        tagline="Build an offline-ready vCard QR for printed business cards, conference lanyards, and phone lockscreens."
        subtagline="Fill in the contact fields below — the QR matrix updates live and exports in print-shop Vector SVG or high-res PNG."
        defaultStyle="grape"
        defaultCaption="SAVE CONTACT"
        toolPreset="vcard"
        featuresTitle="Built for Print Stationery, Lanyards & Lockscreens"
        faqTitle="vCard & Business Card QR Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free vCard Studio and the QRBuddy Passport"
        comparisonSubtitle="Direct vCard QR codes are free forever; the Passport expands editable links and press-kit drops"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

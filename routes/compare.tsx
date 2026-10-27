import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../components/VerticalLandingHead.tsx";
import { getComparisonNavPills } from "../utils/comparisons.ts";
import { getSupabaseUrl } from "../utils/api.ts";

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
    icon: "⚡",
    title: "Edit Links After Printing",
    tag: "5 Free · 100 Pass",
    desc:
      "Fix a typo, swap a seasonal menu, or auto-switch Breakfast & Dinner links without reprinting a single flyer.",
  },
  {
    icon: "📐",
    title: "Print-Shop Vector SVG & Batch ZIP",
    tag: "Free Forever",
    desc:
      "Export razor-sharp Vector SVGs, 3000px PNGs, or 50-code batch ZIPs with a print manifest in one click.",
  },
  {
    icon: "📼",
    title: "500 MB Mixtapes, Photos & Secrets",
    tag: "Only on QRBuddy",
    desc:
      "Turn any sticker into a playable audio mixtape, event photo drop, or self-destructing 1-scan note.",
  },
  {
    icon: "🔍",
    title: "Scans in Dim Bars + Street Inspector",
    tag: "Zero Sign-Up",
    desc:
      "Every palette is contrast-locked for phone cameras. Plus: unmask sketchy street QRs before opening.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Annual Price",
    free: "$348 – $420 / year ($29–$35/mo)",
    supporter: "$0 Free · ~$32/yr Passport",
  },
  {
    feature: "Day-8 Trial Shutoff",
    free: "Deactivates printed QRs after trial",
    supporter: "Never — codes stay alive",
  },
  {
    feature: "Auto-Renewal Trap",
    free: "Recurring monthly card charge",
    supporter: "Zero auto-billing (1-year pass)",
  },
  {
    feature: "Edit Link After Print",
    free: "0–2 Free before paywall",
    supporter: "5 Free forever · 100 with Pass",
  },
  {
    feature: "Vector SVG + 50-Code ZIP",
    free: "Paywalled behind $35/mo plan",
    supporter: "Free (SVG + 3000px PNG + CSV)",
  },
  {
    feature: "Smart Menu Schedules",
    free: "Enterprise tier ($199+/mo)",
    supporter: "Breakfast/Dinner & iOS/Android",
  },
  {
    feature: "Mixtapes, Photos & Secrets",
    free: "Basic PDF page only",
    supporter: "500 MB drops + 1-scan notes",
  },
  {
    feature: "Account Requirement",
    free: "Mandatory email & spam drip",
    supporter: "Zero sign-up (4-word passkey)",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Why did a QR code from another generator stop working after 14 days?",
    a: "Many paid-search QR sites default users into 'dynamic' redirect links during creation without clear disclosure, then deactivate those redirects after a 7-to-14-day trial unless a $15–$35/month subscription is started. In QRBuddy, static QR codes encode the URL directly into the squares so they can never expire, and editable dynamic codes are clearly labeled upfront.",
  },
  {
    q: "Can a printed QR code from another platform be rescued without reprinting?",
    a: "If the printed QR code encodes a short redirect URL owned by another company (like qr.io or qrco.de), only that company controls where that specific graphic points. However, before printing the next batch of menus, flyers, or packaging, generating a direct static QR or a transparent QRBuddy editable link ensures the print run stays independent of monthly hostage fees.",
  },
  {
    q: "How does QRBuddy charge ~$32/year instead of $35/month?",
    a: "Redirecting a short URL and rendering vector graphics costs fractions of a cent on modern edge infrastructure. QRBuddy is built by an independent Melbourne developer without paid-search ad bloat or enterprise sales teams — keeping static codes free forever and pricing the 1-year QRBuddy Passport at a flat A$49 (~$32 USD) with no automatic renewal.",
  },
  {
    q: "What happens if the 1-year QRBuddy Passport ends?",
    a: "There is no surprise auto-billing. After 365 days, the Passport simply rests unless renewed manually. Static QR codes work forever on their own, and existing free-tier editable links continue operating within fair-use limits.",
  },
];

export default function ComparePage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/compare";
  const title =
    "QRBuddy vs Bitly, QR.io & QRFY — No Expired Trial QR Codes | QRBuddy";
  const description =
    "Compare QRBuddy against $35/month subscription QR generators. Create permanent static QR codes for free, or get 100 editable dynamic QR codes, vector SVGs, and 90-day analytics for ~$32/year with zero auto-renewal.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/comparar"
        ogTitle="QRBuddy vs Subscription QR Generators — Zero Hostage Links"
        ogImageAlt="Side-by-side comparison of QRBuddy vs monthly subscription QR code generators"
        themeColor="#fbf1e4"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Honest QR Code Comparison"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one-time payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Zero Hostage Fees"
        title="Kill the $35/mo. QR hostage bill."
        tagline="Direct codes stay free forever. Editable links, Vector SVGs, batch ZIPs, and 500 MB mixtape drops — built for print."
        subtagline="Mint a permanent QR below — download 3000px PNG or Vector SVG immediately with zero sign-up."
        defaultStyle="sunset"
        defaultUrl="https://qrbuddy.app"
        defaultCaption="SCAN ME"
        navPills={getComparisonNavPills("en", "all")}
        featuresTitle="The 80/20 That Matters + Pure QRBuddy Soul"
        faqTitle="Questions From Switchers & Print Shops"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs. The Hostage QR Giants"
        comparisonSubtitle="Why pay $420/year just to redirect a URL?"
        qrbuddyFirst
        comparisonColumns={{
          feature: "Capability",
          col1: "Bitly / QR.io / QRFY",
          col2: "QRBuddy (Free + Passport)",
        }}
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Unlock QRBuddy Passport (~$32/yr) 🛂✨"
      />
    </>
  );
}

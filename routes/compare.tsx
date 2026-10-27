import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../components/VerticalLandingHead.tsx";
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
    icon: "🔒",
    title: "True Static Codes Never Expire",
    desc:
      "When creating a static QR code, the destination URL is encoded directly into the graphic matrix. It never touches a redirect server and works forever offline.",
  },
  {
    icon: "⚡",
    title: "Editable Links Without Monthly Traps",
    desc:
      "Create up to 5 permanent editable dynamic QR codes for free, or unlock 100 editable codes + 90-day scan analytics with the once-a-year Passport (~$32 USD / A$49).",
  },
  {
    icon: "🎨",
    title: "Print-Verified Vector SVG & Contrast",
    desc:
      "Export true vector SVGs and 3000px PNGs with live WCAG luminance verification, custom center logos, and bulk ZIP manifests ready for commercial print shops.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static QR Codes",
    free: "Often swapped for a hidden 7–14 day redirect trial",
    supporter: "Unlimited, direct-encoded, works forever ($0)",
  },
  {
    feature: "Free Editable (Dynamic) Codes",
    free: "Deactivated after 7–14 days unless billed monthly",
    supporter: "5 permanent editable codes included free ($0)",
  },
  {
    feature: "Annual Cost for Pro / Editable",
    free: "$180 to $420 / year ($15–$35/mo recurring)",
    supporter: "~$32 USD (A$49) once for 365 days — zero auto-renew",
  },
  {
    feature: "Account & Credit Card Wall",
    free: "Mandatory signup before downloading vector files",
    supporter: "Zero login walls — instant PNG & Vector SVG export",
  },
  {
    feature: "Smart Routing & Cover Pages",
    free: "Locked behind $35+/mo enterprise tiers",
    supporter: "Time-of-day menus, iOS/Android split & Cover Pages included",
  },
  {
    feature: "Media & File Drops",
    free: "PDF/MP3 hosting requires paid monthly plan",
    supporter: "Photo slideshows, audio mixtapes & 500 MB Passport drops",
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
        badge="Honest Comparison"
        title="No 14-Day Trial Traps. No $35/Month Hostage Links."
        tagline="Replace expiring subscription QR codes with permanent static matrices or fair, transparent editable links."
        subtagline="Test the studio live below — export print-ready PNGs and true Vector SVGs immediately without creating an account."
        defaultStyle="sunset"
        defaultUrl="https://qrbuddy.app"
        defaultCaption="SCAN ME"
        featuresTitle="How QRBuddy Fixes the QR Industry Trap"
        faqTitle="Questions From Switchers & Print Shops"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs. 'Free Trial' QR Traps"
        comparisonSubtitle="Side-by-side against QR.io, QRFY, Bitly & QR-Code-Generator"
        comparisonColumns={{
          feature: "What Matters",
          col1: "Typical 'Free Trial' QR Sites",
          col2: "QRBuddy Studio & Passport 🛂",
        }}
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Unlock QRBuddy Passport (~$32/yr) 🛂✨"
      />
    </>
  );
}

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
    icon: "📦",
    title: "GS1 Digital Link URI Syntax",
    desc:
      "Formats GTIN-8, UPC-12, EAN-13, or GTIN-14 barcodes into standard /01/GTIN/10/LOT/17/EXP paths with live Mod-10 check-digit verification.",
  },
  {
    icon: "⚡",
    title: "Editable Batch & Recall Routing",
    desc:
      "Pair packaging QR codes with QRBuddy editable links to update lab certificates, allergen sheets, recipes, or recall notices after labels are printed.",
  },
  {
    icon: "📐",
    title: "Print-House Vector SVG & ZIPs",
    desc:
      "Export crisp Vector SVGs with verified WCAG contrast (<= 0.40 luminance) or batch-generate up to 50 SKUs in a single ZIP with manifest.csv.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "GS1 Digital Link URI Builder + Mod-10 Check",
    free: "Unlimited, direct-encoded, works forever ($0)",
    supporter: "Included",
  },
  {
    feature: "Vector SVG & 3000px Label PNG",
    free: "Included free with live contrast verification",
    supporter: "Included",
  },
  {
    feature: "Bulk SKU Batch ZIP (PNG + SVG + CSV)",
    free: "Up to 50 SKUs per ZIP manifest included",
    supporter: "Included",
  },
  {
    feature: "Editable Product / Lab-Sheet Redirects",
    free: "5 permanent editable links included free",
    supporter: "100 editable links + time/OS routing + 90-day scan CSV",
  },
  {
    feature: "Spec Sheet & Certificate PDF Drops",
    free: "Up to 50 MB file drops",
    supporter: "Up to 500 MB drops + white-label product pages",
  },
  {
    feature: "QRBuddy Passport",
    free: "No purchase required",
    supporter: "~$32 USD (A$49) once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What is the GS1 Sunrise 2027 initiative for product packaging?",
    a: "GS1 Sunrise 2027 is the global retail transition from traditional 1D linear barcodes (UPC/EAN) to 2D QR codes powered by GS1 Digital Link. A single 2D QR code on a bottle, jar, or box carries the GTIN (01) for point-of-sale checkout scanners while simultaneously opening a web page (ingredients, lab results, sustainability info, or re-order page) when scanned by a shopper's phone.",
  },
  {
    q: "How is a GS1 Digital Link URL structured?",
    a: "A standard GS1 Digital Link combines a brand domain with Application Identifiers (AIs) in the URL path: /01/{14-digit-GTIN} followed by optional qualifiers such as /10/{Batch-Lot}, /21/{Serial}, and /17/{YYMMDD-Expiry}. Shorter 8, 12 (UPC), or 13 (EAN) digit barcodes are left-padded with zeros to 14 digits.",
  },
  {
    q: "How does Mod-10 check-digit verification prevent print-run mistakes?",
    a: "The final digit of every GTIN/EAN/UPC barcode is a mathematical Mod-10 checksum. If a single digit is mistyped before printing 5,000 product labels, retail POS scanners will reject the barcode. QRBuddy computes the GS1 Mod-10 check digit live and offers a one-click fix if a mismatch is detected.",
  },
  {
    q: "Can indie food, coffee, wine, or cosmetics brands use this without an enterprise subscription?",
    a: "Yes. Building static GS1 Digital Link QR codes and exporting print-shop Vector SVGs or 50-SKU batch ZIPs is completely free. If a brand wants QRBuddy to host editable product redirects and 90-day scan analytics across up to 100 SKUs, the 1-year Passport is a flat A$49 (~$32 USD) with no recurring monthly fee.",
  },
];

export default function Gs1Page({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/gs1";
  const title =
    "GS1 Sunrise 2027 Digital Link QR Code Builder (GTIN, Lot & Expiry) | QRBuddy";
  const description =
    "Free GS1 Digital Link 2D QR code generator (/01/GTIN/10/LOT/17/EXP) with live Mod-10 check-digit validation, Vector SVG export, and batch SKU ZIPs for packaging.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/gs1"
        ogTitle="GS1 Sunrise 2027 Digital Link QR Builder — GTIN Mod-10 & Vector SVG"
        ogImageAlt="GS1 Digital Link 2D barcode QR generator for product packaging"
        themeColor="#1B4332"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy GS1 Digital Link QR Builder"
        applicationCategory="BusinessApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Free GS1 Digital Link URI builder with Mod-10 check-digit validation and Vector SVG export"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="GS1 Sunrise 2027 Packaging"
        title="GS1 Digital Link 2D Barcodes for Indie Makers."
        tagline="Build compliant /01/GTIN/10/LOT/17/EXP packaging QR codes with live Mod-10 check-digit verification and print-house Vector SVG export."
        subtagline="Enter the brand domain, GTIN barcode, lot, and expiry below — then download a direct static vector or toggle Editable to route scans."
        defaultStyle="matcha"
        defaultCaption="PRODUCT INFO"
        toolPreset="gs1"
        featuresTitle="Built for Food, Beverage, Coffee, Wine & Cosmetics Labels"
        faqTitle="GS1 Sunrise 2027 & Packaging QR Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free GS1 Builder and the QRBuddy Passport"
        comparisonSubtitle="Direct GS1 Digital Link vectors and batch ZIPs are free; the Passport adds 100 editable SKU redirects and 90-day scan stats"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

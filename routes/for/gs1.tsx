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
    tag: "POS + Phone",
    title: "One Barcode for Checkout & Web",
    desc:
      "Carries the product GTIN/UPC barcode for retail checkout lasers while opening ingredients, lab sheets, or reorder pages on phones.",
  },
  {
    icon: "✅",
    tag: "Mistake-Proof",
    title: "Live Barcode Check-Digit Fixer",
    desc:
      "Catches mistyped UPC or EAN barcode numbers before printing 5,000 labels and fixes the final check digit in one click.",
  },
  {
    icon: "⚡",
    tag: "Batch Routing",
    title: "Update Lab Sheets After Print",
    desc:
      "Pair packaging codes with QRBuddy editable links to swap batch certificates, recipes, or recall notices anytime.",
  },
  {
    icon: "📐",
    tag: "Pre-Press Ready",
    title: "Print-House Vector SVG & ZIPs",
    desc:
      "Export crisp Vector SVGs with verified print contrast or batch-generate up to 50 SKUs in one ZIP with manifest.csv.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "GS1 2027 Barcode Builder",
    free: "Unlimited · Direct-encoded ($0)",
    supporter: "Included",
  },
  {
    feature: "Vector SVG & 3000px Labels",
    free: "Included free + contrast check",
    supporter: "Included",
  },
  {
    feature: "Bulk 50-SKU Batch ZIP",
    free: "PNG + SVG + manifest.csv free",
    supporter: "Included",
  },
  {
    feature: "Editable Product / Batch Links",
    free: "5 permanent editable links",
    supporter: "100 editable links + 90-day stats",
  },
  {
    feature: "Lab Sheet & Spec PDF Drops",
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
        title="2D Packaging Barcodes."
        titleHighlight="Built for Indie Makers."
        tagline="Create retail-ready /01/GTIN/10/LOT/17/EXP product QR codes with live check-digit verification and print-house Vector SVG export."
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

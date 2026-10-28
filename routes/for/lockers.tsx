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
    icon: "📤",
    tag: "Instant Drop",
    title: "Drop a File, Mint a QR",
    desc:
      "Drag any PDF, ZIP, image, or audio file onto the input bar to generate a hosted download page and scannable QR code in seconds.",
  },
  {
    icon: "💣",
    tag: "Auto-Purge",
    title: "Self-Destructing Download Caps",
    desc:
      "Keep shares open for 30 days or set a strict download limit (1, 5, 10, or 100 claims) that purges the file once exhausted.",
  },
  {
    icon: "🔐",
    tag: "PIN Protected",
    title: "Reusable Inbound File Lockers",
    desc:
      "Mint a two-way locker QR so clients or attendees can drop files into a PIN-protected box from any mobile browser.",
  },
  {
    icon: "📦",
    tag: "Up to 500 MB",
    title: "Heavy Transfers Without Login Walls",
    desc:
      "Free drops handle files up to 50 MB. The QRBuddy Passport unlocks 500 MB single-file transfers and white-label share pages.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Direct QR Codes",
    free: "Unlimited · Works forever ($0)",
    supporter: "Included",
  },
  {
    feature: "Single-File QR Drops",
    free: "Files up to 50 MB",
    supporter: "Files up to 500 MB (10× larger)",
  },
  {
    feature: "Download Caps & Self-Destruct",
    free: "1 / 5 / 10 / 100 or unlimited claims",
    supporter: "Included + white-label share pages",
  },
  {
    feature: "Retention & Scan Stats",
    free: "30-day hosting + claim counter",
    supporter: "30-day hosting + 90-day analytics CSV",
  },
  {
    feature: "QRBuddy Passport",
    free: "$0 · No account needed",
    supporter: "~$32 USD (A$49) / yr · Never auto-renews",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What file sizes and formats are supported for QR file drops?",
    a: "Free uploads support files up to 50 MB (PDFs, images, audio, ZIP archives, documents; executable binaries are blocked for safety). The QRBuddy Passport raises the single-file ceiling to 500 MB.",
  },
  {
    q: "How do self-destructing download limits work?",
    a: "When staging a file upload, enable the download limit toggle to cap claims at 1, 5, 10, or 100 downloads. Claims are tracked atomically on the server; once the final download completes, the file is purged and subsequent scans land on the KABOOM screen.",
  },
  {
    q: "How long are uploaded files kept on the server?",
    a: "Standard file shares expire 30 days after upload, and reusable file lockers clear after 30 days of inactivity. Automated cleanup runs daily.",
  },
  {
    q: "Do recipients need an account or app to download a shared file?",
    a: "No. Scanning the QR code opens the share page directly in any mobile or desktop browser with zero login wall.",
  },
];

export default function LockersPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/lockers";
  const title =
    "QR Code File Sharing & Self-Destructing File Drops (Up to 500 MB) | QRBuddy";
  const description =
    "Drop a file to generate a scannable QR download link in seconds. Free uploads up to 50 MB, optional self-destructing download limits, and 500 MB transfers with the QRBuddy Passport.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/archivos"
        ogTitle="QR Code File Drops & Self-Destructing Transfers — QRBuddy"
        ogImageAlt="QRBuddy temporary and self-destructing file sharing by QR code"
        themeColor="#00A84F"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy File Drop & Locker Studio"
        applicationCategory="UtilitiesApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="File Drops & Lockers"
        title="Drop a File."
        titleHighlight="Share the QR. Done."
        tagline="Turn PDFs, ZIPs, photos, or audio tracks into a scannable 30-day download page — with optional self-destructing download caps."
        subtagline="Drag a file onto the input bar below or click the paperclip icon to stage a transfer."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/demo/drop"
        defaultCaption="OPEN FILE"
        featuresTitle="Built for Fast Hand-Offs, Print Proofs & Ephemeral Transfers"
        faqTitle="File Drop & Locker Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free File Drops and the QRBuddy Passport"
        comparisonSubtitle="50 MB drops and download caps are free; the Passport expands single-file transfers to 500 MB"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
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
    icon: "💣",
    title: "Self-Destruct on Scan",
    desc:
      "Set your locker to '1-Scan Burn'. Once the recipient downloads the file, the data is permanently erased from the server with zero traces.",
  },
  {
    icon: "🔐",
    title: "End-to-End Encryption",
    desc:
      "Files are protected in-flight and stored with cryptographic keys. Optional 4-word passphrases keep sensitive drops private.",
  },
  {
    icon: "📁",
    title: "Large File Transfers",
    desc:
      "Share confidential design deliverables, firmware, private photos, or contract bundles up to 500MB with zero corporate logging.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Data Retention",
    corporate: "Kept forever on corporate servers and scanned by AI",
    qrbuddy: "Auto-destructs after 1 scan, 1 hour, or 24 hours",
  },
  {
    feature: "Account Requirement",
    corporate: "Forces account registration, email collection & 2FA spam",
    qrbuddy: "Zero accounts — scan the QR, grab the file, walk away",
  },
  {
    feature: "Surveillance & Logs",
    corporate: "Tracks IP, device fingerprints, and location telemetry",
    qrbuddy: "Zero tracking, zero analytics on lockers, zero logging",
  },
  {
    feature: "File Security",
    corporate: "Open links indexed by scrapers",
    qrbuddy: "Encrypted lockers with finite download allowances",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does a self-destructing file drop work?",
    a: "Drag and drop your files into QRBuddy and toggle 'Destructible'. A QR code is generated. Once the code is scanned and the file is downloaded, it is permanently wiped from the storage bucket.",
  },
  {
    q: "Who can access my files?",
    a: "Only someone with the exact QR code (or destination token). QRBuddy does not index or catalog file lockers.",
  },
  {
    q: "What is the maximum file size?",
    a: "Free users can transfer files up to 50MB. Supporter Pass holders can drop single or multi-file archives up to 500MB.",
  },
  {
    q: "Can I password-protect my locker?",
    a: "Yes, you can enable passkey encryption so scanners must enter the 4-word sync key or password to unlock the download.",
  },
];

export default function LockersPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/lockers";
  const title =
    "Ephemeral File Drops & Destructible QR Codes — Zero Tracking | QRBuddy";
  const description =
    "Share private files up to 500MB with self-destructing QR codes. Auto-deletes after 1 scan or 24 hours. Zero logs, encrypted in-flight, no account required.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Performance hints */}
        {data?.supabaseUrl && (
          <>
            <link rel="dns-prefetch" href={data.supabaseUrl} />
            <link rel="preconnect" href={data.supabaseUrl} />
          </>
        )}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="QRBuddy" />
        <meta property="og:url" content={canonicalUrl} />
        <meta
          property="og:title"
          content="Ephemeral File Drops & Destructible QR Codes — QRBuddy"
        />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Ephemeral file drops and self-destructing QR codes"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta
          name="twitter:title"
          content="Ephemeral File Drops & Destructible QR Codes — QRBuddy"
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA & Icons */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00FF41" />

        {/* JSON-LD Structured Data for Product & FAQ */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "QRBuddy Ephemeral Lockers",
                "url": canonicalUrl,
                "description": description,
                "applicationCategory": "SecurityApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "49",
                  "priceCurrency": "USD",
                  "description":
                    "Annual Studio Pass with 500MB encrypted ephemeral lockers",
                },
              },
              {
                "@type": "FAQPage",
                "mainEntity": FAQ_ITEMS.map((item) => ({
                  "@type": "Question",
                  "name": item.q,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.a,
                  },
                })),
              },
            ],
          })}
        </script>
      </Head>

      <VerticalStudio
        badge="Security & Privacy"
        title="Ephemeral File Drops & Destructible QRs."
        tagline="Share sensitive documents, firmware, and media files that self-destruct immediately after download."
        subtagline="One-time scan burns, finite expiry, and encrypted transfers up to 500MB. Zero accounts, zero tracking."
        defaultStyle="terminal"
        defaultCaption="SECRET DROP"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Cloud Storage Giants"
        comparisonSubtitle="Why privacy advocates and journalists use QRBuddy for dead drops"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Privacy Pass ($49/yr) 🛡️"
      />
    </>
  );
}

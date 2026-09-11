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
    icon: "📸",
    title: "Instant Guest Photo Drop",
    desc:
      "Guests scan table cards and upload full-resolution photos directly to your private locker. No apps to download, no account required.",
  },
  {
    icon: "🎵",
    title: "Playable Audio Story",
    desc:
      "Embed your first-dance song, vows, or curated playlist. When guests scan, it opens a gorgeous retro player that auto-advances tracks.",
  },
  {
    icon: "🌸",
    title: "Blush Pastel Aesthetic",
    desc:
      "Custom rose-gold, blush, and cream gradients that complement your floral arrangements, signage, and wedding stationery.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Active Duration",
    corporate: "Deleted after 7–30 days unless you pay $25/month",
    qrbuddy: "Active for a full 365 days with our 1-Year Pass",
  },
  {
    feature: "Guest Experience",
    corporate: "Forces guests to download an app and create accounts",
    qrbuddy: "Zero app download — opens instantly in mobile Safari/Chrome",
  },
  {
    feature: "Audio & Playlist",
    corporate: "Photos only, zero sound",
    qrbuddy: "Integrated multi-track audio player with auto-advance",
  },
  {
    feature: "Photo Quality",
    corporate: "Compressed down to low-res thumbnails",
    qrbuddy: "Original full-res uploads packaged into an instant ZIP",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How do guests upload their photos?",
    a: "Guests point their phone camera at the table QR code. It opens a private upload screen where they can drag or tap to add photos from their camera roll. No app download needed.",
  },
  {
    q: "How do we download all the photos after the wedding?",
    a: "From your organizer link, click 'Download All' to get a single clean ZIP archive with every guest photo at full camera resolution.",
  },
  {
    q: "Can we print the QR code on our table cards and invitations?",
    a: "Yes! Download the QR code as a high-resolution PNG or vector SVG with a custom 'PHOTO DROP' or 'SCAN ME' frame ready for your stationer or Canva.",
  },
  {
    q: "How long does the wedding QR code stay active?",
    a: "Your code and private locker stay active for a full 12 months, so you and your guests can revisit memories well after the honeymoon.",
  },
];

export default function WeddingsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/weddings";
  const title =
    "Wedding QR Codes — Guest Photo Drops & Audio Playlists | QRBuddy";
  const description =
    "Beautiful wedding QR codes for guest photo uploads, table stationery, and first-dance audio playlists. Lasts a full year, no guest app download required.";

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
          content="Wedding QR Codes for Guest Photos & Audio Stories — QRBuddy"
        />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Beautiful wedding QR codes for photo drops and audio"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta
          name="twitter:title"
          content="Wedding QR Codes for Guest Photos & Audio Stories — QRBuddy"
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA & Icons */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#BA5566" />

        {/* JSON-LD Structured Data for Product & FAQ */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "QRBuddy Weddings",
                "url": canonicalUrl,
                "description": description,
                "applicationCategory": "LifestyleApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "19",
                  "priceCurrency": "USD",
                  "description":
                    "1-Year Wedding Event Drop Pass with full-res guest photo locker",
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
        badge="Weddings & Celebrations"
        title="Wedding QR Codes for Photos & Love Stories."
        tagline="Replace $400 audio guestbook rentals and expiring photo apps with one gorgeous table QR code."
        subtagline="Guests scan, drop full-res photos straight to your private locker, and listen to your wedding playlist. Active for 1 full year."
        defaultStyle="blush"
        defaultUrl="https://ourwedding.love"
        defaultCaption="PHOTO DROP"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Disposable Wedding Apps"
        comparisonSubtitle="Why modern couples love the 1-year private photo drop"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Wedding Pass ($19) 💜"
      />
    </>
  );
}

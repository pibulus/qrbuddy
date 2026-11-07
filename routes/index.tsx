import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import HomeStage from "../components/HomeStage.tsx";
import { getSupabaseUrl } from "../utils/api.ts";

interface HomeProps {
  supabaseUrl?: string;
}

export const handler: Handlers<HomeProps> = {
  GET(_req, ctx) {
    // Env injection for islands lives in _app.tsx; this only feeds the
    // dns-prefetch/preconnect hints below.
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
  return (
    <>
      <Head>
        <title>
          QRBuddy — Free &amp; Dynamic QR Code Studio (Vector SVG, Logos,
          Routing &amp; Analytics)
        </title>
        <meta
          name="description"
          content="Full-stack QR code studio for print, menus, packaging, and events. Create static & editable dynamic QR codes, Wi-Fi, vCards, branded cover pages, bulk ZIPs, 500 MB media drops, and 90-day analytics without hostage subscriptions."
        />
        <link rel="canonical" href="https://qrbuddy.app/" />
        <link rel="alternate" hrefLang="en" href="https://qrbuddy.app/" />
        <link rel="alternate" hrefLang="es" href="https://qrbuddy.app/es" />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/"
        />

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
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="es_MX" />
        <meta property="og:url" content="https://qrbuddy.app/" />
        <meta
          property="og:title"
          content="QRBuddy — Free & Dynamic QR Code Studio (Vector SVG, Logos, Routing & Analytics)"
        />
        <meta
          property="og:description"
          content="Full-stack QR code studio for print, menus, packaging, and events. Create static & editable dynamic QR codes, Wi-Fi, vCards, branded cover pages, bulk ZIPs, 500 MB media drops, and 90-day analytics without hostage subscriptions."
        />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Full-stack gradient QR code studio"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app/" />
        <meta
          name="twitter:title"
          content="QRBuddy — Free & Dynamic QR Code Studio (Vector SVG, Logos, Routing & Analytics)"
        />
        <meta
          name="twitter:description"
          content="Full-stack QR code studio for print, menus, packaging, and events. Create static & editable dynamic QR codes, Wi-Fi, vCards, branded cover pages, bulk ZIPs, 500 MB media drops, and 90-day analytics without hostage subscriptions."
        />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbf1e4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "QRBuddy",
              "url": "https://qrbuddy.app",
              "description":
                "Full-stack QR code studio replacing Bitly, QR Code Monkey, and QR Tiger. Create print-verified gradient QR codes with vector SVG export, custom logos, editable dynamic redirects, time-of-day & device routing, bulk ZIP generation, 500 MB media drops, and 90-day privacy-safe analytics.",
              "applicationCategory": "BusinessApplication",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Free Studio",
                  "price": "0",
                  "priceCurrency": "AUD",
                },
                {
                  "@type": "Offer",
                  "name": "The QRBuddy Passport (1 Year)",
                  "price": "49",
                  "priceCurrency": "AUD",
                },
              ],
              "creator": {
                "@type": "Person",
                "name": "Pablo",
              },
              "featureList": [
                "10 print-verified palettes (Sunset, Ocean, Forest, Crimson, Vaporwave, Cosmic, Candy, Matrix, Brutal, Classic) + custom gradient builder",
                "High-resolution PNG (up to 3000px) and true vector SVG export with live WCAG contrast verification",
                "All core QR types: URL, Wi-Fi, Contact Card (vCard), Social Bio Hub, Media Hub, Phone, SMS, Email, Plain Text",
                "Editable Dynamic QR codes with custom short codes, scan caps, and expiration dates",
                "Smart Conditional Routing: Time-of-day schedules (Breakfast/Lunch/Dinner menus), iOS/Android split, and A/B split",
                "Branded Cover Pages with 3 themes, 1-click starters, and Passport White-Label mode",
                "Bulk / Batch QR Generator exporting PNG + Vector SVG + print-shop manifest.csv in one ZIP",
                "Daylight Media Drops: Photo Slideshows, Audio Mixtapes, Inbound File Lockers, and up to 500 MB file drops",
                "Passport Field Report: 7d/30d/90d scan trends, Top Cities & Countries, 24h Peak Rush Hour, Track/Photo Leaderboard, and RFC-4180 CSV export",
                "Street-Safe QR Inspector: unroll up to 5 redirect hops, verify HTTPS, and inspect live visual webpage previews",
                "Bilingual English (/) and Spanish (/es) with zero mandatory email/password account walls",
              ],
              "operatingSystem": "Any (Web-based)",
              "browserRequirements":
                "Requires JavaScript, Modern browser with Clipboard API support",
            }),
          }}
        />
      </Head>

      <HomeStage lang="en" />
    </>
  );
}

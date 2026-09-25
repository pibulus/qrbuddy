import { Head } from "$fresh/runtime.ts";
import type { FAQItem } from "../islands/VerticalStudio.tsx";

/**
 * The byte-identical <Head> skeleton shared by every `for/*` and `es/*`
 * vertical landing page: canonical/hreflang, OG/Twitter cards, PWA icons,
 * and the WebApplication + FAQPage JSON-LD block. Page-specific prose
 * (badge, tagline, value cards, comparison table) stays inline in each
 * route — only the meta scaffolding lives here.
 */
export interface VerticalLandingHeadProps {
  lang: "en" | "es";
  canonicalUrl: string;
  title: string;
  description: string;
  altLang: "en" | "es";
  altHref: string;
  /** Defaults to `title` — for/* pages use a shorter custom OG title. */
  ogTitle?: string;
  ogImageAlt: string;
  themeColor: string;
  supabaseUrl?: string;
  jsonLdName: string;
  applicationCategory: string;
  price: string;
  /**
   * ⚠️ OPEN QUESTION (2026-09): defaults to "USD" here and is asserted as
   * "USD" in every JSON-LD offer across en+es landing pages, but the actual
   * charge currency is `SUPPORTER_CURRENCY`, read ONCE at
   * `supabase/functions/_shared/square.ts:35` with a fallback of `"AUD"` —
   * a var with no `.env.example` entry, no deploy script, and no doc
   * anywhere else in the repo. $49 AUD ≈ $32 USD, not $49 USD. Before
   * trusting this default, check the live Supabase dashboard value for
   * `SUPPORTER_CURRENCY` and either set it to `"USD"` explicitly or update
   * every prop call site (and routes/es/menus.tsx's prose) to match.
   */
  priceCurrency?: string;
  offerDescription: string;
  faqItems: FAQItem[];
}

export default function VerticalLandingHead({
  lang,
  canonicalUrl,
  title,
  description,
  altLang,
  altHref,
  ogTitle,
  ogImageAlt,
  themeColor,
  supabaseUrl,
  jsonLdName,
  applicationCategory,
  price,
  priceCurrency = "USD",
  offerDescription,
  faqItems,
}: VerticalLandingHeadProps) {
  const resolvedOgTitle = ogTitle ?? title;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang={lang} href={canonicalUrl} />
      <link rel="alternate" hrefLang={altLang} href={altHref} />

      {/* Performance hints */}
      {supabaseUrl && (
        <>
          <link rel="dns-prefetch" href={supabaseUrl} />
          <link rel="preconnect" href={supabaseUrl} />
        </>
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="QRBuddy" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogImageAlt} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

      {/* PWA & Icons */}
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content={themeColor} />

      {/* JSON-LD Structured Data for Product & FAQ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              "name": jsonLdName,
              "url": canonicalUrl,
              "description": description,
              "applicationCategory": applicationCategory,
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": priceCurrency,
                "description": offerDescription,
              },
            },
            {
              "@type": "FAQPage",
              "mainEntity": faqItems.map((item) => ({
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
  );
}

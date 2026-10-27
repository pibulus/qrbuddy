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
   * Charge currency is AUD ($49 AUD ≈ $32 USD, matching `supabase/functions/_shared/square.ts`).
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
  priceCurrency = "AUD",
  offerDescription,
  faqItems,
}: VerticalLandingHeadProps) {
  const resolvedOgTitle = ogTitle ?? title;
  const xDefaultHref = lang === "en" ? canonicalUrl : altHref;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang={lang} href={canonicalUrl} />
      <link rel="alternate" hrefLang={altLang} href={altHref} />
      <link rel="alternate" hrefLang="x-default" href={xDefaultHref} />

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
      <meta
        property="og:locale"
        content={lang === "es" ? "es_MX" : "en_US"}
      />
      <meta
        property="og:locale:alternate"
        content={lang === "es" ? "en_US" : "es_MX"}
      />
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

      {/* JSON-LD Structured Data for Product, Breadcrumbs & FAQ */}
      <script
        type="application/ld+json"
        // deno-lint-ignore react-no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": jsonLdName,
                "url": canonicalUrl,
                "inLanguage": lang,
                "description": description,
                "applicationCategory": applicationCategory,
                "operatingSystem": "All",
                "offers": price === "0"
                  ? {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": priceCurrency,
                    "description": offerDescription,
                  }
                  : [
                    {
                      "@type": "Offer",
                      "name": lang === "es"
                        ? "QRBuddy Studio Gratis"
                        : "QRBuddy Free Studio",
                      "price": "0",
                      "priceCurrency": priceCurrency,
                      "description": lang === "es"
                        ? "QRs estáticos ilimitados, 5 links editables y envíos de 50 MB gratis"
                        : "Unlimited static QRs, 5 editable links, and 50 MB drops free",
                    },
                    {
                      "@type": "Offer",
                      "name": "QRBuddy Passport",
                      "price": price,
                      "priceCurrency": priceCurrency,
                      "description": offerDescription,
                    },
                  ],
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "QRBuddy",
                    "item": lang === "es"
                      ? "https://qrbuddy.app/es"
                      : "https://qrbuddy.app/",
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": jsonLdName,
                    "item": canonicalUrl,
                  },
                ],
              },
              {
                "@type": "FAQPage",
                "inLanguage": lang,
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
          }),
        }}
      />
    </Head>
  );
}

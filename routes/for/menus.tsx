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
    icon: "📜",
    title: "Never Reprint Again",
    desc:
      "Update your PDF, daily specials, or website link instantly. Your printed table cards and window stickers stay working forever.",
  },
  {
    icon: "🛡️",
    title: "Zero Hostage Links",
    desc:
      "Corporate QR apps charge $300/yr and break your printed menus if you cancel. With QRBuddy, your printed codes will never 404.",
  },
  {
    icon: "🎨",
    title: "Branded Aesthetic",
    desc:
      "Match your venue's interior with organic matcha greens, golden sunsets, or minimal monochrome. No ugly pixelated black squares.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Pricing Model",
    corporate: "$300 – $450/year (Sneaky monthly recurring)",
    qrbuddy: "$49/year flat Studio Pass or 100% Free Static",
  },
  {
    feature: "Cancellation Policy",
    corporate: "Immediately breaks printed QR codes into 404 errors",
    qrbuddy: "Codes stay active and freeze to last destination gracefully",
  },
  {
    feature: "Customer Privacy",
    corporate: "Harvests patron IPs, device identifiers & tracking cookies",
    qrbuddy: "Zero tracking, zero cookies, GDPR/privacy native",
  },
  {
    feature: "Design & Colors",
    corporate: "Boring black/white or watermarked logos",
    qrbuddy: "Pastel gradients, custom shapes, center logos, frames",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Can I update my menu link without reprinting my QR codes?",
    a: "Yes! With a dynamic QR code on QRBuddy, you can switch your PDF menu, online ordering link, or Instagram page whenever you want from your private edit link.",
  },
  {
    q: "What happens if I don't renew next year?",
    a: "Unlike Bitly or Beaconstac which extort you by breaking your printed table tents, QRBuddy never breaks your active codes. They simply freeze at their current destination.",
  },
  {
    q: "Does this work with online PDF menus and Square/Toast ordering?",
    a: "Absolutely. Point your QR directly to your PDF file on Google Drive, Dropbox, your website, or your Square/Toast online ordering page.",
  },
  {
    q: "Are there scan limits on restaurant table menus?",
    a: "No scan limits. Whether 50 or 50,000 customers scan your menu, it works seamlessly.",
  },
];

export default function RestaurantMenusPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/menus";
  const title =
    "Restaurant & Cafe QR Code Menus — Dynamic, Anti-Hostage | QRBuddy";
  const description =
    "Dynamic QR code menus for restaurants, cafes, and bars. Update your PDF or link anytime without reprinting. $49/year flat, no monthly extortion, zero customer tracking.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/es/menus"
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
        <meta property="og:url" content={canonicalUrl} />
        <meta
          property="og:title"
          content="Anti-Hostage QR Code Menus for Restaurants & Cafes — QRBuddy"
        />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Beautiful anti-hostage QR menus for restaurants"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta
          name="twitter:title"
          content="Anti-Hostage QR Code Menus for Restaurants & Cafes — QRBuddy"
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA & Icons */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2E7D32" />

        {/* JSON-LD Structured Data for Product & FAQ */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "QRBuddy Restaurant Menus",
                "url": canonicalUrl,
                "description": description,
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "49",
                  "priceCurrency": "USD",
                  "description":
                    "Annual Studio Pass with unlimited dynamic QR code redirects",
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
        badge="Hospitality & Dining"
        title="The QR Menu That Never Breaks."
        tagline="Dynamic QR codes for cafes, bars, and restaurants without the $300/year corporate hostage pricing."
        subtagline="Update your PDF menu or online ordering link whenever your chef changes a dish. Your printed table stickers keep working."
        defaultStyle="matcha"
        defaultUrl="https://your-cafe.com/menu.pdf"
        defaultCaption="MENU"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Corporate QR SaaS"
        comparisonSubtitle="Why 500+ independent venues switched from Bitly & Beaconstac"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Menu Pass ($49/yr) ✨"
      />
    </>
  );
}

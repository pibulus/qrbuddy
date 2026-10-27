import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio from "../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../components/VerticalLandingHead.tsx";
import { getSupabaseUrl } from "../../utils/api.ts";
import {
  COMPETITORS,
  type CompetitorSlug,
  getComparisonNavPills,
  isValidCompetitorSlug,
} from "../../utils/comparisons.ts";

interface PageData {
  slug: CompetitorSlug;
  supabaseUrl?: string;
}

export const handler: Handlers<PageData> = {
  GET(_req, ctx) {
    const rawSlug = (ctx.params.slug || "").toLowerCase();
    if (!isValidCompetitorSlug(rawSlug)) {
      return new Response(null, {
        status: 307,
        headers: { Location: "/compare" },
      });
    }
    return ctx.render({
      slug: rawSlug,
      supabaseUrl: getSupabaseUrl() ?? undefined,
    });
  },
};

export default function CompetitorComparisonPage({
  data,
}: PageProps<PageData>) {
  const entry = COMPETITORS[data.slug];
  const copy = entry.en;
  const canonicalUrl = `https://qrbuddy.app/vs/${entry.slug}`;
  const altHref = `https://qrbuddy.app/es/vs/${entry.slug}`;

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={copy.metaTitle}
        description={copy.metaDescription}
        altLang="es"
        altHref={altHref}
        ogTitle={copy.ogTitle}
        ogImageAlt={copy.ogImageAlt}
        themeColor="#fbf1e4"
        supabaseUrl={data.supabaseUrl}
        jsonLdName={copy.jsonLdName}
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one payment with no automatic renewal"
        faqItems={copy.faqItems}
      />

      <VerticalStudio
        lang="en"
        badge={copy.badge}
        title={copy.title}
        tagline={copy.tagline}
        subtagline={copy.subtagline}
        defaultStyle={entry.defaultStyle}
        defaultUrl="https://qrbuddy.app"
        defaultCaption={copy.defaultCaption}
        navPills={getComparisonNavPills("en", entry.slug)}
        featuresTitle={copy.featuresTitle}
        faqTitle={copy.faqTitle}
        valueCards={copy.valueCards}
        comparisonTitle={copy.comparisonTitle}
        comparisonSubtitle={copy.comparisonSubtitle}
        qrbuddyFirst
        comparisonColumns={copy.comparisonColumns}
        comparisonItems={copy.comparisonItems}
        faqItems={copy.faqItems}
        ctaLabel={copy.ctaLabel}
      />
    </>
  );
}

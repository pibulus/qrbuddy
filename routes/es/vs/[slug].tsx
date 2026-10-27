import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio from "../../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../../components/VerticalLandingHead.tsx";
import { getSupabaseUrl } from "../../../utils/api.ts";
import {
  COMPETITORS,
  type CompetitorSlug,
  getComparisonNavPills,
  isValidCompetitorSlug,
} from "../../../utils/comparisons.ts";

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
        headers: { Location: "/es/comparar" },
      });
    }
    return ctx.render({
      slug: rawSlug,
      supabaseUrl: getSupabaseUrl() ?? undefined,
    });
  },
};

export default function CompetitorComparisonEsPage({
  data,
}: PageProps<PageData>) {
  const entry = COMPETITORS[data.slug];
  const copy = entry.es;
  const canonicalUrl = `https://qrbuddy.app/es/vs/${entry.slug}`;
  const altHref = `https://qrbuddy.app/vs/${entry.slug}`;

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={copy.metaTitle}
        description={copy.metaDescription}
        altLang="en"
        altHref={altHref}
        ogTitle={copy.ogTitle}
        ogImageAlt={copy.ogImageAlt}
        themeColor="#fbf1e4"
        supabaseUrl={data.supabaseUrl}
        jsonLdName={copy.jsonLdName}
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un solo pago sin renovación automática"
        faqItems={copy.faqItems}
      />

      <VerticalStudio
        lang="es"
        badge={copy.badge}
        title={copy.title}
        tagline={copy.tagline}
        subtagline={copy.subtagline}
        defaultStyle={entry.defaultStyle}
        defaultUrl="https://qrbuddy.app/es"
        defaultCaption={copy.defaultCaption}
        navPills={getComparisonNavPills("es", entry.slug)}
        homeUrl="/es"
        homeLabel="← Volver al inicio"
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

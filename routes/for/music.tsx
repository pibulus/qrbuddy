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
    icon: "🎧",
    title: "Hosted 10-Track Mixtape Player",
    desc:
      "Drop up to 10 audio tracks (up to 5 MB each) onto the studio to mint a browser-playable mixtape page with auto-advance and track leaderboards.",
  },
  {
    icon: "🔗",
    title: "Repoint Merch & Poster QRs on Tour",
    desc:
      "Use an editable dynamic QR on vinyl sleeves, cassette J-cards, or tour posters and update the destination for every new release or ticket drop.",
  },
  {
    icon: "🎨",
    title: "Sticker, Sleeve & Poster Vector SVG",
    desc:
      "Pick a luminance-locked gradient, add band or label artwork in the center, and export a 3000px PNG or Vector SVG ready for pressing plants.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static Release & Bandcamp QR Codes",
    free: "Unlimited; destination is encoded directly in the QR ($0)",
    supporter: "Included",
  },
  {
    feature: "Editable Tour & Merch Links",
    free: "5 permanent editable links included free",
    supporter: "100 editable links + iOS/Android & schedule routing",
  },
  {
    feature: "Multi-Track Mixtape Share",
    free: "Up to 10 audio tracks, up to 5 MB each (30-day hosting)",
    supporter: "Same 10-track cap + track play leaderboard & white-label mode",
  },
  {
    feature: "Single WAV / Stem Pack File Drop",
    free: "Up to 50 MB single file (30-day hosting)",
    supporter: "Up to 500 MB single file (30-day hosting)",
  },
  {
    feature: "QRBuddy Passport",
    free: "No purchase required",
    supporter: "~$32 USD (A$49) once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does a hosted QRBuddy mixtape playlist work?",
    a: "Drop 2 to 10 audio files (MP3, M4A, WAV, or OGG up to 5 MB each) onto the studio input. QRBuddy builds a hosted player page at /f/{code} where listeners stream tracks in the browser with auto-advance. Hosted file shares remain online for 30 days.",
  },
  {
    q: "Can a band update where a merch table or vinyl sticker QR points after printing?",
    a: "Yes. Toggle 'Editable after print + Stats' below the URL input before exporting the QR. The printed graphic routes through an editable short link that can point to a Bandcamp pre-order today and tour tickets next month.",
  },
  {
    q: "Can a producer drop a large WAV master or stem ZIP via QR?",
    a: "Single-file drops support up to 50 MB on the free tier and up to 500 MB with the QRBuddy Passport, with optional scan-count self-destruction (1, 5, 10, or 100 downloads).",
  },
  {
    q: "Does the Passport include track-by-track play analytics?",
    a: "Yes. On any owned mixtape or slideshow page (/f/{code}), the Passport Field Report displays 7d/30d/90d opens, top listener cities, peak hours, and a per-track play leaderboard with CSV export.",
  },
];

export default function MusicPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/music";
  const title =
    "Music QR Code Generator & Hosted Mixtape Player for Bands & Labels | QRBuddy";
  const description =
    "Create gradient QR codes for vinyl sleeves, cassette J-cards, gig posters, and merch tables. Drop up to 10 audio tracks for an instant mixtape player or export free Vector SVGs.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/musica"
        ogTitle="Music QR Codes & Mixtape Drops for Bands, Vinyl & Merch — QRBuddy"
        ogImageAlt="Styled QR code for music releases and mixtapes"
        themeColor="#E600E6"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Music & Mixtape QR Studio"
        applicationCategory="MultimediaApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Musicians & Independent Labels"
        title="Put the Mixtape One Scan Away."
        tagline="Drop up to 10 audio tracks for a browser-playable mixtape page, or mint editable QR codes for vinyl sleeves, zines, and tour posters."
        subtagline="Paste a release link or drop audio files below — export 3000px PNGs and pressing-plant Vector SVGs free."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="LISTEN NOW"
        featuresTitle="Built for Vinyl Sleeves, Cassette J-Cards, Posters & Merch"
        faqTitle="Music & Mixtape QR Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free Music Studio and the QRBuddy Passport"
        comparisonSubtitle="Static release QRs, 5 editable links, and 10-track mixtapes are free; the Passport adds 500 MB drops and track stats"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

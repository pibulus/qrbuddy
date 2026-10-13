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
    title: "Share a hosted mixtape",
    desc:
      "Upload up to 10 audio tracks, up to 5 MB each, for a QRBuddy playlist page with browser playback and track controls.",
  },
  {
    icon: "🔗",
    title: "Update an editable QR",
    desc:
      "Change an editable QR's destination after printing. Static QRs keep their original destination. Playlist shares expire after 30 days.",
  },
  {
    icon: "🎨",
    title: "Design for physical media",
    desc:
      "Choose a color style, add a logo, and download a PNG or SVG for stickers, sleeves, and posters.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static QR codes",
    free: "Unlimited; destination is encoded in the QR",
    supporter: "Included",
  },
  {
    feature: "Editable QRs",
    free: "Available within free-tier limits",
    supporter: "Higher creation limits",
  },
  {
    feature: "Single-file uploads",
    free: "Up to 50 MB; share expires after 30 days",
    supporter: "Up to 500 MB; share expires after 30 days",
  },
  {
    feature: "Multi-track playlist share",
    free: "Up to 10 audio tracks, up to 5 MB each",
    supporter: "Same limit; 500 MB applies to a single file",
  },
  {
    feature: "Supporter Pass",
    free: "No purchase required",
    supporter: "A$49 once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does a QRBuddy playlist work?",
    a: "Upload up to 10 audio files, up to 5 MB each. QRBuddy hosts a page where listeners can play tracks in the browser and move between them. The share expires after 30 days.",
  },
  {
    q: "Can I change the destination after printing?",
    a: "Yes, with an editable QR and its private edit link. A static QR cannot be changed because the destination is encoded in the image.",
  },
  {
    q: "Can I use the QR on stickers and sleeves?",
    a: "Download the QR as a PNG or SVG for your design. Scan a test print at its intended size before producing a larger run. You can also link directly to a release page on another service.",
  },
  {
    q: "What does the Supporter Pass include?",
    a: "It costs A$49 once and lasts 365 days, with no automatic renewal. It raises selected limits and allows a single file up to 500 MB. Multi-track playlists remain limited to 10 audio files of up to 5 MB each.",
  },
];

export default function MusicPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/music";
  const title = "Music QR Codes and Hosted Mixtape Playlists | QRBuddy";
  const description =
    "Create a QRBuddy mixtape playlist with up to 10 audio files, or link a QR code to a release page. Download PNG or SVG designs for physical releases.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/musica"
        ogTitle="Music QR Codes for Releases and Merch — QRBuddy"
        ogImageAlt="QR code for a music release"
        themeColor="#E600E6"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Music QR Codes"
        applicationCategory="MultimediaApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Supporter Pass: A$49 for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Musicians & Labels"
        title="Put Your Mixtape One Scan Away."
        tagline="Upload up to 10 audio tracks for a hosted QRBuddy playlist, or link to your release page."
        subtagline="Tracks play in the browser and can advance automatically. File shares expire after 30 days."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="LISTEN NOW"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free QRBuddy and the Supporter Pass"
        comparisonSubtitle="A clear look at included features and higher limits"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Supporter Pass 🎵"
      />
    </>
  );
}

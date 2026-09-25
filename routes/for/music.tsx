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
    icon: "📼",
    title: "Playable Mixtapes on Scan",
    desc:
      "Upload up to 10 audio tracks. When fans scan your sticker or vinyl insert, it launches an instant web cassette player that auto-advances tracks.",
  },
  {
    icon: "📦",
    title: "Instant ZIP Downloads",
    desc:
      "Fans can stream the tracks directly in browser or hit 'Download All' to get the entire EP, stems, or art booklet packaged cleanly as a ZIP.",
  },
  {
    icon: "⚡",
    title: "Merch & Vinyl Native",
    desc:
      "Print vector SVGs directly on t-shirts, cassette J-cards, tour posters, and record labels. Looks stunning in neon vapor or retro candy.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Streaming Experience",
    corporate: "Points to generic streaming platforms with third-party ads",
    qrbuddy: "Dedicated branded mixtape player with onEnded auto-advance",
  },
  {
    feature: "File Downloads",
    corporate: "Links only, zero audio packaging",
    qrbuddy: "Direct browser streaming + full ZIP release packaging",
  },
  {
    feature: "Fan Privacy",
    corporate: "Profiles listeners with advertising pixels and trackers",
    qrbuddy: "100% private, zero telemetry, direct connection with fans",
  },
  {
    feature: "Cost for Artists",
    corporate: "$20 – $40/month per link campaign",
    qrbuddy: "$49/year Studio Pass with unlimited dynamic drops",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does the mixtape player work?",
    a: "Upload your MP3, WAV, or FLAC audio files (up to 10 tracks). QRBuddy creates a dedicated player page with track selector pills, play/pause controls, auto-play progression, and a one-tap ZIP download.",
  },
  {
    q: "Can I put this on band merch and tour stickers?",
    a: "Yes! Download the QR code as a high-res SVG or PNG. Print it on stickers, cassette sleeves, vinyl record jackets, or gig posters.",
  },
  {
    q: "Can I update the audio or tracklist after printing?",
    a: "With a dynamic QR code on QRBuddy, you can update your release URL or point to bonus material even after stickers have been distributed.",
  },
  {
    q: "Is there any audio compression?",
    a: "Your audio files are delivered directly to listeners in their original format with zero transcoding degradation.",
  },
];

export default function MusicPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/music";
  const title =
    "Music QR Codes — Playable Mixtapes & Merch Audio Drops | QRBuddy";
  const description =
    "Create playable QR code mixtapes for physical merch, vinyl inserts, cassette J-cards, and band stickers. Multi-track auto-advance audio player with instant ZIP downloads.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/musica"
        ogTitle="Music QR Codes — Playable Mixtapes & Merch Audio Drops | QRBuddy"
        ogImageAlt="QRBuddy - Playable QR code mixtapes and audio drops for music"
        themeColor="#E600E6"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Music Mixtapes"
        applicationCategory="MultimediaApplication"
        price="49"
        offerDescription="Annual Studio Pass with multi-track audio mixtape players and dynamic packaging"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Musicians & Labels"
        title="Physical Mixtapes & Merch Audio Drops."
        tagline="Turn physical stickers, cassette tapes, and vinyl inserts into playable multi-track audio experiences on scan."
        subtagline="Upload up to 10 tracks. Fans scan to stream with auto-advancing audio or download the whole package as a ZIP."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="LISTEN NOW"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Standard Music Links"
        comparisonSubtitle="Why indie labels and Bandcamp artists use QRBuddy for physical drops"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Artist Pass ($49/yr) 🎵"
      />
    </>
  );
}

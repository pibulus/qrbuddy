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
    icon: "💌",
    title: "RSVP, Maps & Schedule Links",
    desc:
      "Encode wedding websites, venue directions, or registry links into a permanent static QR or an editable link that updates as plans evolve.",
  },
  {
    icon: "📸",
    title: "Curated 10-Photo Slideshow Drops",
    desc:
      "Drop up to 10 photos onto the studio to mint a hosted 30-day slideshow page that guests can view and download on any phone browser.",
  },
  {
    icon: "🎶",
    title: "Reception Mixtape & Stationery SVG",
    desc:
      "Share a 10-track audio playlist (up to 5 MB per track) or export print-verified Vector SVGs for letterpress invitations and table cards.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static Invitation & RSVP QR Codes",
    free: "Unlimited; destination is encoded directly in the QR ($0)",
    supporter: "Included",
  },
  {
    feature: "Editable Event & Schedule Links",
    free: "5 permanent editable links included free",
    supporter: "100 editable links + custom Cover Pages",
  },
  {
    feature: "Photo Slideshow or Audio Playlist",
    free: "Up to 10 photos or tracks; audio files up to 5 MB each",
    supporter: "Same multi-item cap; single-file drops expand to 500 MB",
  },
  {
    feature: "White-Label Share Pages",
    free: "Includes subtle 'Made with QRBuddy' footer pill",
    supporter: "One-click white-label mode removes footer branding",
  },
  {
    feature: "File-Share Retention",
    free: "30 days",
    supporter: "30 days",
  },
  {
    feature: "QRBuddy Passport",
    free: "No purchase required",
    supporter: "~$32 USD (A$49) once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Do guests upload photos into a shared wedding album, or view a curated slideshow?",
    a: "QRBuddy slideshow shares are host-curated: drop up to 10 photos to create a swipeable gallery that guests open and download from a single scan. For receiving individual files into a pin-protected dropbox, use the File Locker tool in Customize.",
  },
  {
    q: "Can a wedding schedule or RSVP link change after invitations are printed?",
    a: "Yes. Toggle 'Editable after print + Stats' below the URL input before downloading the SVG or PNG. The printed QR points to an editable short link whose destination can be updated anytime before or after the wedding day.",
  },
  {
    q: "How long do hosted photo slideshows and audio playlists stay online?",
    a: "Hosted file shares, photo slideshows, and audio mixtapes stay active for 30 days before expiring on the daily cleanup schedule. Static and editable URL QR codes pointing to an external wedding website do not have a 30-day file limit.",
  },
  {
    q: "Can stationers and calligraphers export true Vector SVGs for foil and letterpress?",
    a: "Yes. Click 'SVG' right next to 'Save PNG' on the QR card to download clean vector paths that import directly into Adobe Illustrator, InDesign, Affinity, or Canva.",
  },
];

export default function WeddingsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/weddings";
  const title =
    "Wedding QR Code Generator for Invitations, RSVPs & Photo Drops | QRBuddy";
  const description =
    "Create pastel-punk and classic QR codes for wedding invitations, RSVP links, venue maps, 10-photo slideshows, and reception playlists. Free Vector SVG export with zero monthly fees.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/bodas"
        ogTitle="Wedding QR Codes for Invitations, RSVPs & Photo Slideshows — QRBuddy"
        ogImageAlt="Styled QR codes for wedding invitations and event details"
        themeColor="#BA5566"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Wedding QR Code Studio"
        applicationCategory="LifestyleApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 (~$32 USD) for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Weddings & Celebrations"
        title="Wedding QR Codes That Match the Stationery."
        tagline="Link invitations to RSVP pages, venue maps, curated 10-photo slideshows, or reception playlists in one scan."
        subtagline="Paste the wedding website URL or drop up to 10 photos/tracks below — export 3000px PNG or print-shop Vector SVG."
        defaultStyle="blush"
        defaultUrl="https://ourwedding.love/rsvp"
        defaultCaption="OUR DAY"
        featuresTitle="Designed for Invitations, Save-the-Dates & Table Cards"
        faqTitle="Wedding & Stationery QR Questions"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free Wedding Studio and the QRBuddy Passport"
        comparisonSubtitle="Static RSVP codes and 5 editable links are free; the Passport adds white-label share pages and 500 MB drops"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

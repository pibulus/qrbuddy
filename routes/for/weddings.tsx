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
    icon: "📍",
    title: "Make a photo slideshow QR",
    desc:
      "Share a QRBuddy slideshow with up to 10 photos. Owners can manage items on editable shares; guests can view or download them.",
  },
  {
    icon: "🔗",
    title: "Add a hosted playlist",
    desc:
      "Make a browser playlist from up to 10 audio tracks. The page can advance between tracks; file shares expire after 30 days.",
  },
  {
    icon: "🌸",
    title: "Share the event details",
    desc:
      "Make a QR for directions, the schedule, RSVP details, or your wedding website. Download a PNG or SVG for your stationery.",
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
    feature: "Photo slideshow or playlist",
    free: "Up to 10 photos or tracks; audio files up to 5 MB each",
    supporter: "Same limit; 500 MB applies to a single file",
  },
  {
    feature: "File-share expiry",
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
    q: "Can guests upload photos to a shared wedding album?",
    a: "QRBuddy doesn't provide a multi-guest upload album. You can create and manage a slideshow share of up to 10 photos, then give guests its link or QR to view or download the photos.",
  },
  {
    q: "Can I make a photo slideshow or music playlist?",
    a: "Yes. A share can contain up to 10 photos or up to 10 audio tracks. Audio files are limited to 5 MB each; large photos may be resized before sharing. Shares expire after 30 days.",
  },
  {
    q: "Can I change an event link after printing?",
    a: "Yes, if you create an editable QR and keep its private edit link. A static QR cannot be changed because its destination is encoded in the image.",
  },
  {
    q: "How long are shared photos and audio available?",
    a: "File shares expire after 30 days. Deletion runs on a daily cleanup schedule and may take longer; see the privacy notice for details.",
  },
];

export default function WeddingsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/weddings";
  const title = "Wedding QR Codes for Event Details and Media | QRBuddy";
  const description =
    "Create QR codes for wedding websites and event details, plus temporary QRBuddy photo slideshow and music playlist shares. Download PNG or SVG designs for stationery.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/bodas"
        ogTitle="Wedding QR Codes for Event Details — QRBuddy"
        ogImageAlt="Styled QR codes for wedding event details"
        themeColor="#BA5566"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Wedding QR Codes"
        applicationCategory="LifestyleApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Passport: A$49 for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Weddings & Celebrations"
        title="Wedding QR Codes for the Moments You Want to Share."
        tagline="Share your event details, a small photo slideshow, or a music playlist from one easy scan."
        subtagline="Photo and audio shares hold up to 10 items and expire after 30 days. Audio tracks are limited to 5 MB each; large photos may be resized. Guests view or download the share; they don't upload into it."
        defaultStyle="blush"
        defaultUrl="https://ourwedding.love"
        defaultCaption="OUR DAY"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free QRBuddy and the QRBuddy Passport"
        comparisonSubtitle="A clear look at file limits and share duration"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get QRBuddy Passport 🛂✨"
      />
    </>
  );
}

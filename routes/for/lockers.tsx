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
    icon: "📤",
    title: "Share a file by QR",
    desc:
      "Upload a file and share its page as a link or QR code. Recipients open it in their browser.",
  },
  {
    icon: "⏳",
    title: "Temporary file shares",
    desc:
      "QRBuddy file shares expire after 30 days. Reusable locker content is cleared after 30 days without activity.",
  },
  {
    icon: "📦",
    title: "Larger single-file uploads",
    desc:
      "Free uploads support files up to 50 MB. The Supporter Pass raises the limit for a single file to 500 MB.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Static QR codes",
    free: "Unlimited; destination is encoded in the QR",
    supporter: "Included",
  },
  {
    feature: "File uploads",
    free: "Up to 50 MB",
    supporter: "Single file up to 500 MB",
  },
  {
    feature: "File-share expiry",
    free: "30 days",
    supporter: "30 days",
  },
  {
    feature: "Supporter Pass",
    free: "No purchase required",
    supporter: "A$49 once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What file sizes are supported?",
    a: "Free uploads support files up to 50 MB. The Supporter Pass raises the limit to 500 MB for a single file. It does not add multi-file archive uploads.",
  },
  {
    q: "How long are files kept?",
    a: "File-share links expire after 30 days. Reusable locker content is cleared after 30 days without activity. Cleanup runs daily, so deletion may happen after that point; see the privacy notice for details.",
  },
  {
    q: "Do I need an account to receive a file?",
    a: "Recipients can open a share link in a browser. Anyone who has the link may be able to access the shared content, so share it only with the people you intend.",
  },
  {
    q: "What does the Supporter Pass include?",
    a: "It costs A$49 once and lasts 365 days, with no automatic renewal. It raises selected creation and upload limits. Abuse controls still apply.",
  },
];

export default function LockersPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/lockers";
  const title = "Temporary File Sharing by QR Code | QRBuddy";
  const description =
    "Share a file through a QRBuddy link or QR code. Free uploads support up to 50 MB; the Supporter Pass raises the single-file limit to 500 MB. Shares expire after 30 days.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/archivos"
        ogTitle="Temporary File Sharing by QR Code — QRBuddy"
        ogImageAlt="QRBuddy temporary file sharing by QR code"
        themeColor="#00A84F"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy File Sharing"
        applicationCategory="UtilitiesApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Supporter Pass: A$49 for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="File Sharing"
        title="A QR Code for a Temporary File Share."
        tagline="Upload a file, then share its link or QR code with the people who need it."
        subtagline="Shares expire after 30 days. Deletion runs on a daily cleanup schedule and may take longer; see the privacy notice."
        defaultStyle="terminal"
        defaultCaption="OPEN FILE"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free QRBuddy and the Supporter Pass"
        comparisonSubtitle="A clear look at file-size limits and retention"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Supporter Pass 🛡️"
      />
    </>
  );
}

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
    icon: "📜",
    title: "A QR for your menu link",
    desc:
      "Make a static QR for a menu PDF or website, or use an editable QR when you want to change its destination later.",
  },
  {
    icon: "🔗",
    title: "Choose the kind of link",
    desc:
      "Static QRs encode the destination directly. Editable QRs use QRBuddy's redirect service and can have scan or date limits.",
  },
  {
    icon: "🎨",
    title: "Make it fit your venue",
    desc:
      "Choose a gradient, add a logo, and export a PNG or SVG for table cards and window signs.",
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
    free: "Available within fair-use limits",
    supporter: "Higher creation limits",
  },
  {
    feature: "File sharing",
    free: "Free-tier size and use limits; shares expire after 30 days",
    supporter:
      "Single-file uploads up to 500 MB; shares still expire after 30 days",
  },
  {
    feature: "Supporter Pass",
    free: "No purchase required",
    supporter: "A$49 once for 365 days; no automatic renewal",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Can I update my menu link without reprinting the QR?",
    a: "Yes. Create an editable QR and keep its private edit link. You can change its destination while the code remains active. A static QR cannot be edited because its destination is encoded directly.",
  },
  {
    q: "What happens when the Supporter Pass expires?",
    a: "The pass ends after 365 days and does not renew automatically. Free features remain available. Editable QRs follow their own scan and expiry settings and depend on the QRBuddy redirect service.",
  },
  {
    q: "Does this work with online PDF menus and Square/Toast ordering?",
    a: "Absolutely. Point your QR directly to your PDF file on Google Drive, Dropbox, your website, or your Square/Toast online ordering page.",
  },
  {
    q: "Can I set scan or date limits?",
    a: "Editable QRs can have a scan limit or expiry date. The redirect service also applies abuse controls; QRBuddy does not promise unlimited scans.",
  },
];

export default function RestaurantMenusPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/for/menus";
  const title = "Restaurant & Cafe Menu QR Codes | QRBuddy";
  const description =
    "Create styled static or editable QR codes for restaurant menus, ordering pages, and websites. Free features are available; the Supporter Pass raises selected limits.";

  return (
    <>
      <VerticalLandingHead
        lang="en"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="es"
        altHref="https://qrbuddy.app/es/menus"
        ogTitle="Restaurant Menu QR Codes — QRBuddy"
        ogImageAlt="Styled QR codes for restaurant menus"
        themeColor="#2E7D32"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Restaurant Menus"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="QRBuddy Supporter Pass, A$49 for 365 days, one payment with no automatic renewal"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Hospitality & Dining"
        title="Menu QR Codes That Are Easy to Update."
        tagline="Create styled static codes or editable links for restaurant menus and ordering pages."
        subtagline="Keep the private edit link for an editable QR so you can change its destination without reprinting."
        defaultStyle="matcha"
        defaultUrl="https://your-cafe.com/menu.pdf"
        defaultCaption="MENU"
        valueCards={VALUE_CARDS}
        comparisonTitle="Free QRBuddy and the Supporter Pass"
        comparisonSubtitle="A clear look at included features and higher limits"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Get Supporter Pass ✨"
      />
    </>
  );
}

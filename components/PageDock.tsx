import FooterDock from "../islands/FooterDock.tsx";
import { PricingModal } from "../islands/PricingModal.tsx";
import { AboutModal } from "../islands/AboutModal.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import type { Locale } from "../utils/i18n.ts";

/** Bottom dock plus the modals it opens, for pages outside the studio. */
export default function PageDock({ lang = "en" }: { lang?: Locale }) {
  return (
    <>
      <FooterDock lang={lang} />
      <PricingModal lang={lang} />
      <AboutModal lang={lang} />
      <ToastManager />
    </>
  );
}

import { useSignal } from "@preact/signals";
import QRCanvas from "../islands/QRCanvas.tsx";
import SmartInput from "../islands/SmartInput.tsx";
import StyleSelector from "../islands/StyleSelector.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import ErrorBoundary from "../islands/ErrorBoundary.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import { AboutModal } from "../islands/AboutModal.tsx";
import { PricingModal } from "../islands/PricingModal.tsx";
import FooterDock from "../islands/FooterDock.tsx";
import DesignPreferencesSync from "../islands/DesignPreferencesSync.tsx";
import RotatingTitle from "../islands/RotatingTitle.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import type { Locale } from "../utils/i18n.ts";

export interface HomeStageProps {
  lang?: Locale;
}

export default function HomeStage({ lang = "en" }: HomeStageProps) {
  const url = useSignal("");
  const style = useSignal<keyof typeof QR_STYLES | "custom">("sunset");
  const customStyle = useSignal<QRStyle | null>(null);
  const triggerDownload = useSignal(false);
  const isDestructible = useSignal(false);
  const isDynamic = useSignal(false);
  const editUrl = useSignal("");
  const logoUrl = useSignal("");
  const maxDownloads = useSignal(UNLIMITED_SCANS);
  const isBucket = useSignal(false);
  const bucketUrl = useSignal("");
  const isModalOpen = useSignal(false);
  const frameConfig = useSignal<{ enabled: boolean; caption: string } | null>(
    null,
  );
  const pngSize = useSignal<1000 | 2000 | 3000>(1000);
  const isEs = lang === "es";

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
      >
        {isEs ? "Saltar al contenido principal" : "Skip to main content"}
      </a>

      <div class="min-h-[100dvh] flex flex-col items-center justify-start px-6 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 relative sm:bg-[length:200%_200%] sm:animate-gradient-flow sm:[animation-duration:16s]">
        <ToastManager />

        <EasterEggs url={url} style={style} />
        <DesignPreferencesSync
          style={style}
          customStyle={customStyle}
          logoUrl={logoUrl}
          frameConfig={frameConfig}
          pngSize={pngSize}
        />

        {/* Saved Codes - top-left counterweight opposite StyleSelector */}
        <div
          role="region"
          class="absolute top-7 left-4 sm:top-12 sm:left-6 z-50 animate-fade-in"
          aria-label={isEs ? "Códigos guardados" : "Saved codes"}
        >
          <ErrorBoundary>
            <StyleSelector
              variant="saved"
              isHidden={isModalOpen}
              lang={lang}
            />
          </ErrorBoundary>
        </div>

        {/* Style Selector - aligned with the title line */}
        <div
          role="region"
          class="absolute top-7 right-4 sm:top-12 sm:right-6 z-50 animate-fade-in"
          aria-label={isEs ? "Selector de estilos" : "Style selector"}
        >
          <ErrorBoundary>
            <StyleSelector
              style={style}
              customStyle={customStyle}
              isHidden={isModalOpen}
              lang={lang}
            />
          </ErrorBoundary>
        </div>

        <main
          id="main-content"
          class="w-full max-w-md space-y-6 sm:space-y-8 sm:my-auto"
        >
          {/* Hero Text */}
          <header class="text-center space-y-1.5 px-4 mb-2 animate-fade-in">
            <h1 class="text-4xl sm:text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <RotatingTitle lang={lang} />
          </header>

          {/* QR Code Display - FIRST */}
          <div class="flex justify-center animate-slide-up">
            <div class="w-full max-w-[336px] sm:max-w-[360px] transition-all duration-300">
              <ErrorBoundary>
                <QRCanvas
                  url={url}
                  style={style}
                  customStyle={customStyle}
                  triggerDownload={triggerDownload}
                  isDestructible={isDestructible}
                  isDynamic={isDynamic}
                  logoUrl={logoUrl}
                  maxDownloads={maxDownloads}
                  frameConfig={frameConfig}
                  pngSize={pngSize}
                  listenForExportEvents
                  lang={lang}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Smart Input - BELOW QR */}
          <div class="mx-auto w-full max-w-[336px] sm:max-w-[360px] !mt-6">
            <SmartInput
              url={url}
              isDestructible={isDestructible}
              isDynamic={isDynamic}
              editUrl={editUrl}
              maxDownloads={maxDownloads}
              isBucket={isBucket}
              bucketUrl={bucketUrl}
              logoUrl={logoUrl}
              qrStyle={style}
              customStyle={customStyle}
              pngSize={pngSize}
              frameConfig={frameConfig}
              onModalStateChange={(isOpen) => (isModalOpen.value = isOpen)}
              lang={lang}
            />
          </div>
        </main>

        <FooterDock lang={lang} />
      </div>

      {/* Modals */}
      <PricingModal lang={lang} />
      <AboutModal lang={lang} />
    </>
  );
}

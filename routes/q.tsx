import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import HomeStage from "../components/HomeStage.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";

/**
 * Legacy `?d=&s=` share links live on in the wild even though nothing here
 * builds one anymore. They open the real studio, pre-seeded. `URLSearchParams`
 * already percent-decodes; a second decode is kept for double-encoded links,
 * falling back to the raw value when a literal `%` makes it throw.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const VALID_STYLE_KEYS = new Set<string>(Object.keys(QR_STYLES));

/** `?s=` is untrusted: only a known preset may reach the renderer. */
function safeStyleKey(value: string | null): keyof typeof QR_STYLES {
  if (value && VALID_STYLE_KEYS.has(value)) {
    return value as keyof typeof QR_STYLES;
  }
  return "sunset";
}

export default function SharePage(props: PageProps) {
  const urlParams = new URL(props.url).searchParams;
  const sharedData = urlParams.get("d") || "";
  const decodedShared = sharedData ? safeDecode(sharedData) : "";
  const sharedStyle = safeStyleKey(urlParams.get("s"));

  return (
    <>
      <Head>
        <title>
          QRBuddy - {decodedShared || "Drop a link. Watch it bloom."}
        </title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
      </Head>
      <HomeStage
        lang="en"
        initialUrl={decodedShared}
        initialStyle={sharedStyle}
      />
    </>
  );
}

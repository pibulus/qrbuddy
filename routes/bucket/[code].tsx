import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import BucketQR from "../../islands/BucketQR.tsx";
import ErrorBoundary from "../../islands/ErrorBoundary.tsx";
import ToastManager from "../../islands/ToastManager.tsx";
import {
  fetchWithTimeout,
  getApiUrl,
  getAuthHeaders,
} from "../../utils/api.ts";
import type { BucketContentMetadata } from "../../types/bucket-types.ts";
import { type Locale, resolveRequestLocale } from "../../utils/i18n.ts";

interface BucketData {
  bucket_code: string;
  bucket_type: string;
  style: string;
  is_password_protected: boolean;
  is_reusable: boolean;
  delete_on_download: boolean;
  is_empty: boolean;
  unbranded?: boolean;
  content_type: string | null;
  content_metadata: BucketContentMetadata | null;
  last_filled_at: string | null;
  last_emptied_at: string | null;
  created_at: string;
}

interface BucketPageData {
  bucket: BucketData;
  bucketUrl: string;
  apiUrl: string;
  lang: Locale;
}

export const handler: Handlers<BucketPageData> = {
  async GET(req, ctx) {
    const { code } = ctx.params;
    const apiUrl = getApiUrl();
    const lang = resolveRequestLocale(req);

    // Fetch bucket status
    const ownerToken = ctx.url.searchParams.get("owner_token");
    // Same unencoded-path-segment-into-query-string gap as f/[code].tsx —
    // `code` can contain `&`/`#`/`=` once Fresh decodes the URL segment.
    const statusUrl = new URL(
      `${apiUrl}/get-bucket-status?bucket_code=${encodeURIComponent(code)}`,
    );
    if (ownerToken) {
      statusUrl.searchParams.set("owner_token", ownerToken);
    }

    const authHeaders = getAuthHeaders();

    // Network down, DNS blip, or a non-JSON body (proxy error page, empty
    // response) all throw here — this fetch+parse pair was the one bucket
    // route with no boundary. Every sibling route (note, f, r) already
    // wraps this same shape.
    try {
      const response = await fetchWithTimeout(statusUrl.toString(), {
        headers: authHeaders,
      });

      if (!response.ok) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      const statusResult = await response.json();

      if (!statusResult.success || !statusResult.bucket) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      const bucketUrl = `${
        Deno.env.get("APP_URL") ||
        (Deno.env.get("DENO_DEPLOYMENT_ID")
          ? "https://qrbuddy.app"
          : "http://localhost:8000")
      }/bucket/${code}`;

      return ctx.render({
        bucket: statusResult.bucket,
        bucketUrl,
        apiUrl,
        lang,
      });
    } catch (error) {
      console.error("[ROUTE:bucket] status fetch failed:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }
  },
};

export default function BucketPage({ data }: PageProps<BucketPageData>) {
  const { bucket, bucketUrl, apiUrl, lang } = data;
  const isSpanish = lang === "es";
  const stateEmoji = bucket.is_empty ? "🪣" : "💥";
  const stateText = isSpanish
    ? (bucket.is_empty ? "Vacío" : "Lleno")
    : (bucket.is_empty ? "Empty" : "Full");
  const lockerName = isSpanish ? "Casillero de archivos" : "File Locker";

  return (
    <>
      <Head>
        <title>
          {stateEmoji} {lockerName} ({stateText}) | QRBuddy
        </title>
        <meta
          name="description"
          content={isSpanish
            ? `Casillero de archivos persistente para pasar archivos rápido entre dispositivos. Estado actual: ${stateText.toLowerCase()}.`
            : `Your persistent file locker for quick transfers between devices. Currently ${stateText.toLowerCase()}.`}
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta
          property="og:title"
          content={`QRBuddy ${lockerName} - ${stateText}`}
        />
        <meta
          property="og:description"
          content={isSpanish
            ? (bucket.is_empty
              ? "Sube un archivo a este casillero de QRBuddy."
              : "Descarga el archivo que espera en este casillero de QRBuddy.")
            : (bucket.is_empty
              ? "Upload a file into this QRBuddy locker."
              : "Download the file waiting in this QRBuddy locker.")}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={bucketUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* PWA-ready */}
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="theme-color"
          content={bucket.is_empty ? "#FFFBF5" : "#FF6B9D"}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content={bucket.is_empty ? "default" : "black-translucent"}
        />
        <meta name="apple-mobile-web-app-title" content={lockerName} />
      </Head>

      <main class="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <ToastManager />
        <div class="w-full max-w-lg space-y-6">
          {/* Header */}
          <header class="text-center space-y-2">
            <h1 class="text-4xl font-black text-black tracking-tight">
              <span aria-hidden="true">{stateEmoji}</span> {lockerName}
            </h1>
            <p class="text-sm text-[#574c44]">
              {bucket.is_reusable
                ? (isSpanish ? "Persistente" : "Persistent")
                : (isSpanish ? "De un solo uso" : "One-time")} • {stateText}
            </p>
          </header>

          {/* Giant Interactive QR Code */}
          {
            /* Upload + download + payment path, and the app's largest island.
              It had no crash containment while the homepage QR preview had
              three. A throw here strands someone holding a locker code. */
          }
          <ErrorBoundary>
            <BucketQR
              bucketUrl={bucketUrl}
              bucketCode={bucket.bucket_code}
              style={bucket.style}
              isEmpty={bucket.is_empty}
              contentType={bucket.content_type}
              contentMetadata={bucket.content_metadata}
              isPasswordProtected={bucket.is_password_protected}
              isReusable={bucket.is_reusable}
              deleteOnDownload={bucket.delete_on_download}
              apiUrl={apiUrl}
              lang={lang}
            />
          </ErrorBoundary>

          {/* Info */}
          <div class="text-center space-y-2">
            <p class="text-xs text-[#6e6058]">
              {!bucket.is_reusable
                ? (isSpanish
                  ? "Este casillero se autodestruye tras una descarga"
                  : "This locker self-destructs after one download")
                : bucket.delete_on_download
                ? (isSpanish
                  ? "Cada descarga vacía el casillero, que queda esperando un archivo nuevo"
                  : "Each download clears the locker — it then waits for a new file")
                : (isSpanish
                  ? "Los archivos se quedan en este casillero hasta que el dueño los reemplace"
                  : "Files stay in this locker until the owner replaces them")}
            </p>
            {bucket.last_filled_at && (
              <p class="text-xs text-[#8a7d74]">
                {isSpanish ? "Último llenado" : "Last filled"}:{" "}
                {new Date(bucket.last_filled_at).toLocaleString(
                  isSpanish ? "es-MX" : undefined,
                )}
              </p>
            )}
          </div>

          {/* Footer — supporter perk: unbranded lockers skip the CTA */}
          {!bucket.unbranded && (
            <footer class="text-center pt-8">
              <a
                href="/"
                class="text-sm text-[#6e6058] hover:text-[#1e1714] transition-colors"
              >
                {isSpanish
                  ? "← Crea tu propio casillero en QRBuddy"
                  : "← Make your own locker at QRBuddy"}
              </a>
            </footer>
          )}
        </div>
      </main>
    </>
  );
}

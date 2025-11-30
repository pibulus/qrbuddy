import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import BucketQR from "../../islands/BucketQR.tsx";
import { getAuthHeaders, getSupabaseUrl } from "../../utils/api.ts";

interface BucketContentMetadata {
  filename?: string;
  size?: number;
  mimetype?: string;
  storage_path?: string;
  content?: string;
  [key: string]: unknown;
}

interface BucketData {
  bucket_code: string;
  bucket_type: string;
  style: string;
  is_password_protected: boolean;
  is_reusable: boolean;
  is_empty: boolean;
  content_type: string | null;
  content_metadata: BucketContentMetadata | null;
  last_filled_at: string | null;
  last_emptied_at: string | null;
  created_at: string;
}

interface BucketPageData {
  bucket: BucketData;
  bucketUrl: string;
  supabaseUrl: string;
}

export const handler: Handlers<BucketPageData> = {
  async GET(_req, ctx) {
    const { code } = ctx.params;
    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      return ctx.renderNotFound();
    }

    // Fetch bucket status
    const ownerToken = ctx.url.searchParams.get("owner_token");
    const statusUrl = new URL(
      `${supabaseUrl}/functions/v1/get-bucket-status?bucket_code=${code}`,
    );
    if (ownerToken) {
      statusUrl.searchParams.set("owner_token", ownerToken);
    }

    const authHeaders = getAuthHeaders();
    const response = await fetch(statusUrl.toString(), {
      headers: authHeaders,
    });

    if (!response.ok) {
      return ctx.renderNotFound();
    }

    const data = await response.json();

    if (!data.success) {
      return ctx.renderNotFound();
    }

    const bucketUrl = `${
      Deno.env.get("DENO_DEPLOYMENT_ID")
        ? "https://qrbuddy.app"
        : "http://localhost:8000"
    }/bucket/${code}`;

    return ctx.render({
      bucket: data.bucket,
      bucketUrl,
      supabaseUrl: supabaseUrl || "",
    });
  },
};

export default function BucketPage({ data }: PageProps<BucketPageData>) {
  const { bucket, bucketUrl, supabaseUrl } = data;
  const stateEmoji = bucket.is_empty ? "🪣" : "💥";
  const stateText = bucket.is_empty ? "Empty" : "Full";

  return (
    <>
      <Head>
        <title>
          {stateEmoji} File Bucket {bucket.is_empty ? "(Empty)" : "(Full)"}{" "}
          | QRBuddy
        </title>
        <meta
          name="description"
          content={`Your persistent file bucket for quick transfers between devices. Currently ${stateText.toLowerCase()}.`}
        />
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
        <meta name="apple-mobile-web-app-title" content="File Bucket" />
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1">
        <div class="w-full max-w-lg space-y-6">
          {/* Header */}
          <header class="text-center space-y-2">
            <h1 class="text-4xl font-black text-black tracking-tight">
              {stateEmoji} File Bucket
            </h1>
            <p class="text-sm text-gray-600">
              {bucket.is_reusable ? "Persistent" : "One-time"} • {stateText}
            </p>
          </header>

          {/* Giant Interactive QR Code */}
          <BucketQR
            bucketUrl={bucketUrl}
            bucketCode={bucket.bucket_code}
            style={bucket.style}
            isEmpty={bucket.is_empty}
            contentType={bucket.content_type}
            contentMetadata={bucket.content_metadata}
            isPasswordProtected={bucket.is_password_protected}
            isReusable={bucket.is_reusable}
            supabaseUrl={supabaseUrl}
          />

          {/* Info */}
          <div class="text-center space-y-2">
            <p class="text-xs text-gray-500">
              {bucket.is_reusable
                ? "This bucket refills after each download"
                : "This bucket self-destructs after download"}
            </p>
            {bucket.last_filled_at && (
              <p class="text-xs text-gray-400">
                Last filled: {new Date(bucket.last_filled_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Footer */}
          <footer class="text-center pt-8">
            <a
              href="/"
              class="text-sm text-gray-500 hover:text-pink-600 transition-colors"
            >
              ← Make your own bucket at QRBuddy
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}

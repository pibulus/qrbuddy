import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import {
  fetchWithTimeout,
  getApiUrl,
  getAuthHeaders,
} from "../../utils/api.ts";
import NoteCard from "../../islands/NoteCard.tsx";

interface NotePageData {
  code: string;
  content: string;
  openedLabel: string;
  unbranded: boolean;
}

export const handler: Handlers<NotePageData> = {
  async GET(_req, ctx) {
    const { code } = ctx.params;
    const apiUrl = getApiUrl();

    try {
      const response = await fetchWithTimeout(
        `${apiUrl}/download-from-bucket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ bucket_code: code }),
        },
      );

      if (!response.ok) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      const bucketResponse = await response.json() as {
        content_type?: string;
        content?: string;
        metadata?: { created_at?: string; [key: string]: unknown };
        unbranded?: boolean;
      };

      if (
        bucketResponse.content_type !== "text" ||
        typeof bucketResponse.content !== "string"
      ) {
        return new Response(null, {
          status: 302,
          headers: { Location: `/bucket/${code}` },
        });
      }

      return ctx.render({
        code,
        content: bucketResponse.content,
        openedLabel: new Date().toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        unbranded: bucketResponse.unbranded === true,
      });
    } catch (error) {
      console.error("Note page failed:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    }
  },
};

export default function NotePage({ data }: PageProps<NotePageData>) {
  const preview = data.content.length > 120
    ? `${data.content.slice(0, 117)}...`
    : data.content;

  return (
    <>
      <Head>
        <title>Message | QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={preview || "A QRBuddy text card."}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main class="min-h-screen bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 text-black flex items-center justify-center p-4 sm:p-6">
        <NoteCard
          code={data.code}
          content={data.content}
          openedLabel={data.openedLabel}
          unbranded={data.unbranded}
        />
      </main>
    </>
  );
}

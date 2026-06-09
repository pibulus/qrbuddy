import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getApiUrl, getAuthHeaders } from "../../utils/api.ts";

interface NotePageData {
  code: string;
  content: string;
  openedLabel: string;
}

export const handler: Handlers<NotePageData> = {
  async GET(_req, ctx) {
    const { code } = ctx.params;
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/download-from-bucket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ bucket_code: code }),
      });

      if (!response.ok) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      const data = await response.json() as {
        content_type?: string;
        content?: string;
        metadata?: { created_at?: string; [key: string]: unknown };
      };

      if (data.content_type !== "text" || typeof data.content !== "string") {
        return new Response(null, {
          status: 302,
          headers: { Location: `/bucket/${code}` },
        });
      }

      return ctx.render({
        code,
        content: data.content,
        openedLabel: new Date().toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
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
        <title>Text Card | QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={preview || "A QRBuddy text card."}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main class="min-h-screen bg-[#FFFBF5] text-black flex items-center justify-center px-4 py-10">
        <article class="w-full max-w-2xl">
          <header class="mb-4 flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-black uppercase tracking-wide text-pink-500">
                QRBuddy Text Card
              </p>
              <h1 class="text-3xl sm:text-4xl font-black leading-tight">
                Note
              </h1>
            </div>
            <p class="text-xs font-mono text-gray-500">
              #{data.code}
            </p>
          </header>

          <section class="border-4 border-black bg-white rounded-2xl shadow-chunky overflow-hidden">
            <div class="border-b-3 border-black bg-black px-4 py-3 flex items-center gap-2">
              <span class="h-3 w-3 rounded-full bg-[#FF6B9D]" />
              <span class="h-3 w-3 rounded-full bg-[#FFE66D]" />
              <span class="h-3 w-3 rounded-full bg-[#4ECDC4]" />
              <span class="ml-auto text-[11px] font-mono uppercase tracking-wide text-white/70">
                read-only
              </span>
            </div>
            <pre class="min-h-[220px] whitespace-pre-wrap break-words p-5 sm:p-7 font-mono text-base sm:text-lg leading-relaxed text-gray-900">{data.content}</pre>
          </section>

          <footer class="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-gray-500">
            <p class="font-mono">Opened {data.openedLabel}</p>
            <a
              href="/?utm_source=text_card&utm_medium=note"
              class="min-h-[44px] inline-flex items-center justify-center rounded-xl border-3 border-black bg-black px-4 py-2 font-black text-white shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 transition"
            >
              Make your own QR
            </a>
          </footer>
        </article>
      </main>
    </>
  );
}

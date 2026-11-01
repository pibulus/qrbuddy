import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import BatchStudio from "../islands/BatchStudio.tsx";
import { getSupabaseUrl } from "../utils/api.ts";

interface PageData {
  supabaseUrl?: string;
}

export const handler: Handlers<PageData> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

export default function BatchPage({ data }: PageProps<PageData>) {
  return (
    <>
      <Head>
        <title>Batch QR — QRBuddy</title>
        <meta
          name="description"
          content="Paste a spreadsheet, mint a print-ready sheet of editable QR codes."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <BatchStudio supabaseUrl={data.supabaseUrl} />
    </>
  );
}

import { Head } from "$fresh/runtime.ts";
import StatsPanel from "../islands/StatsPanel.tsx";

export default function StatsPage() {
  return (
    <>
      <Head>
        <title>Scan stats — QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main class="mx-auto max-w-3xl px-4 py-10 text-stone-900">
        <header class="mb-6">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
            Stats
          </p>
          <h1 class="mt-2 text-3xl font-black tracking-tight">
            What the shelf did.
          </h1>
          <p class="mt-2 text-sm text-stone-600">
            Every scan is counted on the server, without cookies and without
            storing an IP address.
          </p>
        </header>
        <StatsPanel />
      </main>
    </>
  );
}

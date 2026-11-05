import { Head } from "$fresh/runtime.ts";
import ApiKeysPanel from "../islands/ApiKeysPanel.tsx";

// The base, verified live 2026-11-05: POST /v1/api-keys mints, the key
// authorises, revoke returns 401. Each endpoint is its own static route file
// because dynamic segments in a new folder die on this platform.
const API_BASE = "https://qrbuddy.app/v1";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/create-dynamic-qr",
    what: "Mint an editable code. Returns short_code, redirect_url, edit_url.",
    body: `{
  "destination_url": "https://acme.test/line-4",
  "title": "Line 4 SOP",
  "max_scans": 5000
}`,
  },
  {
    method: "GET",
    path: "/get-dynamic-qr?token=<owner_token>",
    what: "Read a code's settings, its 7-day sparkline and device split.",
  },
  {
    method: "PATCH",
    path: "/update-dynamic-qr",
    what: "Re-point, rename, lock with a PIN, set expiry or scan caps.",
    body: `{
  "owner_token": "…",
  "destination_url": "https://acme.test/new-sop",
  "password": "4417"
}`,
  },
  {
    method: "GET",
    path: "/library",
    what: "Every code on the Passport behind the key, with quota usage.",
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre class="mt-3 overflow-x-auto rounded-xl border-2 border-stone-800 bg-stone-900 p-3 text-[11px] leading-relaxed text-amber-100">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiPage() {
  return (
    <>
      <Head>
        <title>QRBuddy API — make and manage codes from a script</title>
        <meta
          name="description"
          content="A small REST API for editable QR codes: create, re-point, lock, and read scan stats from your own tools."
        />
        <link rel="canonical" href="https://qrbuddy.app/developers" />
      </Head>

      <main class="mx-auto max-w-3xl px-4 py-12 text-stone-900">
        <header>
          <p class="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
            API
          </p>
          <h1 class="mt-2 text-4xl font-black tracking-tight">
            Your codes, from your own tools.
          </h1>
          <p class="mt-3 text-base leading-relaxed text-stone-600">
            Same engine that powers the app: editable destinations, scan caps,
            expiry, PIN locks. A key acts as your Passport, so nothing can be
            done through the API that you could not do by hand.
          </p>
        </header>

        <section class="mt-8 rounded-3xl border-2 border-stone-900 bg-yellow-50 p-5">
          <h2 class="text-sm font-black uppercase tracking-wider">
            Authentication
          </h2>
          <p class="mt-2 text-sm leading-relaxed">
            Send the key as <code class="rounded bg-white px-1">x-api-key</code>
            {" "}
            or as a bearer token. Keys are free to mint and are shown once.
          </p>
          <Code>
            {`curl ${API_BASE}/api-keys \\
  -H "x-api-key: qb_your_key_here"`}
          </Code>
          <p class="mt-2 break-all text-xs text-stone-500">
            Base URL: <code>{API_BASE}</code>
          </p>
        </section>

        <section class="mt-6 space-y-3">
          <h2 class="text-sm font-black uppercase tracking-wider">
            Endpoints
          </h2>
          {ENDPOINTS.map((endpoint) => (
            <article
              key={endpoint.path}
              class="rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md bg-stone-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-100">
                  {endpoint.method}
                </span>
                <code class="text-xs font-bold">{endpoint.path}</code>
              </div>
              <p class="mt-2 text-sm text-stone-600">{endpoint.what}</p>
              {endpoint.body && <Code>{endpoint.body}</Code>}
            </article>
          ))}
        </section>

        <section class="mt-6 rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
          <h2 class="text-sm font-black uppercase tracking-wider">
            A whole batch, in one script
          </h2>
          <p class="mt-2 text-sm text-stone-600">
            The same CSV the batch page takes, driven from a terminal.
          </p>
          <Code>
            {`while IFS=, read -r url title; do
  curl -s ${API_BASE}/create-dynamic-qr \\
    -H "x-api-key: qb_your_key_here" \\
    -H "content-type: application/json" \\
    -d "{\\"destination_url\\":\\"$url\\",\\"title\\":\\"$title\\"}"
done < codes.csv`}
          </Code>
        </section>

        <section class="mt-6 rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
          <h2 class="text-sm font-black uppercase tracking-wider">Rules</h2>
          <ul class="mt-2 space-y-1.5 text-sm text-stone-600">
            <li>Every key acts as one Passport: its codes, its allowance.</li>
            <li>Revoking is instant and permanent. A key cannot mint keys.</li>
            <li>
              Rate limited per IP; 429 carries <code>Retry-After</code>.
            </li>
            <li>
              Scans are counted server-side, never by the destination page.
            </li>
          </ul>
        </section>

        <section class="mt-6 rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-4">
          <h2 class="text-sm font-black uppercase tracking-wider">Errors</h2>
          <ul class="mt-2 space-y-1.5 text-sm text-stone-600">
            <li>
              <code>401</code> — no key, or a revoked one.
            </li>
            <li>
              <code>402</code> — allowance reached; the body names the limit.
            </li>
            <li>
              <code>404</code> — unknown endpoint or code.
            </li>
            <li>
              <code>413</code> — body over 256 KB.
            </li>
            <li>
              <code>429</code> — slow down; <code>Retry-After</code>{" "}
              says how long.
            </li>
            <li>
              <code>502</code> — the engine is restarting. Retry shortly.
            </li>
          </ul>
        </section>

        <div class="mt-8">
          <ApiKeysPanel />
        </div>
      </main>
    </>
  );
}

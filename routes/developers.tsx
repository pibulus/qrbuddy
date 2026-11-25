import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import ApiKeysPanel from "../islands/ApiKeysPanel.tsx";
import PageTopBar from "../components/PageTopBar.tsx";
import PageDock from "../components/PageDock.tsx";
import { type Locale, resolveRequestLocale } from "../utils/i18n.ts";

interface PageData {
  lang: Locale;
}

export const handler: Handlers<PageData> = {
  GET(req, ctx) {
    return ctx.render({ lang: resolveRequestLocale(req) });
  },
};

// The base, verified live 2026-11-05: POST /v1/api-keys mints, the key
// authorises, revoke returns 401. Each endpoint is its own static route file
// because dynamic segments in a new folder die on this platform.
const API_BASE = "https://qrbuddy.app/v1";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/create-dynamic-qr",
    what: "Mint an editable code. Returns short_code, redirect_url, edit_url.",
    whatEs:
      "Crea un código editable. Devuelve short_code, redirect_url, edit_url.",
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
    whatEs:
      "Lee los ajustes de un código, su gráfica de 7 días y el reparto por dispositivo.",
  },
  {
    method: "PATCH",
    path: "/update-dynamic-qr",
    what: "Re-point, rename, lock with a PIN, set expiry or scan caps.",
    whatEs:
      "Cambia el destino, renombra, bloquea con PIN, fija caducidad o límites de escaneo.",
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
    whatEs: "Todos los códigos del Pasaporte detrás de la clave, con su cupo.",
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre class="mt-3 overflow-x-auto rounded-xl border-2 border-[#1e1714] bg-[#1e1714] p-3 text-[11px] leading-relaxed text-amber-100">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiPage({ data }: PageProps<PageData>) {
  const lang = data.lang;
  const es = lang === "es";
  const t = (en: string, esText: string) => es ? esText : en;
  const canonical = es
    ? "https://qrbuddy.app/developers?lang=es"
    : "https://qrbuddy.app/developers";

  return (
    <>
      <Head>
        <title>
          {t(
            "QRBuddy API — make and manage codes from a script",
            "API de QRBuddy — crea y gestiona códigos desde un script",
          )}
        </title>
        <meta
          name="description"
          content={t(
            "A small REST API for editable QR codes: create, re-point, lock, and read scan stats from your own tools.",
            "Una API REST pequeña para códigos QR editables: crear, cambiar destino, bloquear y leer estadísticas de escaneo desde tus propias herramientas.",
          )}
        />
        <link rel="canonical" href={canonical} />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/developers"
        />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/developers?lang=es"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/developers"
        />
      </Head>

      <div
        lang={lang}
        class="min-h-[100dvh] flex flex-col justify-between bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1"
      >
        <main class="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 text-[#1e1714]">
          <PageTopBar class="mb-6" lang={lang} />
          <header>
            <p class="text-xs font-black uppercase tracking-[0.2em] text-[#574c44]">
              API
            </p>
            <h1 class="mt-2 text-4xl font-black tracking-tight">
              {t(
                "Your codes, from your own tools.",
                "Tus códigos, desde tus propias herramientas.",
              )}
            </h1>
            <p class="mt-3 text-base leading-relaxed text-[#574c44]">
              {t(
                "Same engine that powers the app: editable destinations, scan caps, expiry, PIN locks. A key acts as your Passport, so nothing can be done through the API that you could not do by hand.",
                "El mismo motor de la app: destinos editables, límites de escaneo, caducidad y bloqueo con PIN. Una clave actúa como tu Pasaporte, así que nada de lo que hace la API queda fuera de lo que puedes hacer a mano.",
              )}
            </p>
          </header>

          <section class="mt-8 rounded-3xl border-2 border-[#1e1714] bg-amber-50 p-5">
            <h2 class="text-sm font-black uppercase tracking-wider">
              {t("Authentication", "Autenticación")}
            </h2>
            <p class="mt-2 text-sm leading-relaxed">
              {t("Send the key as", "Envía la clave como")}{" "}
              <code class="rounded bg-white px-1">x-api-key</code> {t(
                "or as a bearer token. Keys are free to mint and are shown once.",
                "o como bearer token. Las claves son gratis y se muestran una sola vez.",
              )}
            </p>
            <Code>
              {`curl ${API_BASE}/api-keys \\
  -H "x-api-key: qb_your_key_here"`}
            </Code>
            <p class="mt-2 break-all text-xs text-[#6e6058]">
              {t("Base URL", "URL base")}: <code>{API_BASE}</code>
            </p>
          </section>

          <section class="mt-6 space-y-3">
            <h2 class="text-sm font-black uppercase tracking-wider">
              {t("Endpoints", "Endpoints")}
            </h2>
            {ENDPOINTS.map((endpoint) => (
              <article
                key={endpoint.path}
                class="rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-4"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-md bg-[#1e1714] px-2 py-0.5 font-mono text-[10px] font-black text-amber-100">
                    {endpoint.method}
                  </span>
                  <code class="text-xs font-bold">{endpoint.path}</code>
                </div>
                <p class="mt-2 text-sm text-[#574c44]">
                  {es ? endpoint.whatEs : endpoint.what}
                </p>
                {endpoint.body && <Code>{endpoint.body}</Code>}
              </article>
            ))}
          </section>

          <section class="mt-6 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-4">
            <h2 class="text-sm font-black uppercase tracking-wider">
              {t(
                "A whole batch, in one script",
                "Un lote entero, en un script",
              )}
            </h2>
            <p class="mt-2 text-sm text-[#574c44]">
              {t(
                "The same CSV the batch page takes, driven from a terminal.",
                "El mismo CSV que acepta la página de lotes, pero desde una terminal.",
              )}
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

          <section class="mt-6 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-4">
            <h2 class="text-sm font-black uppercase tracking-wider">
              {t("Rules", "Reglas")}
            </h2>
            <ul class="mt-2 space-y-1.5 text-sm text-[#574c44]">
              <li>
                {t(
                  "Every key acts as one Passport: its codes, its allowance.",
                  "Cada clave actúa como un Pasaporte: sus códigos, su cupo.",
                )}
              </li>
              <li>
                {t(
                  "Revoking is instant and permanent. A key cannot mint keys.",
                  "Revocar es instantáneo y permanente. Una clave no puede crear claves.",
                )}
              </li>
              <li>
                {t(
                  "Rate limited per IP; 429 carries",
                  "Límite de uso por IP; el 429 incluye",
                )} <code>Retry-After</code>.
              </li>
              <li>
                {t(
                  "Scans are counted server-side, never by the destination page.",
                  "Los escaneos se cuentan en el servidor, nunca en la página de destino.",
                )}
              </li>
            </ul>
          </section>

          <section class="mt-6 rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] p-4">
            <h2 class="text-sm font-black uppercase tracking-wider">
              {t("Errors", "Errores")}
            </h2>
            <ul class="mt-2 space-y-1.5 text-sm text-[#574c44]">
              <li>
                <code>401</code> — {t(
                  "no key, or a revoked one.",
                  "sin clave, o una revocada.",
                )}
              </li>
              <li>
                <code>402</code> — {t(
                  "allowance reached; the body names the limit.",
                  "cupo alcanzado; el cuerpo indica el límite.",
                )}
              </li>
              <li>
                <code>404</code> — {t(
                  "unknown endpoint or code.",
                  "endpoint o código desconocido.",
                )}
              </li>
              <li>
                <code>413</code> — {t(
                  "body over 256 KB.",
                  "cuerpo de más de 256 KB.",
                )}
              </li>
              <li>
                <code>429</code> — {t("slow down;", "más despacio;")}{" "}
                <code>Retry-After</code>{" "}
                {t("says how long.", "indica cuánto esperar.")}
              </li>
              <li>
                <code>502</code> — {t(
                  "the engine is restarting. Retry shortly.",
                  "el motor se está reiniciando. Reintenta en un momento.",
                )}
              </li>
            </ul>
          </section>

          <div class="mt-8">
            <ApiKeysPanel lang={lang} />
          </div>
        </main>
        <PageDock lang={lang} />
      </div>
    </>
  );
}

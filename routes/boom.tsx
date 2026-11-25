import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { type Locale, resolveRequestLocale } from "../utils/i18n.ts";

interface PageData {
  lang: Locale;
}

export const handler: Handlers<PageData> = {
  GET(req, ctx) {
    return ctx.render({ lang: resolveRequestLocale(req) });
  },
};

export default function Boom({ data }: PageProps<PageData>) {
  const es = data.lang === "es";

  return (
    <>
      <Head>
        <title>
          {es ? "Ya se abrió | QRBuddy" : "Already opened | QRBuddy"}
        </title>
        <meta
          name="description"
          content={es
            ? "Este código QR ya se autodestruyó"
            : "This QR code has already self-destructed"}
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://qrbuddy.app/boom" />
      </Head>

      <main
        lang={data.lang}
        class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1"
      >
        <div class="max-w-md w-full animate-pop-in">
          <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-8 sm:p-10 text-center shadow-chunky space-y-5">
            <span class="inline-flex items-center px-3 py-1 rounded-full border-2 border-[#1e1714] bg-amber-200 text-xs font-black uppercase tracking-wider text-[#1e1714]">
              {es ? "Enlace de un solo uso" : "One-time link"}
            </span>
            <h1 class="text-5xl sm:text-6xl font-black text-[#1e1714] tracking-tight">
              {es ? "Puf." : "Poof."}
            </h1>
            <div class="space-y-1.5 text-[#4a3f39] text-base font-bold leading-snug">
              <p>
                {es
                  ? "Alguien ya se lo llevó."
                  : "Someone already grabbed this one."}
              </p>
              <p class="text-[#574c44] font-semibold">
                {es ? "Se fue para siempre." : "It is gone for good."}
              </p>
            </div>
            <a href={es ? "/es" : "/"} class="qr-pitch-cta">
              <span>{es ? "Crear un QR" : "Make a QR"}</span>
            </a>
          </div>
          <p class="mt-6 text-center text-xs font-bold text-[#574c44]">
            {es ? "Hecho por Pablo" : "Made by Pablo"} • Melbourne
          </p>
        </div>
      </main>
    </>
  );
}

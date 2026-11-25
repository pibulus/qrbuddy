import { Head } from "$fresh/runtime.ts";
import type { Handlers, PageProps } from "$fresh/server.ts";
import EditQRForm from "../islands/EditQRForm.tsx";
import PageTopBar from "../components/PageTopBar.tsx";
import PageDock from "../components/PageDock.tsx";
import { type Locale, resolveRequestLocale } from "../utils/i18n.ts";

export const handler: Handlers<{ lang: Locale }> = {
  GET(req, ctx) {
    return ctx.render({ lang: resolveRequestLocale(req) });
  },
};

export default function EditPage({ data }: PageProps<{ lang: Locale }>) {
  const lang: Locale = data?.lang ?? "en";
  const es = lang === "es";
  return (
    <>
      <Head>
        <title>
          {es ? "Editar QR dinámico - QRBuddy" : "Edit Dynamic QR - QRBuddy"}
        </title>
        <meta
          name="description"
          content={es
            ? "Edita el destino y los ajustes de tu código QR dinámico"
            : "Edit your dynamic QR code destination and settings"}
        />
        <meta name="robots" content="noindex" />
      </Head>

      <div class="min-h-[100dvh] w-full overflow-x-hidden flex flex-col items-center justify-between px-4 sm:px-6 pt-8 pb-6 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <main class="w-full max-w-xl space-y-6">
          <PageTopBar
            lang={lang}
            rightSlot={
              <a
                href={es ? "/es?library=1" : "/?library=1"}
                class="inline-flex min-h-[38px] items-center gap-1 rounded-full border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] px-3.5 py-1.5 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] transition-[transform,box-shadow,background-color] duration-[70ms] hover:-translate-y-px hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none"
              >
                <span>{es ? "Guardados ↗" : "Saved ↗"}</span>
              </a>
            }
          />

          {/* Header */}
          <header class="text-center space-y-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-amber-200 text-xs font-black uppercase tracking-wider text-black shadow-chunky">
              <span>👑</span>
              <span>{es ? "QR editable" : "Editable QR"}</span>
            </span>
            <h1 class="text-3xl sm:text-5xl font-black text-black tracking-tight">
              {es ? "Editar QR dinámico" : "Edit Dynamic QR"}
            </h1>
            <p class="text-sm sm:text-base font-bold text-[#4a3f39]">
              {es
                ? "Actualiza el destino, la ruta y el sticker de tu código QR"
                : "Update your QR code destination, routing, and sticker"}
            </p>
          </header>

          {/* Edit Form Island */}
          <EditQRForm lang={lang} />
        </main>

        <PageDock lang={lang} />
      </div>
    </>
  );
}

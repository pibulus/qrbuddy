import { Head } from "$fresh/runtime.ts";
import { UnknownPageProps } from "$fresh/server.ts";

export default function Error404({ url }: UnknownPageProps) {
  const es = url.pathname === "/es" || url.pathname.startsWith("/es/");

  return (
    <>
      <Head>
        <title>
          {es
            ? "404 - Perdido entre píxeles | QRBuddy"
            : "404 - Lost in the pixels | QRBuddy"}
        </title>
      </Head>
      <main
        lang={es ? "es" : "en"}
        class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1"
      >
        <div class="max-w-md w-full text-center">
          <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-10 shadow-chunky animate-pop-in">
            <div class="text-6xl mb-4" aria-hidden="true">
              📱
            </div>
            <h1 class="text-5xl font-black text-[#1e1714] mb-3">
              404
            </h1>
            <p class="text-[#6e6058] text-lg mb-6">
              {es
                ? "Este código QR no lleva a ningún lado. Todavía."
                : "This QR code leads nowhere. Yet."}
            </p>
            <a href={es ? "/es" : "/"} class="qr-pitch-cta">
              {es ? "Crea uno que sí" : "Make one that does"}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

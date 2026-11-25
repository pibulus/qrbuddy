import { Head } from "$fresh/runtime.ts";
import { Handlers } from "$fresh/server.ts";
import { ApiPageBody } from "../developers.tsx";

export const handler: Handlers = {
  GET(_req, ctx) {
    return ctx.render({});
  },
};

export default function DevelopersEsPage() {
  return (
    <>
      <Head>
        <title>
          API de QRBuddy — crea y gestiona códigos desde un script
        </title>
        <meta
          name="description"
          content="Una API REST pequeña para códigos QR editables: crear, cambiar destino, bloquear y leer estadísticas de escaneo desde tus propias herramientas."
        />
        <link rel="canonical" href="https://qrbuddy.app/es/developers" />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/developers"
        />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/es/developers"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/developers"
        />
      </Head>

      <ApiPageBody lang="es" />
    </>
  );
}

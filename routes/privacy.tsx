import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";

interface PageData {
  lang: "en" | "es";
}

export const handler: Handlers<PageData> = {
  GET(req, ctx) {
    const lang = new URL(req.url).searchParams.get("lang") === "es"
      ? "es"
      : "en";
    return ctx.render({ lang });
  },
};

export default function PrivacyPage({ data }: PageProps<PageData>) {
  const es = data.lang === "es";

  return (
    <main
      lang={data.lang}
      class="min-h-screen bg-qr-cream text-black px-4 py-10 sm:py-16"
    >
      <Head>
        <title>
          {es ? "Aviso de privacidad | QRBuddy" : "Privacy notice | QRBuddy"}
        </title>
        <meta
          name="description"
          content={es
            ? "Qué información procesa QRBuddy, para qué la usamos y cuánto tiempo la conservamos."
            : "What information QRBuddy processes, why we use it, and how long we keep it."}
        />
        <link
          rel="canonical"
          href={es
            ? "https://qrbuddy.app/privacy?lang=es"
            : "https://qrbuddy.app/privacy"}
        />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/privacy"
        />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/privacy?lang=es"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/privacy"
        />
      </Head>

      <article class="max-w-3xl mx-auto space-y-8">
        <header class="space-y-3">
          <a href={es ? "/es" : "/"} class="font-bold underline">
            {es ? "← QRBuddy" : "← QRBuddy"}
          </a>
          <h1 class="text-3xl sm:text-5xl font-black tracking-tight">
            {es ? "Aviso de privacidad" : "Privacy notice"}
          </h1>
          <p class="font-medium text-gray-700">
            {es
              ? "Actualizado el 13 de octubre de 2026."
              : "Updated 13 October 2026."}
          </p>
          <p>
            {es
              ? "Este aviso explica la información que procesa QRBuddy al crear códigos, editar enlaces, compartir archivos y comprar un Pasaporte QRBuddy (antes Pase Supporter)."
              : "This notice explains the information QRBuddy processes when you make codes, edit links, share files, and buy a QRBuddy Passport (formerly Supporter Pass)."}
          </p>
        </header>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Información que procesamos" : "Information we process"}
          </h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              {es
                ? "El texto o destino que introduces se usa para generar el QR en tu navegador. Los QR estáticos contienen el destino; escanearlos no pasa por la redirección de QRBuddy."
                : "Text or destinations you enter are used to generate a QR in your browser. Static QRs contain their destination; scanning one does not use QRBuddy's redirect service."}
            </li>
            <li>
              {es
                ? "Si creas un QR editable, QRBuddy guarda su destino y configuración. Cuando alguien lo escanea, registramos la hora, tipo de dispositivo, sistema operativo, navegador y país o ciudad aproximados cuando están disponibles."
                : "If you create an editable QR, QRBuddy stores its destination and settings. When someone scans it, we record the time, device type, operating system, browser, and approximate country or city when available."}
            </li>
            <li>
              {es
                ? "En las páginas de archivos compartidos registramos actividad agregada, como visitas, elementos vistos, descargas, dispositivo, idioma, referente y zona aproximada. Puede usarse un identificador diario seudónimo para estimar visitas únicas. La dirección IP se usa al recibir la solicitud, pero no se guarda en el registro de actividad compartida."
                : "On shared-file pages, we record aggregated activity such as views, items viewed, downloads, device, language, referrer, and approximate area. A daily pseudonymous identifier may be used to estimate unique visits. The request IP is used when the request arrives but is not written to the share-activity record."}
            </li>
            <li>
              {es
                ? "Al crear un archivo compartido o un baúl, QRBuddy guarda la IP de origen en el registro correspondiente para aplicar límites de creación y prevenir abuso. Ese dato permanece mientras se conserva el registro; la limpieza puede tardar más, como se describe abajo."
                : "When you create a file share or locker, QRBuddy stores the originating IP in its record to apply creation limits and prevent abuse. That data remains while the record is kept; cleanup may take longer as described below."}
            </li>
            <li>
              {es
                ? "Si subes archivos, QRBuddy procesa el archivo, su nombre y metadatos técnicos para crear el enlace compartido. Quien tenga el enlace puede acceder al contenido, salvo que una función específica añada una protección adicional."
                : "If you upload files, QRBuddy processes the file, its name, and technical metadata to create the share link. Anyone with the link may access its content unless a specific feature adds an access control."}
            </li>
            <li>
              {es
                ? "Para operar el sitio usamos Umami y un beacon de visitas de QRBuddy. Los eventos de creación de QR pueden incluir el tipo y estilo del código y si se eligió un logo, un QR editable o un enlace con límite."
                : "We use Umami and a QRBuddy visit beacon to operate the site. QR-creation events may include the QR type and style and whether a logo, editable QR, or limited-use link was selected."}
            </li>
            <li>
              {es
                ? "Las estadísticas de visitas compartidas pueden incluir una zona geográfica aproximada. QRBuddy puede consultar Open-Meteo con esa zona para mostrar contexto del tiempo; no se envía el contenido del archivo."
                : "Shared-page statistics may include an approximate geographic area. QRBuddy may query Open-Meteo for weather context using that area; file contents are not sent."}
            </li>
            <li>
              {es
                ? "Square procesa el pago con tarjeta. QRBuddy recibe identificadores de pedido y pago, importe, moneda y el registro del pase; la aplicación no almacena números de tarjeta."
                : "Square processes card payments. QRBuddy receives order and payment identifiers, amount, currency, and the pass record; the app does not store card numbers."}
            </li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Almacenamiento y recuperación" : "Storage and recovery"}
          </h2>
          <p>
            {es
              ? "El historial, el Pasaporte QRBuddy (antes Pase Supporter) y los enlaces de administración se guardan en el almacenamiento local del navegador. Los enlaces de administración se cifran con Web Crypto cuando está disponible; si no, QRBuddy puede guardarlos sin cifrar en ese dispositivo. No hay una cuenta que permita recuperar automáticamente un pasaporte o enlace perdido."
              : "History, the QRBuddy Passport (formerly Supporter Pass), and management links are stored in your browser's local storage. Management links are encrypted with Web Crypto when available; otherwise QRBuddy may store them unencrypted on that device. There is no account for automatic recovery of a lost passport or management link."}
          </p>
          <p>
            {es
              ? "Puedes crear una copia cifrada desde Historial → Sincronizar dispositivos. Guarda tu clave de Pasaporte QRBuddy en un lugar privado y conserva la frase de sincronización: sin una copia no podemos garantizar su recuperación."
              : "You can make an encrypted backup from History → Sync Devices. Keep your QRBuddy Passport key and sync phrase somewhere private; without a backup we cannot guarantee recovery."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Conservación y eliminación" : "Retention and deletion"}
          </h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              {es
                ? "Los enlaces para compartir archivos vencen después de 30 días. El contenido de los baúles reutilizables se limpia tras 30 días sin actividad."
                : "File-share links expire after 30 days. Reusable locker content is cleared after 30 days without activity."}
            </li>
            <li>
              {es
                ? "La limpieza se ejecuta a diario. Algunos archivos esperan una hora antes de borrarse y los fallos de borrado se vuelven a intentar; por eso, la eliminación física puede tardar más que el vencimiento del enlace."
                : "Cleanup runs daily. Some files wait an additional hour before deletion, and failed deletions are retried; physical deletion can therefore take longer than link expiry."}
            </li>
            <li>
              {es
                ? "Los registros detallados de escaneos de QR editables y el detalle diario de actividad de enlaces se conservan hasta 90 días. Algunos totales agregados pueden permanecer asociados al enlace mientras exista."
                : "Detailed editable-QR scan records and day-by-day share activity are kept for up to 90 days. Some aggregate totals may remain associated with a share while it exists."}
            </li>
            <li>
              {es
                ? "Deno Deploy, Supabase, Cloudflare y otros proveedores pueden procesar datos técnicos de solicitudes en sus sistemas. Sus propios registros operativos siguen sus políticas y plazos."
                : "Deno Deploy, Supabase, Cloudflare, and other providers may process technical request data in their systems. Their operational logs follow their own policies and retention periods."}
            </li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Proveedores" : "Service providers"}
          </h2>
          <p>
            {es
              ? "QRBuddy usa Deno Deploy para alojar el sitio; Supabase para la base de datos, funciones y archivos habituales; Cloudflare R2 para algunos archivos grandes; Square para pagos; Umami y el beacon de QRBuddy para medición de uso; y Open-Meteo para el contexto meteorológico aproximado de algunas visitas compartidas."
              : "QRBuddy uses Deno Deploy to host the site; Supabase for the database, functions, and standard file storage; Cloudflare R2 for some large files; Square for payments; Umami and QRBuddy's beacon for usage measurement; and Open-Meteo for approximate weather context on some shared-page visits."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">{es ? "Contacto" : "Contact"}</h2>
          <p>
            {es
              ? "Para preguntas sobre privacidad, escribe a "
              : "For privacy questions, email "}
            <a class="underline font-bold" href="mailto:pablo@qrbuddy.app">
              pablo@qrbuddy.app
            </a>.
          </p>
        </section>

        <nav class="flex gap-5 border-t-2 border-black/15 pt-5 font-bold">
          <a class="underline" href={es ? "/terms?lang=es" : "/terms"}>
            {es ? "Condiciones" : "Terms"}
          </a>
          <a class="underline" href={es ? "/es" : "/"}>
            {es ? "Inicio" : "Home"}
          </a>
        </nav>
      </article>
    </main>
  );
}

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

export default function TermsPage({ data }: PageProps<PageData>) {
  const es = data.lang === "es";

  return (
    <main
      lang={data.lang}
      class="min-h-screen bg-qr-cream text-black px-4 py-10 sm:py-16"
    >
      <Head>
        <title>
          {es ? "Condiciones de uso | QRBuddy" : "Terms of use | QRBuddy"}
        </title>
        <meta
          name="description"
          content={es
            ? "Condiciones del generador de QR, enlaces editables, archivos compartidos y Pasaporte QRBuddy (antes Pase Supporter)."
            : "Terms for QRBuddy's QR generator, editable links, file shares, and QRBuddy Passport (formerly Supporter Pass)."}
        />
        <link
          rel="canonical"
          href={es
            ? "https://qrbuddy.app/terms?lang=es"
            : "https://qrbuddy.app/terms"}
        />
        <link rel="alternate" hrefLang="en" href="https://qrbuddy.app/terms" />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/terms?lang=es"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/terms"
        />
      </Head>

      <article class="max-w-3xl mx-auto space-y-8">
        <header class="space-y-3">
          <a href={es ? "/es" : "/"} class="font-bold underline">← QRBuddy</a>
          <h1 class="text-3xl sm:text-5xl font-black tracking-tight">
            {es ? "Condiciones de uso" : "Terms of use"}
          </h1>
          <p class="font-medium text-gray-700">
            {es
              ? "Actualizado el 13 de octubre de 2026."
              : "Updated 13 October 2026."}
          </p>
          <p>
            {es
              ? "Al usar QRBuddy, aceptas estas condiciones y el aviso de privacidad."
              : "By using QRBuddy, you agree to these terms and the privacy notice."}
          </p>
        </header>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Códigos QR y enlaces" : "QR codes and links"}
          </h2>
          <p>
            {es
              ? "Los códigos estáticos contienen el destino directamente. Los QR editables usan la redirección de QRBuddy; su funcionamiento depende de que el servicio esté disponible y de sus límites o vencimiento configurados. Conserva el enlace privado de edición."
              : "Static QR codes contain their destination directly. Editable QRs use QRBuddy's redirect service; they depend on that service's availability and their configured limits or expiry. Keep the private edit link."}
          </p>
          <p>
            {es
              ? "Eres responsable del contenido y destino que compartes y de contar con permiso para usarlos. No compartas información sensible mediante un enlace público si no quieres que las personas con el enlace puedan verla."
              : "You are responsible for the content and destination you share and for having permission to use them. Do not share sensitive information through a public link if you do not want people with that link to see it."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es ? "Archivos y baúles" : "Files and lockers"}
          </h2>
          <p>
            {es
              ? "Las subidas gratuitas permiten un archivo de hasta 50 MB. Un Pasaporte QRBuddy (antes Pase Supporter) vigente permite subir un archivo individual de hasta 500 MB. Las presentaciones de fotos y playlists pueden tener hasta 10 elementos; cada audio admite hasta 5 MB y las fotos grandes pueden reducirse antes de compartirlas."
              : "Free uploads allow a single file up to 50 MB. An active QRBuddy Passport (formerly Supporter Pass) allows a single file up to 500 MB. Photo slideshows and playlists can contain up to 10 items; each audio file can be up to 5 MB, and large photos may be resized before sharing."}
          </p>
          <p>
            {es
              ? "Los enlaces para compartir archivos vencen después de 30 días. El contenido de un baúl reutilizable se limpia tras 30 días sin actividad. La limpieza se ejecuta a diario, puede tardar más y los fallos se vuelven a intentar."
              : "File-share links expire after 30 days. Reusable locker content is cleared after 30 days without activity. Cleanup runs daily, may take longer, and failed deletions are retried."}
          </p>
          <p>
            {es
              ? "Los enlaces de archivo permiten que quien los tenga acceda al contenido, con las protecciones adicionales que ofrezca la función elegida. Tú eliges a quién compartir el enlace."
              : "File links let people who have them access the content, subject to any additional protections offered by the feature you choose. You choose with whom to share each link."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es
              ? "Pasaporte QRBuddy (antes Pase Supporter)"
              : "QRBuddy Passport (formerly Supporter Pass)"}
          </h2>
          <p>
            {es
              ? "El Pasaporte QRBuddy (antes Pase Supporter) cuesta ~$32 USD (A$49) en un solo pago, dura 365 días desde su emisión y no se renueva automáticamente. Amplía algunos límites de creación y subida; siguen aplicando los controles de uso del servicio."
              : "The QRBuddy Passport (formerly Supporter Pass) costs ~$32 USD (A$49) as a one-time payment, lasts 365 days from issue, and does not renew automatically. It raises selected creation and upload limits; service use controls still apply."}
          </p>
          <p>
            {es
              ? "Square procesa el pago. El pase se activa cuando QRBuddy recibe la confirmación del proveedor. Si la confirmación tarda, vuelve a comprobar el estado desde el dispositivo usado para comprar o escribe a soporte con el recibo."
              : "Square processes payment. The pass activates after QRBuddy receives provider confirmation. If confirmation is delayed, check again from the device used to buy it or contact support with your receipt."}
          </p>
          <p>
            {es
              ? "Puedes solicitar un reembolso dentro de los 30 días posteriores a la compra escribiendo a pablo@qrbuddy.app. El reembolso no invalida automáticamente un pase ya emitido; ese pase puede seguir funcionando hasta la fecha de vencimiento que muestra el navegador."
              : "You may request a refund within 30 days of purchase by emailing pablo@qrbuddy.app. A refund does not automatically invalidate an already issued pass; that pass may continue to work until the expiry date shown in the browser."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">
            {es
              ? "Pases, enlaces de edición y copias"
              : "Passes, edit links, and backups"}
          </h2>
          <p>
            {es
              ? "QRBuddy guarda pases y enlaces de administración en el navegador de este dispositivo. No hay recuperación automática por cuenta o correo. Copia el pase y crea una copia cifrada desde Historial → Sincronizar dispositivos antes de borrar los datos del navegador. Guarda tu frase de sincronización en privado."
              : "QRBuddy stores passes and management links in this device's browser. There is no automatic account or email recovery. Copy the pass and make an encrypted backup from History → Sync Devices before clearing browser data. Keep your sync phrase private."}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-black">{es ? "Contacto" : "Contact"}</h2>
          <p>
            {es
              ? "Para preguntas sobre estas condiciones, escribe a "
              : "For questions about these terms, email "}
            <a class="underline font-bold" href="mailto:pablo@qrbuddy.app">
              pablo@qrbuddy.app
            </a>.
          </p>
        </section>

        <nav class="flex gap-5 border-t-2 border-black/15 pt-5 font-bold">
          <a class="underline" href={es ? "/privacy?lang=es" : "/privacy"}>
            {es ? "Aviso de privacidad" : "Privacy notice"}
          </a>
          <a class="underline" href={es ? "/es" : "/"}>
            {es ? "Inicio" : "Home"}
          </a>
        </nav>
      </article>
    </main>
  );
}

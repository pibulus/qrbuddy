import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../components/VerticalLandingHead.tsx";
import { getSupabaseUrl } from "../../utils/api.ts";

interface PageData {
  supabaseUrl?: string;
}

export const handler: Handlers<PageData> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

const VALUE_CARDS: ValueCard[] = [
  {
    icon: "💣",
    title: "Autodestrucción al Descargar",
    desc:
      "Configura tu buzón en modo 'Quemado en 1 Escaneo'. Una vez que el destinatario descarga el archivo, la información se borra permanentemente del servidor sin dejar rastro.",
  },
  {
    icon: "🔐",
    title: "Cifrado de Extremo a Extremo",
    desc:
      "Archivos protegidos en tránsito con claves criptográficas. Contraseñas opcionales de 4 palabras para mantener tus entregas totalmente confidenciales.",
  },
  {
    icon: "📁",
    title: "Transferencias de Archivos Grandes",
    desc:
      "Comparte entregables de diseño confidenciales, firmware, fotos privadas o paquetes de contratos de hasta 500MB sin registros corporativos.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Retención de Datos",
    corporate:
      "Almacenados indefinidamente en servidores corporativos para entrenar IA",
    qrbuddy: "Autodestrucción automática tras 1 escaneo, 1 hora o 24 horas",
  },
  {
    feature: "Registro de Cuentas",
    corporate:
      "Obliga a registrarse con correo electrónico, teléfono y verificación 2FA",
    qrbuddy: "Cero cuentas — escaneas el código, descargas el archivo y listo",
  },
  {
    feature: "Vigilancia y Registros",
    corporate:
      "Rastrea dirección IP, huellas del dispositivo y geolocalización",
    qrbuddy:
      "Cero rastreo, cero analíticas en buzones, cero registros de acceso",
  },
  {
    feature: "Seguridad de Descarga",
    corporate: "Enlaces públicos indexados por motores de búsqueda",
    qrbuddy: "Buzones cifrados con límite estricto de descargas",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cómo funciona la autodestrucción de archivos?",
    a: "Arrastras tus archivos a QRBuddy y activas la opción 'Destructible'. Se genera un código QR. En cuanto el destinatario escanea y descarga el archivo, este se elimina definitivamente del servidor.",
  },
  {
    q: "¿Quién puede acceder a mis archivos?",
    a: "Únicamente quien posea el código QR exacto (o el token de destino). QRBuddy no indexa ni cataloga los buzones de archivos.",
  },
  {
    q: "¿Cuál es el tamaño máximo de archivo?",
    a: "Los usuarios gratuitos pueden transferir archivos de hasta 50MB. Con el Pase de Estudio puedes compartir archivos individuales o carpetas comprimidas de hasta 500MB.",
  },
  {
    q: "¿Puedo proteger mi buzón con contraseña?",
    a: "Sí, puedes habilitar protección por clave de paso para que quien escanee deba ingresar la contraseña o frase de 4 palabras antes de iniciar la descarga.",
  },
];

export default function ArchivosEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/archivos";
  const title =
    "Envío Efímero de Archivos y Códigos QR Destructibles — QRBuddy";
  const description =
    "Comparte archivos privados de hasta 500MB con códigos QR que se autodestruyen. Eliminación tras 1 escaneo o 24 horas. Cero registros, cifrado y sin registrar cuentas.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/lockers"
        ogImageAlt="QRBuddy - Envío efímero de archivos y códigos QR destructibles"
        themeColor="#00FF41"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Buzones Efímeros"
        applicationCategory="SecurityApplication"
        price="49"
        offerDescription="Pase de Estudio Anual con buzones efímeros cifrados de hasta 500MB"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Privacidad y Transferencias"
        title="Envío Efímero de Archivos y Códigos QR Destructibles."
        tagline="Comparte documentos confidenciales, fotos y paquetes de archivos de hasta 500MB que se autodestruyen."
        subtagline="Borrado automático tras 1 escaneo o 24 horas. Transferencias cifradas, cero rastreadores, sin registrar cuentas."
        defaultStyle="terminal"
        defaultCaption="SECRETO"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="¿Por Qué Elegir QRBuddy para Transferencias Seguras?"
        faqTitle="Preguntas Frecuentes sobre Archivos Efímeros"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Gigantes de Almacenamiento en la Nube"
        comparisonSubtitle="Por qué periodistas y defensores de la privacidad usan buzones efímeros"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase de Privacidad ($49/año) 🛡️"
      />
    </>
  );
}

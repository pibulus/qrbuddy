import { useSignal } from "@preact/signals";
import { AboutLink, AboutModal } from "./AboutModal.tsx";
import { KofiButton, KofiModal } from "./KofiModal.tsx";
import { PricingLink, PricingModal } from "./PricingModal.tsx";

interface QrPrintGuideProps {
  isSpanish?: boolean;
}

interface ScenarioPreset {
  label: string;
  distanceMeters: number;
  icon: string;
  context: string;
}

export default function QrPrintGuideIsland(
  { isSpanish = false }: QrPrintGuideProps,
) {
  const distance = useSignal<number>(1.0); // meters
  const unit = useSignal<"metric" | "imperial">("metric");
  const selectedPreset = useSignal<string>("poster");

  const presets: ScenarioPreset[] = isSpanish
    ? [
      {
        label: "Menú de Mesa / Portavasos",
        distanceMeters: 0.5,
        icon: "📜",
        context:
          "Mesas de restaurante, barras de café, tarjetas de presentación",
      },
      {
        label: "Póster en Pared / Mostrador",
        distanceMeters: 1.2,
        icon: "🖼️",
        context: "Entradas de tiendas, pizarrones, displays de mostrador",
      },
      {
        label: "Calcomanía en Vitrina / Puerta",
        distanceMeters: 2.5,
        icon: "🏬",
        context:
          "Vitrinas exteriores, puertas de vidrio, viniles para peatones",
      },
      {
        label: "Lona Exterior / Espectacular",
        distanceMeters: 8.0,
        icon: "🏢",
        context: "Vallas publicitarias, muros exteriores, lonas para autos",
      },
    ]
    : [
      {
        label: "Table Menu / Beer Coaster",
        distanceMeters: 0.5,
        icon: "📜",
        context: "Restaurant tables, coffee bars, business cards",
      },
      {
        label: "Wall Poster / Counter Stand",
        distanceMeters: 1.2,
        icon: "🖼️",
        context: "Store entrances, bulletin boards, checkout counter stands",
      },
      {
        label: "Window Vinyl / Storefront",
        distanceMeters: 2.5,
        icon: "🏬",
        context: "Exterior street windows, glass doors, pedestrian signage",
      },
      {
        label: "Outdoor Banner / Billboard",
        distanceMeters: 8.0,
        icon: "🏢",
        context: "Event backdrops, highway banners, outdoor murals",
      },
    ];

  // Standard optical scan ratio formula: Size = Distance / 10
  // For safety with complex dense URLs, recommended size = Distance / 8
  const minWidthCm = (distance.value * 10).toFixed(1);
  const safeWidthCm = (distance.value * 12.5).toFixed(1);
  const minWidthInches = (parseFloat(minWidthCm) / 2.54).toFixed(1);
  const safeWidthInches = (parseFloat(safeWidthCm) / 2.54).toFixed(1);
  const quietZoneMm = (parseFloat(minWidthCm) * 1.5).toFixed(1);

  const applyPreset = (preset: ScenarioPreset, key: string) => {
    selectedPreset.value = key;
    distance.value = preset.distanceMeters;
  };

  return (
    <div class="min-h-screen bg-[#FAF8F5] text-black font-sans selection:bg-[#FFE5E5] flex flex-col justify-between">
      {/* Top Banner Navigation */}
      <nav class="w-full border-b-4 border-black bg-[#FFE5EC] px-4 py-3 sticky top-0 z-30 shadow-[0_4px_0_#000]">
        <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <a
            href={isSpanish ? "/es" : "/"}
            class="font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span class="text-2xl">⚡</span>
            <span>QRBuddy</span>
            <span class="text-xs bg-black text-[#FFE5EC] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {isSpanish ? "Guía & Manifiesto" : "Guide & Manifesto"}
            </span>
          </a>

          <div class="flex items-center gap-3">
            <a
              href={isSpanish ? "/guide/printing" : "/es/guia/impresion"}
              class="text-xs font-bold bg-white border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0_#000] hover:bg-yellow-100 transition-colors"
            >
              {isSpanish ? "🇦🇺 English" : "🇲🇽 Español"}
            </a>
            <a
              href={isSpanish ? "/es" : "/"}
              class="text-xs font-black bg-black text-white px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#000] hover:bg-gray-800 transition-colors"
            >
              {isSpanish ? "Ir al Generador ✨" : "Open Studio ✨"}
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main class="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-12">
        {/* Header Hero */}
        <header class="text-center space-y-4">
          <div class="inline-block bg-[#E5F9FF] border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
            {isSpanish
              ? "📐 Guía de Impresión QR 2026"
              : "📐 QR Print Guide & Field Manual"}
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-black tracking-tight leading-tight">
            {isSpanish
              ? "Cómo Imprimir Códigos QR y Elegir Enlaces que Sigan Funcionando"
              : "How to Print QR Codes and Keep Their Links Working"}
          </h1>
          <p class="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            {isSpanish
              ? "Usa la calculadora de tamaño y revisa el destino, los límites y la caducidad antes de imprimir en vinil, papel o menús."
              : "Use the size calculator, then check the destination, limits, and expiry before printing on vinyl, paper, or menus."}
          </p>
        </header>

        {/* INTERACTIVE CALCULATOR CARD */}
        <section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
          <div class="flex items-center justify-between border-b-2 border-black pb-4 flex-wrap gap-2">
            <div>
              <h2 class="text-xl sm:text-2xl font-black flex items-center gap-2">
                <span>📐</span>
                <span>
                  {isSpanish
                    ? "Calculadora Óptica de Tamaño de Impresión"
                    : "Interactive Optical QR Print Calculator"}
                </span>
              </h2>
              <p class="text-xs text-gray-600 font-medium">
                {isSpanish
                  ? "Calcula el tamaño mínimo y recomendado según la distancia del usuario."
                  : "Calculate minimum and recommended dimensions based on real scanning distance."}
              </p>
            </div>

            {/* Unit Switcher */}
            <div class="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0_#000]">
              <button
                type="button"
                onClick={() => (unit.value = "metric")}
                class={`px-3 py-1 text-xs font-black transition-colors ${
                  unit.value === "metric"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Metric (cm)
              </button>
              <button
                type="button"
                onClick={() => (unit.value = "imperial")}
                class={`px-3 py-1 text-xs font-black transition-colors ${
                  unit.value === "imperial"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Inches (in)
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div class="space-y-2">
            <label class="text-xs font-black uppercase text-gray-500 tracking-wider">
              {isSpanish
                ? "Elige un Escenario Común:"
                : "Choose a Common Scenario:"}
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((p, idx) => {
                const key = `preset-${idx}`;
                const isSelected = selectedPreset.value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(p, key)}
                    class={`text-left p-3.5 rounded-2xl border-2 border-black transition-all flex items-start gap-3 shadow-[3px_3px_0_#000] ${
                      isSelected
                        ? "bg-[#FFE5EC] ring-2 ring-black transform -translate-y-0.5"
                        : "bg-white hover:bg-yellow-50"
                    }`}
                  >
                    <span class="text-2xl shrink-0">{p.icon}</span>
                    <div>
                      <div class="font-black text-sm text-black">{p.label}</div>
                      <div class="text-[11px] text-gray-600 leading-snug">
                        {p.context}
                      </div>
                      <div class="text-[10px] font-bold text-gray-500 mt-1">
                        {isSpanish
                          ? `Distancia: ${p.distanceMeters}m`
                          : `Distance: ${p.distanceMeters}m (${
                            (p.distanceMeters * 3.28).toFixed(1)
                          } ft)`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Distance Slider */}
          <div class="bg-[#FAF8F5] border-2 border-black rounded-2xl p-4 space-y-2">
            <div class="flex justify-between items-center text-sm font-black">
              <span>
                {isSpanish
                  ? "Ajustar Distancia Manual:"
                  : "Custom Scanning Distance:"}
              </span>
              <span class="bg-[#FFE5EC] border-2 border-black px-2.5 py-0.5 rounded-lg text-black font-black">
                {distance.value} {isSpanish ? "metros" : "meters"}{" "}
                ({(distance.value * 3.28).toFixed(1)} ft)
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="15.0"
              step="0.1"
              value={distance.value}
              onInput={(e) => {
                selectedPreset.value = "custom";
                distance.value = parseFloat(
                  (e.target as HTMLInputElement).value,
                );
              }}
              class="w-full accent-black cursor-pointer"
            />
            <div class="flex justify-between text-[10px] font-bold text-gray-500">
              <span>0.2m (Mano a Mano)</span>
              <span>2.5m (Vitrina)</span>
              <span>15.0m (Espectacular)</span>
            </div>
          </div>

          {/* Results Display */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div class="bg-[#E8F8F5] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] text-center space-y-1">
              <div class="text-xs font-black uppercase text-gray-600">
                {isSpanish ? "Tamaño Mínimo Absoluto" : "Absolute Minimum Size"}
              </div>
              <div class="text-2xl sm:text-3xl font-black text-black">
                {unit.value === "metric"
                  ? `${minWidthCm} cm`
                  : `${minWidthInches}″`}
              </div>
              <div class="text-[11px] text-gray-600 font-medium">
                {isSpanish
                  ? "Regla práctica 10:1 (distancia ÷ 10)"
                  : "Practical 10:1 guide (distance ÷ 10)"}
              </div>
            </div>

            <div class="bg-[#FFF9E6] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] text-center space-y-1 ring-2 ring-black">
              <div class="text-xs font-black uppercase text-amber-900 flex items-center justify-center gap-1">
                <span>⭐</span>
                <span>
                  {isSpanish ? "Tamaño Recomendado" : "Recommended Safe Size"}
                </span>
              </div>
              <div class="text-2xl sm:text-3xl font-black text-black">
                {unit.value === "metric"
                  ? `${safeWidthCm} cm`
                  : `${safeWidthInches}″`}
              </div>
              <div class="text-[11px] text-gray-700 font-medium">
                {isSpanish
                  ? "Ideal para URLs largas y poca luz"
                  : "Fastest scan under dim lighting"}
              </div>
            </div>

            <div class="bg-[#F0EBFF] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] text-center space-y-1">
              <div class="text-xs font-black uppercase text-purple-900">
                {isSpanish ? "Zona Silenciosa (Margen)" : "Quiet Zone Margin"}
              </div>
              <div class="text-2xl sm:text-3xl font-black text-black">
                {unit.value === "metric"
                  ? `≥ ${quietZoneMm} mm`
                  : `≥ ${(parseFloat(quietZoneMm) / 25.4).toFixed(2)}″`}
              </div>
              <div class="text-[11px] text-gray-600 font-medium">
                {isSpanish
                  ? "Margen blanco indispensable"
                  : "4-module clean border required"}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: STATIC CODES AND HOSTED REDIRECTS */}
        <section class="bg-[#FFF4E8] border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
          <div class="space-y-2">
            <div class="inline-block bg-red-100 text-red-800 border-2 border-black px-3 py-0.5 rounded-full text-xs font-black uppercase">
              {isSpanish
                ? "⚠️ Códigos estáticos y redirecciones alojadas"
                : "⚠️ Static Codes and Hosted Redirects"}
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-black tracking-tight">
              {isSpanish
                ? "¿Qué Puede Hacer que un QR Impreso Deje de Funcionar?"
                : "What Can Make a Printed QR Stop Working?"}
            </h2>
          </div>

          <div class="prose max-w-none text-sm sm:text-base text-gray-800 leading-relaxed space-y-4">
            <p>
              {isSpanish
                ? "Un QR estático contiene el destino directamente, así que no depende de una redirección de QRBuddy. Aun así, el sitio de destino puede cambiar o dejar de estar disponible. Un QR editable sí depende del servicio de redirección que lo mantiene."
                : "A static QR contains its destination directly, so it does not depend on a QRBuddy redirect. The destination site can still change or go offline. An editable QR depends on the redirect service that hosts it."}
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div class="bg-red-50 border-2 border-red-400 rounded-2xl p-4 space-y-2">
                <div class="font-black text-red-900 flex items-center gap-1.5 text-sm">
                  <span>❌</span>
                  <span>
                    {isSpanish
                      ? "Revisa el servicio de redirección"
                      : "Check the Redirect Service"}
                  </span>
                </div>
                <ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                  <li>
                    {isSpanish
                      ? "El QR contiene una URL del proveedor que redirige al destino."
                      : "The QR contains a provider URL that redirects to your destination."}
                  </li>
                  <li>
                    {isSpanish
                      ? "El proveedor controla si esa redirección sigue activa."
                      : "The provider controls whether that redirect stays active."}
                  </li>
                  <li>
                    {isSpanish
                      ? "Revisa los límites, la caducidad y el precio de renovación."
                      : "Check usage limits, expiry, and renewal pricing."}
                  </li>
                  <li>
                    {isSpanish
                      ? "Lee qué datos de visitas recopila el servicio."
                      : "Read what visit data the service collects."}
                  </li>
                </ul>
              </div>

              <div class="bg-green-50 border-2 border-green-500 rounded-2xl p-4 space-y-2">
                <div class="font-black text-green-900 flex items-center gap-1.5 text-sm">
                  <span>✅</span>
                  <span>
                    {isSpanish ? "Opciones de QRBuddy" : "QRBuddy Options"}
                  </span>
                </div>
                <ul class="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                  <li>
                    {isSpanish
                      ? "Los QR estáticos se generan en tu navegador y codifican el destino; generarlos no requiere un Pase Supporter."
                      : "Static QRs are generated in your browser and encode the destination; making them does not require a Supporter Pass."}
                  </li>
                  <li>
                    {isSpanish
                      ? "La imagen del QR estático no caduca, pero el sitio enlazado puede cambiar o dejar de funcionar."
                      : "The static QR image does not expire, but its linked site can change or stop working."}
                  </li>
                  <li>
                    {isSpanish
                      ? "Los QR editables están disponibles gratis dentro de límites de uso, escaneos y caducidad."
                      : "Editable QRs are available free within usage, scan, and expiry limits."}
                  </li>
                  <li>
                    {isSpanish
                      ? "El Pase Supporter de A$49 dura 365 días y amplía algunos límites; no se renueva automáticamente."
                      : "The A$49 Supporter Pass lasts 365 days and raises selected limits; it does not renew automatically."}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: 5 GOLDEN RULES OF QR PRINTING */}
        <section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#000] space-y-6">
          <h2 class="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-2">
            <span>✨</span>
            <span>
              {isSpanish
                ? "Las 5 Reglas de Oro para Imprimir Códigos QR"
                : "The 5 Golden Rules of Flawless QR Printing"}
            </span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border-2 border-black rounded-2xl p-4 bg-yellow-50/60 space-y-1.5">
              <div class="font-black text-sm text-black flex items-center gap-2">
                <span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                <span>
                  {isSpanish
                    ? "Contraste Alto (Fondo Claro)"
                    : "High Contrast (Dark on Light)"}
                </span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed">
                {isSpanish
                  ? "Las cámaras de smartphone buscan patrones oscuros sobre fondo claro. Evita códigos amarillos sobre papel blanco o códigos negros sobre fondos oscuros."
                  : "Phone camera sensors look for dark modules on light backgrounds. Avoid pale pastel dots on white paper, or black dots on dark wood."}
              </p>
            </div>

            <div class="border-2 border-black rounded-2xl p-4 bg-yellow-50/60 space-y-1.5">
              <div class="font-black text-sm text-black flex items-center gap-2">
                <span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  2
                </span>
                <span>
                  {isSpanish
                    ? "Respeta la Zona Silenciosa"
                    : "Respect the Quiet Zone (Margin)"}
                </span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed">
                {isSpanish
                  ? "Deja un margen vacío de al menos 4 módulos alrededor del código. Si el diseño gráfico corta el margen al ras, los lectores no detectarán las esquinas."
                  : "Always keep a clean empty margin around the QR code equal to at least 4 module dots. Cropping too tight prevents corner alignment detection."}
              </p>
            </div>

            <div class="border-2 border-black rounded-2xl p-4 bg-yellow-50/60 space-y-1.5">
              <div class="font-black text-sm text-black flex items-center gap-2">
                <span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  3
                </span>
                <span>
                  {isSpanish
                    ? "Exporta en SVG para imprimir"
                    : "Export SVG for Print"}
                </span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed">
                {isSpanish
                  ? "El PNG es una imagen rasterizada y puede verse borroso si se amplía mucho. El SVG se escala sin perder nitidez; QRBuddy permite descargar ambos formatos."
                  : "PNG is a raster image and can look blurry when enlarged a lot. SVG scales cleanly; QRBuddy lets you download both formats."}
              </p>
            </div>

            <div class="border-2 border-black rounded-2xl p-4 bg-yellow-50/60 space-y-1.5">
              <div class="font-black text-sm text-black flex items-center gap-2">
                <span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  4
                </span>
                <span>
                  {isSpanish
                    ? "Corrección de errores del QRBuddy"
                    : "QRBuddy's Error Correction"}
                </span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed">
                {isSpanish
                  ? "QRBuddy usa nivel Q por defecto y H con un logotipo. La corrección ayuda, pero no garantiza que un QR con poco contraste o muy cubierto se pueda leer; prueba la impresión."
                  : "QRBuddy uses level Q by default and H with a logo. Error correction helps, but cannot guarantee that a low-contrast or heavily covered QR will scan; test the print."}
              </p>
            </div>
          </div>

          <div class="border-2 border-black rounded-2xl p-4 bg-[#E5F9FF] space-y-1.5">
            <div class="font-black text-sm text-black flex items-center gap-2">
              <span class="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                5
              </span>
              <span>
                {isSpanish
                  ? "Prueba de Impresión Física en Vivo"
                  : "The Physical Live-Test Rule"}
              </span>
            </div>
            <p class="text-xs text-gray-700 leading-relaxed">
              {isSpanish
                ? "Antes de mandar a imprimir 10,000 folletos, imprime una sola copia en tu impresora casera y escanéala con un iPhone y un Android bajo poca luz a la distancia real del cliente."
                : "Before ordering 10,000 offset copies, print a single proof sheet on your home printer. Test it with both an iPhone and an Android under dim evening lighting from the actual expected distance."}
            </p>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section class="bg-[#FFE5EC] border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0_#000] text-center space-y-4">
          <h3 class="text-2xl sm:text-3xl font-black text-black">
            {isSpanish
              ? "¿Listo para Preparar un Código QR para Imprimir?"
              : "Ready to Make a QR Code for Print?"}
          </h3>
          <p class="text-sm sm:text-base text-gray-800 max-w-xl mx-auto">
            {isSpanish
              ? "Genera un QR estático que contiene directamente el destino o un QR editable, disponible gratis dentro de sus límites. El Pase Supporter cuesta A$49 por 365 días y amplía algunos límites, sin renovación automática."
              : "Make a static QR that contains its destination directly, or an editable QR available free within its limits. The A$49 Supporter Pass lasts 365 days and raises selected limits, with no automatic renewal."}
          </p>
          <div class="pt-2">
            <a
              href={isSpanish ? "/es" : "/"}
              class="inline-block bg-black text-white font-black text-base px-8 py-3.5 rounded-2xl border-2 border-black shadow-[4px_4px_0_#FFE5E5] hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
            >
              {isSpanish
                ? "Crear Mi Código QR Ahora →"
                : "Create My Free QR Code Now →"}
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer class="mt-16 py-8 border-t-4 border-black bg-white">
        <div class="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div class="flex items-center justify-center gap-4 flex-wrap">
            <PricingLink
              label={isSpanish ? "Precios y Pase ✨" : "Supporter ✨"}
            />
            <AboutLink label={isSpanish ? "Acerca de 📖" : "About"} />
            <KofiButton
              size="sm"
              label={isSpanish ? "Propinas ☕" : "Tip Jar ☕"}
            />
          </div>

          <div class="flex items-center justify-center gap-2 flex-wrap text-xs font-bold text-gray-700">
            <a
              href={isSpanish ? "/es/menus" : "/for/menus"}
              class="hover:underline"
            >
              {isSpanish ? "Menús QR 📜" : "Restaurant Menus 📜"}
            </a>
            <span class="text-gray-300">•</span>
            <a
              href={isSpanish ? "/es/bodas" : "/for/weddings"}
              class="hover:underline"
            >
              {isSpanish ? "Bodas 📸" : "Weddings & Photos 📸"}
            </a>
            <span class="text-gray-300">•</span>
            <a
              href={isSpanish ? "/es/musica" : "/for/music"}
              class="hover:underline"
            >
              {isSpanish ? "Música 📼" : "Music Mixtapes 📼"}
            </a>
            <span class="text-gray-300">•</span>
            <a
              href={isSpanish ? "/es/archivos" : "/for/lockers"}
              class="hover:underline"
            >
              {isSpanish ? "Archivos 🔐" : "Secret Drops 🔐"}
            </a>
          </div>

          <p class="text-xs text-gray-500 opacity-70">
            Made with soul by Pablo • Mexican-Australian • Drop a link. Watch it
            bloom.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PricingModal />
      <AboutModal />
      <KofiModal kofiUsername="madebypablo" />
    </div>
  );
}

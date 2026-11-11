import { assert, assertEquals, assertNotEquals } from "$std/assert/mod.ts";
import {
  alignmentCenters,
  buildQrSvgString,
  centerCutout,
  evaluateQrContrast,
  toSvgDataUrl,
  validateCanvaSvgCompliance,
} from "../utils/qr-vector-svg.ts";
import {
  bannerColors,
  resolveQRStyle,
  STAMPS,
  stampUrl,
} from "../utils/qr-design.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";
import { validateDesignPreferences } from "../utils/design-preferences.ts";
import { buildQrFilename, createFramedSvg } from "../utils/svg-export.ts";
import { getQRThemeTokens, QR_THEME_TOKENS } from "../utils/qr-styles.ts";
import {
  estimateMinPrintSize,
  measureQrModules,
  resolveStagePrintGuardrail,
} from "../islands/QRCanvas.tsx";
import {
  decodeMonogramFromLogoUrl,
  QUICK_LABEL_CHIPS,
  resolvePaletteDisplayName,
} from "../components/create-modal/DesignTab.tsx";

Deno.test("Design: alignment geometry includes the version-32 exception", () => {
  assertEquals(alignmentCenters(21), []);
  assertEquals(alignmentCenters(25), [6, 18]);
  assertEquals(alignmentCenters(45), [6, 22, 38]);
  assertEquals(alignmentCenters(73), [6, 26, 46, 66]);
  assertEquals(alignmentCenters(145), [6, 34, 60, 86, 112, 138]);
});

Deno.test("Design: every cutout is whole-module aligned and avoids QR function patterns", () => {
  for (let version = 1; version <= 40; version++) {
    const n = 17 + version * 4, hole = centerCutout(n);
    if (!hole) continue;
    assert(Number.isInteger(hole.start) && Number.isInteger(hole.end));
    assert(hole.start > 8);
    assertEquals(hole.start, n - hole.end);
    assert(hole.end - hole.start <= n * 0.28);
    for (const r of alignmentCenters(n)) {
      for (const c of alignmentCenters(n)) {
        assert(
          !(r + 2 >= hole.start && r - 2 < hole.end && c + 2 >= hole.start &&
            c - 2 < hole.end),
        );
      }
    }
  }
  assertEquals(centerCutout(45), null); // central alignment block, never erased
});

Deno.test("Design: marks force H, remote images cannot enter exports, masks differ", () => {
  const logoUrl = stampUrl(STAMPS[0].path);
  const svg = buildQrSvgString({
    data: "https://example.com/menu",
    logoUrl,
    errorCorrectionLevel: "L",
  });
  assert(svg.includes('data-ecl="H"'));
  assert(svg.includes('data-center-mark="true"'));
  assert(!svg.includes('data-cutout="none"'));
  const remote = buildQrSvgString({
    data: "https://example.com/menu",
    logoUrl: "https://example.com/logo.png",
  });
  assert(!remote.includes("<image"));
  const circle = buildQrSvgString({
    data: "https://example.com/menu",
    logoUrl,
    centerShape: "circle",
  });
  const knockout = buildQrSvgString({
    data: "https://example.com/menu",
    logoUrl,
    centerShape: "knockout",
  });
  assertNotEquals(circle, knockout);
  assert(knockout.includes('rx="0"'));
});

Deno.test("Design: geometry and palette survive a reload independently", () => {
  const base = resolveQRStyle("sunset");
  const override = {
    ...base,
    dots: { ...base.dots, shape: "dots" as const },
    cornersSquare: { ...base.cornersSquare, shape: "dot" as const },
    centerShape: "circle" as const,
  };
  const restored = validateDesignPreferences({
    version: 1,
    style: "pool",
    customStyle: override,
  });
  assert(restored?.customStyle);
  const resolved = resolveQRStyle(restored.style, restored.customStyle);
  assertEquals(resolved.dots.shape, "dots");
  assertEquals(resolved.cornersSquare?.shape, "dot");
  assertEquals(resolved.centerShape, "circle");
  assertNotEquals(resolved.dots.gradient, base.dots.gradient);
  assert(
    styledQrSvg({
      size: 1000,
      data: "https://example.com/menu",
      style: resolved,
    })
      .includes("data-ecl"),
  );
});

Deno.test("Design: a card label is a banner inside one pass, not a second box", () => {
  const qr = buildQrSvgString({ data: "https://example.com/menu", size: 1000 });
  const framed = createFramedSvg(qr, "GUEST PASS");
  assertEquals(framed.match(/<rect\b/g)?.length, 2); // card + QR ground
  assert(framed.includes('y="234" width="1000" height="1000"')); // matrix below banner
  const textY = Number(framed.match(/<text x="[\d.]+" y="(\d+)"/)?.[1]);
  assert(textY > 64 && textY < 234); // centred in the banner
  assert(framed.includes("GUEST PASS"));
});

Deno.test("Design: three banner looks, auto-contrast, persisted", () => {
  assertEquals(bannerColors("ink", "#ec4899"), {
    bg: "#1e1714",
    ink: "#fffef7",
  });
  assertEquals(bannerColors("paper", "#ec4899"), {
    bg: "#fffef7",
    ink: "#1e1714",
  });
  assertEquals(bannerColors("accent", "#ec4899").bg, "#ec4899");
  assertEquals(bannerColors("accent", "#ec4899").ink, "#fffef7");
  assertEquals(bannerColors("accent", "#ffbe0b").ink, "#1e1714"); // bright gold
  const saved = validateDesignPreferences({
    version: 1,
    style: "sunset",
    frameConfig: { enabled: true, caption: "GUEST PASS", theme: "ink" },
  });
  assertEquals(saved?.frameConfig?.theme, "ink");
  const junk = validateDesignPreferences({
    version: 1,
    style: "sunset",
    frameConfig: { enabled: true, caption: "X", theme: "rainbow" },
  });
  assertEquals(junk?.frameConfig?.theme, "accent");
});

Deno.test("Design: the centre badge is a chunky ring, not a hairline", () => {
  const svg = buildQrSvgString({
    data: "https://example.com/menu",
    logoUrl: stampUrl(STAMPS[0].path),
  });
  const ring = Number(svg.match(/stroke-width="([\d.]+)"\/>/)?.[1]);
  assert(ring >= 7.5 && ring <= 8.5); // 8px at 1000px, ~2.7px on a 336px card
  assert(!svg.includes('stroke-width="4.5"'));
});

Deno.test("Design: sparse patterns use H even without a center mark", () => {
  for (const dotShape of ["dots", "diamond"] as const) {
    const svg = buildQrSvgString({
      data: "WIFI:T:WPA;S:QRBuddy;P:quiet-waves;;",
      dotShape,
    });
    assert(svg.includes('data-ecl="H"'));
    assert(!svg.includes("<image"));
  }
});

Deno.test("Design: malformed center masks restore safely", () => {
  const base = resolveQRStyle("sunset");
  assertEquals(
    validateDesignPreferences({
      version: 1,
      style: "custom",
      customStyle: { ...base, centerShape: { toString: null } },
    })?.style,
    "sunset",
  );
});

Deno.test("Design: global control tokens are paper and gold, pigment stays in accents", () => {
  for (
    const tokens of [
      ...Object.values(QR_THEME_TOKENS),
      getQRThemeTokens("custom", { dots: { color: "#da39c2" } }),
    ]
  ) {
    assertEquals(tokens.tint, "#FFFEF7");
    assertEquals(tokens.tintStrong, "#FFFEF7");
    assertEquals(tokens.ctaBg, "#FFBE0B");
  }
});

Deno.test("Design: standalone SVG defaults to ISO 4-module quietZone and supports custom quietZone", () => {
  // Version 1 (21 modules): default quietZone = 4 -> 29 total modules -> at 290px, cellSize = 10, offset = 40
  const isoDefault = buildQrSvgString({
    data: "A",
    errorCorrectionLevel: "L",
    rounded: false,
    size: 290,
  });
  assert(isoDefault.includes('d="M40,40h70v70h-70Z'));

  // Explicit quietZone = 2 -> 25 total modules -> at 250px, cellSize = 10, offset = 20
  const compact = buildQrSvgString({
    data: "A",
    errorCorrectionLevel: "L",
    rounded: false,
    quietZone: 2,
    size: 250,
  });
  assert(compact.includes('d="M20,20h70v70h-70Z'));

  // Dense payload: background corner rx scales down so it never encroaches into finder patterns
  const dense = buildQrSvgString({
    data: "https://qrbuddy.app/menu/" + "item-".repeat(120),
    rounded: false,
    size: 1000,
  });
  const bgRx = Number(dense.match(/<rect x="0" y="0"[^>]*rx="(\d+)"/)?.[1]);
  const finderOrigin = Number(dense.match(/<path d="M([\d.]+),/)?.[1]);
  assert(Number.isFinite(bgRx) && Number.isFinite(finderOrigin));
  assert(
    bgRx <= finderOrigin,
    `bgRadius (${bgRx}) must not encroach past quiet-zone origin (${finderOrigin})`,
  );
});

Deno.test("Design: validateCanvaSvgCompliance accepts inline data:image/* and rejects external <image>", () => {
  const stamped = buildQrSvgString({
    data: "https://qrbuddy.app",
    logoUrl: stampUrl(STAMPS[0].path),
  });
  assert(stamped.includes("<image"));
  assertEquals(validateCanvaSvgCompliance(stamped).valid, true);

  const inlinePng =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" width="100" height="100"/></svg>`;
  assertEquals(validateCanvaSvgCompliance(inlinePng).valid, true);

  const remoteHttps =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><image href="https://example.com/logo.png" width="100" height="100"/></svg>`;
  const remoteVerdict = validateCanvaSvgCompliance(remoteHttps);
  assertEquals(remoteVerdict.valid, false);
  assert(remoteVerdict.errors.some((e) => e.includes("<image>")));

  const relativeImg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><image xlink:href="/logo.png" width="100" height="100"/></svg>`;
  assertEquals(validateCanvaSvgCompliance(relativeImg).valid, false);
});

Deno.test("Design: evaluateQrContrast flags inverted and low-contrast palettes while passing print-safe palettes", () => {
  // Standard dark-on-cream passes cleanly
  const safe = evaluateQrContrast(["#1e1714", "#7c3aed"], "#fffef7");
  assertEquals(safe.inverted, false);
  assertEquals(safe.lowContrast, false);
  assert(safe.minRatio >= 5);

  // Light foreground on dark background -> inverted
  const inverted = evaluateQrContrast(["#fffef7", "#38bdf8"], "#1e1714");
  assertEquals(inverted.inverted, true);

  // Pale yellow/amber stop on cream paper -> lowContrast (< 3.5:1)
  const pale = evaluateQrContrast(["#1e1714", "#fde047"], "#fff8f0");
  assertEquals(pale.inverted, false);
  assertEquals(pale.lowContrast, true);
  assert(pale.minRatio < 3.5);
});

Deno.test("Design: buildQrFilename builds human-friendly slugs across URL, Wi-Fi, vCard, and frameText", () => {
  assertEquals(
    buildQrFilename("https://pibulus.com", "sunset", undefined, "svg"),
    "qrbuddy-pibulus-com-sunset.svg",
  );
  assertEquals(
    buildQrFilename("https://pibulus.com/menu", "sunset", "GUEST PASS", "png"),
    "qrbuddy-guest-pass-sunset.png",
  );
  assertEquals(
    buildQrFilename("WIFI:T:WPA;S:Studio Sol;P:secret;;", "matcha"),
    "qrbuddy-wifi-studio-sol-matcha.png",
  );
  assertEquals(
    buildQrFilename(
      "BEGIN:VCARD\nVERSION:3.0\nFN:Pablo Alvarado\nORG:SoftStack\nEND:VCARD",
      "noir",
      undefined,
      "svg",
    ),
    "qrbuddy-pablo-alvarado-noir.svg",
  );
  assertEquals(
    buildQrFilename("mailto:hello@pibulus.com?subject=Hi", "pool"),
    "qrbuddy-hello-pibulus-com-pool.png",
  );
  assertEquals(
    buildQrFilename("tel:+61 400 123 456", "candy"),
    "qrbuddy-tel-61400123456-candy.png",
  );
});

Deno.test("Design: estimateMinPrintSize computes physical floor and dense warning across V1, V4, and V10", () => {
  // V1 (21x21) + 2*4 quiet zone = 29 modules -> 13.05 mm clamped to 15 mm floor
  const v1 = estimateMinPrintSize(21);
  assertEquals(v1, {
    totalModules: 29,
    minMm: 15,
    minInches: 0.6,
    denseWarning: false,
  });

  // V4 (33x33) + 2*4 quiet zone = 41 modules -> 18 mm (0.7 in)
  const v4 = estimateMinPrintSize(33);
  assertEquals(v4, {
    totalModules: 41,
    minMm: 18,
    minInches: 0.7,
    denseWarning: false,
  });

  // V8 (49x49) stays below dense threshold; V9 (53x53) triggers denseWarning
  assertEquals(estimateMinPrintSize(49).denseWarning, false);
  assertEquals(estimateMinPrintSize(53).denseWarning, true);

  // V10 (57x57) + 2*4 quiet zone = 65 modules -> 29 mm (1.1 in), denseWarning = true
  const v10 = estimateMinPrintSize(57);
  assertEquals(v10, {
    totalModules: 65,
    minMm: 29,
    minInches: 1.1,
    denseWarning: true,
  });

  // V11 (61x61) + 2*4 quiet zone = 69 modules -> 31 mm (1.2 in), denseWarning = true
  const v11 = estimateMinPrintSize(61);
  assertEquals(v11, {
    totalModules: 69,
    minMm: 31,
    minInches: 1.2,
    denseWarning: true,
  });

  // Custom quietZone adjusts totalModules and physical size
  const compactV10 = estimateMinPrintSize(57, 2);
  assertEquals(compactV10.totalModules, 61);
  assertEquals(compactV10.minMm, 27);
  assertEquals(compactV10.denseWarning, true);

  // Real payloads: short URL stays compact; rich vCard crosses into dense matrix
  const shortModules = measureQrModules("https://qrbuddy.app");
  assert(shortModules < 53);
  assertEquals(estimateMinPrintSize(shortModules).denseWarning, false);

  const richVcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Elena Morales-Castillo",
    "ORG:Sol Botanicals Roastery & Cellar",
    "TITLE:Head of Packaging & Print Operations",
    "TEL;TYPE=CELL:+61400123456",
    "EMAIL:elena.morales@solbotanicals.example.com",
    "URL:https://solbotanicals.example.com/wholesale/autumn-catalogue?utm_source=card",
    "END:VCARD",
  ].join("\n");
  const denseModules = measureQrModules(richVcard);
  assert(denseModules >= 53);
  assertEquals(estimateMinPrintSize(denseModules).denseWarning, true);
});

Deno.test("Design: stage guardrail stays silent on normal QRs and merges dense + omitted-mark into one pill", () => {
  const normalSpec = estimateMinPrintSize(33);
  assertEquals(
    resolveStagePrintGuardrail({
      moduleCount: 33,
      printSpec: normalSpec,
      centerMarkOmitted: false,
    }),
    null,
  );

  // Center mark omitted on Version 7 (45x45 central alignment block, below 53x53 dense threshold)
  const v7Spec = estimateMinPrintSize(45);
  assertEquals(v7Spec.denseWarning, false);
  const cutoutOnly = resolveStagePrintGuardrail({
    moduleCount: 45,
    printSpec: v7Spec,
    centerMarkOmitted: true,
  });
  assertEquals(cutoutOnly, {
    text: "Dense code — center mark omitted for scan reliability",
    hasPrintSpec: false,
    hasDenseWarning: false,
    hasCutoutNotice: true,
  });

  // High-density matrix without center mark
  const v11Spec = estimateMinPrintSize(61);
  const denseOnly = resolveStagePrintGuardrail({
    moduleCount: 61,
    printSpec: v11Spec,
    centerMarkOmitted: false,
  });
  assertEquals(denseOnly, {
    text: "Dense 61×61 · Print ≥ 31 mm (1.2″) or use Editable",
    hasPrintSpec: true,
    hasDenseWarning: true,
    hasCutoutNotice: false,
  });

  // High-density matrix + omitted center mark merges into a single pill (EN + ES)
  const mergedEn = resolveStagePrintGuardrail({
    moduleCount: 61,
    printSpec: v11Spec,
    centerMarkOmitted: true,
  });
  assertEquals(mergedEn, {
    text: "Dense 61×61 · Center mark omitted · Print ≥ 31 mm (1.2″)",
    hasPrintSpec: true,
    hasDenseWarning: true,
    hasCutoutNotice: true,
  });

  const mergedEs = resolveStagePrintGuardrail({
    moduleCount: 61,
    printSpec: v11Spec,
    centerMarkOmitted: true,
    isSpanish: true,
  });
  assertEquals(
    mergedEs?.text,
    "Denso 61×61 · Marca central omitida · Imprimir ≥ 31 mm (1.2″)",
  );
});

Deno.test("DesignTab: custom palette name, monogram SVG roundtrip, and quick-fill label chips", () => {
  assertEquals(resolvePaletteDisplayName("custom", false), "Custom");
  assertEquals(resolvePaletteDisplayName("custom", true), "Propio");
  assertEquals(resolvePaletteDisplayName("blush", false), "Crimson");
  assertEquals(resolvePaletteDisplayName("blush", true), "Carmesí");
  assertEquals(resolvePaletteDisplayName("grape", false), "Cosmic");
  assertEquals(resolvePaletteDisplayName("candy", true), "Dulce");
  assertEquals(resolvePaletteDisplayName("terminal", false), "Matrix");
  assertEquals(resolvePaletteDisplayName("sunset", true), "Atardecer");

  const vipSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="64" font-size="50" font-weight="900" fill="#1e1714">VIP</text></svg>`;
  assertEquals(decodeMonogramFromLogoUrl(toSvgDataUrl(vipSvg)), "VIP");

  const utf8Svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="64" font-size="66" font-weight="900" fill="#1e1714">ÑO</text></svg>`;
  assertEquals(decodeMonogramFromLogoUrl(toSvgDataUrl(utf8Svg)), "ÑO");

  // Stamps and raster PNGs never masquerade as monograms
  assertEquals(decodeMonogramFromLogoUrl(stampUrl(STAMPS[0].path)), "");
  assertEquals(
    decodeMonogramFromLogoUrl("data:image/png;base64,iVBORw0KGgo="),
    "",
  );
  assertEquals(decodeMonogramFromLogoUrl(""), "");

  assertEquals(
    QUICK_LABEL_CHIPS.map((c) => c.en),
    ["Scan Me", "Menu", "Wi-Fi", "Guest Pass"],
  );
  assertEquals(
    QUICK_LABEL_CHIPS.map((c) => c.es),
    ["Escanéame", "Menú", "Wi-Fi", "Acceso"],
  );
});

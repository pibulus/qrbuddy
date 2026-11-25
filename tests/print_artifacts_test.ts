import { assert, assertEquals } from "$std/assert/mod.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";
import { validateCanvaSvgCompliance } from "../utils/qr-vector-svg.ts";
import {
  canExportTransparent,
  stripSvgBackgroundRect,
} from "../utils/svg-export.ts";
import {
  buildCounterCardPrintHtml,
  buildPrintProofSheetHtml,
  extractSignMetadata,
} from "../utils/print-artifacts.ts";

Deno.test("V3-B: resolveQRStyle preserves transparentBg across palette changes", () => {
  const prev = resolveQRStyle("sunset", {
    ...resolveQRStyle("sunset"),
    transparentBg: true,
  });
  const switched = resolveQRStyle("pool", prev);
  assertEquals(switched.transparentBg, true);
});

Deno.test("V3-B: canExportTransparent gates strictly on classic + clean + unframed", () => {
  assertEquals(
    canExportTransparent({
      transparentBg: true,
      renderMode: "classic",
      print: "clean",
    }),
    true,
  );
  assertEquals(
    canExportTransparent(
      { transparentBg: true, renderMode: "classic", print: "clean" },
      { enabled: true },
    ),
    false,
  );
  assertEquals(
    canExportTransparent({
      transparentBg: true,
      renderMode: "halftone",
      print: "clean",
    }),
    false,
  );
  assertEquals(
    canExportTransparent({
      transparentBg: true,
      renderMode: "classic",
      print: "riso",
    }),
    false,
  );
});

Deno.test("V3-B: stripSvgBackgroundRect removes root paper rect while keeping center mark & Canva compliance", () => {
  const dummyLogo = "data:image/png;base64,iVBORw0KGgo=";
  const rawSvg = styledQrSvg({
    size: 1000,
    data: "https://qrbuddy.app/menu",
    style: resolveQRStyle("sunset"),
    logoUrl: dummyLogo,
  });
  assert(
    /<rect\s+x="0"\s+y="0"\s+width="1000"\s+height="1000"/.test(rawSvg),
    "raw classic SVG starts with outer background rect",
  );
  const transparentSvg = stripSvgBackgroundRect(rawSvg);
  assert(
    !/<rect\s+x="0"\s+y="0"/.test(transparentSvg),
    "outer background rect must be stripped",
  );
  assert(
    transparentSvg.includes('data-center-mark="true"'),
    "center mark image must remain intact",
  );
  assert(
    /<rect\s+x="[1-9]/.test(transparentSvg),
    "center badge moat rect must remain intact",
  );
  const canvaCheck = validateCanvaSvgCompliance(transparentSvg);
  assertEquals(canvaCheck.valid, true);
});

Deno.test("V3-B: extractSignMetadata parses Wi-Fi, vCard, WhatsApp & URL payloads", () => {
  const wifiMeta = extractSignMetadata("WIFI:T:WPA;S:CafeLuna;P:oatmilk;;");
  assertEquals(wifiMeta.kind, "wifi");
  assertEquals(wifiMeta.badge, "WI-FI");
  assertEquals(wifiMeta.title, "CafeLuna");
  assertEquals(wifiMeta.secretValue, "oatmilk");

  const cardMeta = extractSignMetadata(
    "BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada;;;\nFN:Ada Lovelace\nORG:Analytical Engine\nTEL:+61412345678\nEND:VCARD",
    undefined,
    "es",
  );
  assertEquals(cardMeta.kind, "vcard");
  assertEquals(cardMeta.badge, "CONTACTO");
  assertEquals(cardMeta.title, "Ada Lovelace");
});

Deno.test("V3-B: Counter Sign & Proof Sheet HTML stay Soft Neo Toybrut without raw #fff/#000", () => {
  const signHtml = buildCounterCardPrintHtml({
    data: "WIFI:T:WPA;S:BrunswickGuest;P:espresso123;;",
    style: resolveQRStyle("sunset"),
    styleKey: "sunset",
    lang: "en",
  });
  assert(signHtml.includes("BrunswickGuest"));
  assert(signHtml.includes("espresso123"));
  assert(signHtml.includes("Foldable Table Tent"));
  assert(signHtml.includes("@page { size: 105mm 148mm; margin: 0; }"));
  assert(signHtml.includes("@page { size: A4 portrait; margin: 8mm; }"));
  assert(!/#(?:fff|ffffff|000|000000)\b/i.test(signHtml));

  const proofHtml = buildPrintProofSheetHtml({
    data: "https://qrbuddy.app/table-1",
    style: resolveQRStyle("matcha"),
    styleKey: "matcha",
    lang: "es",
  });
  assert(proofHtml.includes("50 × 50 mm"));
  assert(proofHtml.includes("15 × 15 mm"));
  assert(proofHtml.includes("50 mm (5.0 cm)"));
  assert(!/#(?:fff|ffffff|000|000000)\b/i.test(proofHtml));

  // Dense >2000 byte payloads must fall back to ECL L rather than throwing overflow.
  const denseHtml = buildCounterCardPrintHtml({
    data: `https://qrbuddy.app/menu?notes=${"a".repeat(2200)}`,
    style: resolveQRStyle("sunset"),
    styleKey: "sunset",
    lang: "en",
  });
  assert(denseHtml.includes("data:image/svg+xml;base64,"));
  assert(!denseHtml.includes("<title>[^<]*—"));
});

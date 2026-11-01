import { assert, assertEquals, assertNotEquals } from "$std/assert/mod.ts";
import {
  alignmentCenters,
  buildQrSvgString,
  centerCutout,
} from "../utils/qr-vector-svg.ts";
import {
  bannerColors,
  resolveQRStyle,
  STAMPS,
  stampUrl,
} from "../utils/qr-design.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";
import { validateDesignPreferences } from "../utils/design-preferences.ts";
import { createFramedSvg } from "../utils/svg-export.ts";
import { getQRThemeTokens, QR_THEME_TOKENS } from "../utils/qr-styles.ts";

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

import { assert, assertEquals, assertStringIncludes } from "$std/assert/mod.ts";
import {
  foilSideColors,
  isStructuralModule,
  mixColor,
  renderSticker,
  stickerShapePath,
} from "../utils/qr-art-renderers.ts";
import { buildQrSvgString } from "../utils/qr-vector-svg.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { validateDesignPreferences } from "../utils/design-preferences.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";

const DATA = "https://qrbuddy.app";
const ART = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
const MARK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

/** Deterministic 25x25 matrix: a diagonal band plus a fake finder block. */
function syntheticMatrix() {
  const count = 25;
  const dark = (r: number, c: number) => {
    if (r < 7 && c < 7) return true;
    return (r * 7 + c * 3) % 5 < 2;
  };
  return {
    count,
    isDark: dark,
    isCleared: () => false,
    alignment: [6, 18],
  };
}

Deno.test("Looks: classic stays the untouched default", () => {
  const svg = buildQrSvgString({ data: DATA, palette: "sunset" });
  assertStringIncludes(svg, 'data-look="classic"');
  assertStringIncludes(svg, 'fill="url(#qrb-eyes)"');
  assertEquals(svg.includes("qrb-art-clip"), false);
});

Deno.test("Looks: foil is a flat code on an extruded slab, never a skew", () => {
  const svg = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    renderMode: "foil",
  });
  assertStringIncludes(svg, 'data-look="foil"');
  // The isometric plane failed the decoder gate; the tiles must stay square.
  assertEquals(/matrix\(-0\.866/.test(svg), false);
  const plates = svg.match(/<rect [^>]*rx=/g) ?? [];
  assert(plates.length >= 18, `expected a lofted slab, got ${plates.length}`);
  assertStringIncludes(svg, 'stroke="#1e1714"');
});

Deno.test("Looks: foil overlays its badge instead of excavating modules", () => {
  const svg = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    renderMode: "foil",
    logoUrl: MARK,
  });
  assertStringIncludes(svg, 'data-cutout="overlay"');
  assertStringIncludes(svg, 'data-center-mark="true"');
});

Deno.test("Looks: sticker rejects remote artwork and keeps data URLs", () => {
  const remote = buildQrSvgString({
    data: DATA,
    renderMode: "sticker",
    artImage: "https://example.com/photo.png",
  });
  assertEquals(remote.includes("<image"), false);

  const inline = buildQrSvgString({
    data: DATA,
    renderMode: "sticker",
    artImage: ART,
  });
  assertStringIncludes(inline, 'data-look="sticker"');
  assertStringIncludes(inline, ART);
  assertStringIncludes(inline, 'clip-path="url(#qrb-art-clip)"');
});

Deno.test("Looks: sticker protects function patterns and shrinks only data", () => {
  const matrix = syntheticMatrix();
  const svg = renderSticker(matrix, { x: 0, y: 0, size: 900 }, {
    bg: "#FBF1E4",
    ink: "#1e1714",
    shape: "squircle",
  });
  const widths = [
    ...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="([\d.]+)"/g),
  ]
    .map((m) => Number(m[1]));
  const unique = [...new Set(widths)].sort((a, b) => a - b);
  // Two sizes only: full-size function modules and shrunken data modules.
  assertEquals(unique.length >= 2, true);
  assert(unique[0] < unique[unique.length - 1] * 0.9);
  // Protector group erases the artwork behind the three finders.
  const protectors = svg.match(/<g fill="#FBF1E4">([\s\S]*?)<\/g>/);
  assert(protectors, "expected a protector group");
  assertEquals((protectors![1].match(/<rect/g) ?? []).length >= 5, true);
});

Deno.test("Looks: structural detection covers finders, timing and alignment", () => {
  const n = 25;
  const alignment = [6, 18];
  for (let i = 0; i < 9; i++) {
    assert(isStructuralModule(0, i, n, alignment));
    assert(isStructuralModule(i, 0, n, alignment));
    assert(isStructuralModule(6, i, n, alignment));
    assert(isStructuralModule(i, 6, n, alignment));
  }
  assert(isStructuralModule(18, 18, n, alignment));
  assert(isStructuralModule(20, 18, n, alignment));
  assertEquals(isStructuralModule(12, 12, n, alignment), false);
});

Deno.test("Looks: three die-cut edges, each a closed path", () => {
  for (const shape of ["squircle", "circle", "ticket"] as const) {
    const path = stickerShapePath({ x: 10, y: 10, size: 500 }, shape);
    assert(path.startsWith("M"));
    assert(path.endsWith("Z"));
  }
  const circle = stickerShapePath({ x: 0, y: 0, size: 500 }, "circle");
  assertEquals((circle.match(/a/g) ?? []).length, 2);
  const ticket = stickerShapePath({ x: 0, y: 0, size: 500 }, "ticket");
  assertEquals((ticket.match(/A/g) ?? []).length, 6);
});

Deno.test("Looks: pocket DMG carries the four greens", () => {
  const svg = buildQrSvgString({
    data: DATA,
    renderMode: "pocket",
    pocketTone: "dmg",
  });
  assertStringIncludes(svg, "#9BBC0F");
  assertStringIncludes(svg, "#0F380F");
  assertStringIncludes(svg, "#8BAC0F");
  assertStringIncludes(svg, "#306230");
});

Deno.test("Looks: a look rides along with every palette", () => {
  const resolved = resolveQRStyle("candy", {
    dots: { shape: "dots", color: "#111111" },
    background: { color: "#FBF1E4" },
    renderMode: "sticker",
    artImage: ART,
    stickerShape: "ticket",
    pocketTone: "dmg",
  });
  assertEquals(resolved.renderMode, "sticker");
  assertEquals(resolved.artImage, ART);
  assertEquals(resolved.stickerShape, "ticket");
  assertEquals(resolved.pocketTone, "dmg");
  // Palette colours still win for a named palette.
  assertEquals(resolved.dots.color, resolveQRStyle("candy").dots.color);
  assertEquals(resolved.dots.shape, "dots");
});

Deno.test("Looks: malformed look preferences restore safely", () => {
  const bad = validateDesignPreferences({
    version: 1,
    style: "sunset",
    customStyle: {
      dots: { color: "#111111" },
      background: { color: "#FBF1E4" },
      renderMode: "hologram",
    },
  });
  assertEquals(bad?.style, "sunset");
  assertEquals(bad?.customStyle, null);

  const good = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: { color: "#111111" },
      background: { color: "#FBF1E4" },
      renderMode: "foil",
      artColors: { top: "#C9184A", left: "#5A189A" },
    },
  });
  assertEquals(good?.customStyle?.renderMode, "foil");
  assertEquals(good?.customStyle?.artColors?.left, "#5A189A");
});

Deno.test("Looks: foil colour derivation and mixing stay honest", () => {
  assertEquals(mixColor("#000000", "#ffffff", 0.5), "#808080");
  assertEquals(mixColor("url(#qrb-dots)", "#ffffff", 0.5), "url(#qrb-dots)");
  const sides = foilSideColors("#C9184A", "#5A189A", "#FBF1E4", "#1e1714");
  assert(sides.left.startsWith("#"));
  assert(sides.right.startsWith("#"));
  assert(sides.left !== sides.right);
});

Deno.test("Looks: every look builds at print size inside the byte budget", () => {
  for (const mode of ["classic", "foil", "sticker", "pocket"] as const) {
    const svg = styledQrSvg({
      size: 3000,
      data: DATA,
      style: { ...resolveQRStyle("sunset"), renderMode: mode },
    });
    assert(svg.length > 1000);
    assert(svg.length < 1_500_000, `${mode} SVG is ${svg.length} bytes`);
  }
});

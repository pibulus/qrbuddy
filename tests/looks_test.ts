import { assert, assertEquals, assertStringIncludes } from "$std/assert/mod.ts";
import {
  foilSideColors,
  mixColor,
  renderFoil,
  renderHalftone,
} from "../utils/qr-art-renderers.ts";
import {
  chooseFlips,
  codewordGroups,
  functionMask,
  remainderBits,
  TOTAL_CODEWORDS,
} from "../utils/qr-codewords.ts";
import {
  decodeSample,
  defaultSample,
  encodeSample,
  luminance,
  sampleColor,
} from "../utils/qr-art-sample.ts";
import { buildQrSvgString } from "../utils/qr-vector-svg.ts";
import { printContrast, risoInks } from "../utils/qr-print.ts";
import { encodeMatrixPng, toDataUrl } from "../utils/png.ts";
import { conditioning } from "../utils/replicate-art.ts";
import { resolveQRStyle } from "../utils/qr-design.ts";
import { validateDesignPreferences } from "../utils/design-preferences.ts";
import { styledQrSvg } from "../utils/qr-renderer.ts";

const DATA = "https://qrbuddy.app";
const MARK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

/** Deterministic 25x25 matrix: a diagonal band plus a fake finder block. */
function syntheticMatrix() {
  const count = 25;
  const dark = (r: number, c: number) => {
    if (r < 7 && c < 7) return true;
    return (r * 7 + c * 3) % 5 < 2;
  };
  return { count, isDark: dark, isCleared: () => false, alignment: [6, 18] };
}

/** A 2-tone sample: left half paper, right half ink. */
function halfSample(n = 16) {
  const bytes = new Uint8Array(n * n * 3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 3;
      const v = x < n / 2 ? 245 : 30;
      bytes[i] = v;
      bytes[i + 1] = v;
      bytes[i + 2] = v;
    }
  }
  return encodeSample(bytes, n);
}

Deno.test("Look sample: encode/decode round-trips and rejects rubbish", () => {
  const sample = halfSample(16);
  assertEquals(sample.n, 16);
  assertEquals(sample.data.length, 16 * 16 * 4);
  const rgb = decodeSample(sample);
  assert(rgb);
  assertEquals(rgb!.length, 16 * 16 * 3);
  assertEquals(rgb![0], 245);
  assertEquals(decodeSample({ n: 16, data: "not base64 at all" }), null);
  assertEquals(decodeSample({ n: 0, data: "" }), null);
  assertEquals(decodeSample(undefined), null);
});

Deno.test("Look sample: nearest lookup and luminance are honest", () => {
  const rgb = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 255]);
  assertEquals(sampleColor(rgb, 2, 0.1, 0.1), [0, 0, 0]);
  assertEquals(sampleColor(rgb, 2, 0.9, 0.1), [255, 255, 255]);
  assertEquals(sampleColor(rgb, 2, 2, 2), [0, 0, 255]);
  assertEquals(Math.round(luminance(255, 255, 255)), 1);
  assertEquals(Math.round(luminance(0, 0, 0)), 0);
});

Deno.test("Look sample: the palette default is stable and not empty", () => {
  const a = defaultSample("#FBF1E4", "#1e1714", 8);
  const b = defaultSample("#FBF1E4", "#1e1714", 8);
  assertEquals(a.n, 8);
  assertEquals(a.data, b.data);
  const rgb = decodeSample(a)!;
  // The sweep must actually move from paper to ink.
  const first = luminance(rgb[0], rgb[1], rgb[2]);
  const last = luminance(
    rgb[rgb.length - 3],
    rgb[rgb.length - 2],
    rgb[rgb.length - 1],
  );
  assert(first > last + 0.3, `${first} should be lighter than ${last}`);
});

Deno.test("Look halftone: the sub-grid is capped by polarity", () => {
  const matrix = syntheticMatrix();
  const svg = renderHalftone(matrix, { x: 0, y: 0, size: 900 }, {
    sample: halfSample(),
    tone: "color",
    shape: "rounded",
    bg: "#FBF1E4",
    ink: "#1e1714",
  });
  // Ink is emitted as merged runs on a 4× sub-grid, never as one shape per
  // module: the halftone has to resolve finer than the code.
  assertStringIncludes(svg, 'shape-rendering="crispEdges"');
  assert(svg.includes('<path d="M'));
  const runs = (svg.match(/h\d+v1h-\d+Z/g) ?? []).length;
  assert(runs > matrix.count * 4, `expected a sub-grid, got ${runs} runs`);
});

Deno.test("Look halftone: function patterns are solid and protected", () => {
  const svg = renderHalftone(syntheticMatrix(), { x: 0, y: 0, size: 900 }, {
    sample: halfSample(),
    tone: "color",
    shape: "rounded",
    bg: "#FBF1E4",
    ink: "#1e1714",
  });
  // Protector plate before the ink: three 8x8 finder blocks plus timing.
  const protectors = svg.match(/<g fill="#FBF1E4">([\s\S]*?)<\/g>/);
  assert(protectors, "expected a protector plate");
  assertEquals((protectors![1].match(/<rect/g) ?? []).length >= 5, true);
  // Structural solids are rects at full cell size, drawn in ink.
  assertStringIncludes(svg, 'stroke="#1e1714"');
});

Deno.test("Look halftone: tone changes the ink, not the matrix", () => {
  const base = {
    sample: halfSample(),
    shape: "rounded" as const,
    bg: "#FBF1E4",
    ink: "#1e1714",
  };
  const run = (tone: "color" | "dmg" | "ink") =>
    renderHalftone(syntheticMatrix(), { x: 0, y: 0, size: 900 }, {
      ...base,
      tone,
    });
  const color = run("color");
  const dmg = run("dmg");
  const ink = run("ink");
  assertStringIncludes(dmg, "#0F380F");
  assertStringIncludes(dmg, "#9BBC0F");
  assertStringIncludes(ink, "#1e1714");
  assert(color.includes("rgb("));
  assertEquals(color.includes("#0F380F"), false);
});

Deno.test("Look halftone: a circle plate inscribes the code", () => {
  const svg = renderHalftone(syntheticMatrix(), { x: 0, y: 0, size: 900 }, {
    sample: halfSample(),
    tone: "color",
    shape: "circle",
    bg: "#FBF1E4",
    ink: "#1e1714",
  });
  assertStringIncludes(svg, "a450 450 0 1 0 900 0");
});

Deno.test("Look foil: depth is the only knob and it moves the wall", () => {
  const matrix = syntheticMatrix();
  const thin = renderFoil(matrix, { x: 0, y: 0, size: 900 }, {
    top: "#C9184A",
    left: "#5A189A",
    right: "#F5C2D4",
    face: "#FBF1E4",
    ink: "#1e1714",
    depth: "thin",
  });
  const chunky = renderFoil(matrix, { x: 0, y: 0, size: 900 }, {
    top: "#C9184A",
    left: "#5A189A",
    right: "#F5C2D4",
    face: "#FBF1E4",
    ink: "#1e1714",
    depth: "chunky",
  });
  assertEquals(
    (thin.match(/<rect/g) ?? []).length,
    (chunky.match(/<rect/g) ?? []).length,
  );
  assert(thin !== chunky);
  // The first emitted plate is the one furthest back, so a thicker wall pushes
  // it further down-right than a thin one.
  const firstThin = Number(thin.match(/<rect x="([\d.]+)"/)![1]);
  const firstChunky = Number(chunky.match(/<rect x="([\d.]+)"/)![1]);
  assert(
    firstChunky > firstThin,
    `${firstChunky} should sit right of ${firstThin}`,
  );
});

Deno.test("Looks: classic stays the untouched default", () => {
  const svg = buildQrSvgString({ data: DATA, palette: "sunset" });
  assertStringIncludes(svg, 'data-look="classic"');
  assertStringIncludes(svg, 'fill="url(#qrb-eyes)"');
});

Deno.test("Looks: halftone builds from a sample and stays square", () => {
  const svg = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    renderMode: "halftone",
    artSample: halfSample(32),
  });
  assertStringIncludes(svg, 'data-look="halftone"');
  assertStringIncludes(svg, 'shape-rendering="crispEdges"');
  // The halftone floor lifts a short payload to version 11 for a finer grid.
  assertStringIncludes(svg, 'data-modules="49"');
  assertEquals(/matrix\(-0\.866/.test(svg), false);
});

Deno.test("Looks: halftone without artwork falls back to the palette sweep", () => {
  const svg = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    renderMode: "halftone",
  });
  assertStringIncludes(svg, 'data-look="halftone"');
  assertStringIncludes(svg, 'shape-rendering="crispEdges"');
  assertStringIncludes(svg, 'data-modules="49"');
});

Deno.test("Looks: marks rest on the art instead of being dropped", () => {
  for (const mode of ["halftone", "foil"] as const) {
    const svg = buildQrSvgString({
      data: DATA,
      palette: "sunset",
      renderMode: mode,
      artSample: halfSample(32),
      logoUrl: MARK,
    });
    assertStringIncludes(svg, 'data-center-mark="true"');
    assertStringIncludes(svg, 'data-cutout="overlay"');
  }
});

Deno.test("Looks: a look rides along with every palette", () => {
  const resolved = resolveQRStyle("candy", {
    dots: { shape: "dots", color: "#111111" },
    background: { color: "#FBF1E4" },
    renderMode: "halftone",
    artSample: halfSample(8),
    halftoneTone: "dmg",
    halftoneShape: "circle",
  });
  assertEquals(resolved.renderMode, "halftone");
  assertEquals(resolved.halftoneTone, "dmg");
  assertEquals(resolved.halftoneShape, "circle");
  assertEquals(resolved.dots.shape, "dots");
  assertEquals(resolved.dots.color, resolveQRStyle("candy").dots.color);
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

  const badSample = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: { color: "#111111" },
      background: { color: "#FBF1E4" },
      renderMode: "halftone",
      artSample: { n: 8, data: "short" },
    },
  });
  assertEquals(badSample?.customStyle, null);

  const good = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: { color: "#111111" },
      background: { color: "#FBF1E4" },
      renderMode: "halftone",
      halftoneTone: "dmg",
      foilDepth: "thin",
      artSample: halfSample(8),
    },
  });
  assertEquals(good?.customStyle?.halftoneTone, "dmg");
  assertEquals(good?.customStyle?.foilDepth, "thin");
  assertEquals(good?.customStyle?.artSample?.n, 8);
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
  for (const mode of ["classic", "halftone", "foil"] as const) {
    const svg = styledQrSvg({
      size: 3000,
      data: DATA,
      style: {
        ...resolveQRStyle("sunset"),
        renderMode: mode,
        artSample: halfSample(32),
      },
    });
    assert(svg.length > 1000);
    assert(svg.length < 1_500_000, `${mode} SVG is ${svg.length} bytes`);
  }
});

Deno.test("Look sample: RGBA input is stripped, not sliced", () => {
  // A canvas ImageData is RGBA. Taking the first 3/4 of it shifts every pixel
  // and turns a teal hill pink — the bug this test exists to prevent.
  const n = 2;
  const rgba = new Uint8ClampedArray([
    0,
    150,
    136,
    255,
    250,
    230,
    120,
    255,
    12,
    40,
    30,
    255,
    200,
    200,
    200,
    255,
  ]);
  const sample = encodeSample(rgba, n);
  const rgb = decodeSample(sample)!;
  assertEquals(Array.from(rgb), [
    0,
    150,
    136,
    250,
    230,
    120,
    12,
    40,
    30,
    200,
    200,
    200,
  ]);
});

Deno.test("Codewords: the map matches the standard table for every version", () => {
  for (let version = 1; version <= 40; version++) {
    const count = 17 + version * 4;
    const groups = codewordGroups(count);
    assertEquals(
      groups.length,
      TOTAL_CODEWORDS[version - 1],
      `v${version} grouped into ${groups.length} codewords`,
    );
    const flat = groups.flat();
    assertEquals(flat.length, 8 * groups.length);
    assertEquals(remainderBits(version) >= 0, true);
    assertEquals(new Set(flat.map(([r, c]) => `${r},${c}`)).size, flat.length);
    // No function module may ever be handed to the painter.
    const mask = functionMask(count);
    for (const [r, c] of flat) assertEquals(mask[r][c], false);
  }
});

Deno.test("Codewords: flips land on whole codewords inside the budget", () => {
  const count = 49;
  const groups = codewordGroups(count);
  const dark = () => false;
  // Everything wants to be dark: every group scores positive.
  const want = () => 1;
  const budget = 39;
  const picked = chooseFlips(groups, dark, want, budget / groups.length);
  assertEquals(picked.size, budget);
  for (const index of picked) assertEquals(groups[index].length, 8);
});

Deno.test("Codewords: a codeword the picture already agrees with is skipped", () => {
  const groups = [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [
    0,
    7,
  ]]] as [
    number,
    number,
  ][][];
  const allDark = () => true;
  // The code is dark and the picture wants dark: score is negative.
  assertEquals(chooseFlips(groups, allDark, () => 1, 1).size, 0);
});

Deno.test("Looks: sharp halftone spends the budget and still renders", () => {
  const base = {
    data: DATA,
    palette: "sunset" as const,
    renderMode: "halftone" as const,
    artSample: halfSample(32),
    size: 600,
  };
  const soft = buildQrSvgString({ ...base, halftoneDetail: "soft" });
  const sharp = buildQrSvgString({ ...base, halftoneDetail: "sharp" });
  assert(soft !== sharp, "sharp must change the matrix");
  assertEquals(/data-look="halftone"/.test(sharp), true);
});

Deno.test("Looks: sharp gives way to a mark and to a circular plate", () => {
  const base = {
    data: DATA,
    palette: "sunset" as const,
    renderMode: "halftone" as const,
    artSample: halfSample(32),
    halftoneDetail: "sharp" as const,
    size: 600,
  };
  // More margin spent elsewhere must mean fewer modules inverted.
  const plain = buildQrSvgString(base);
  const marked = buildQrSvgString({ ...base, logoUrl: MARK });
  const circled = buildQrSvgString({ ...base, halftoneShape: "circle" });
  const dark = (svg: string) => (svg.match(/h1v1h-1Z/g) ?? []).length;
  assert(plain !== marked);
  assert(plain !== circled);
  assert(dark(plain) > 0 && dark(marked) > 0 && dark(circled) > 0);
});

Deno.test("Print: a riso sheet prints two drums and no gradient", () => {
  const plain = buildQrSvgString({ data: DATA, palette: "sunset", size: 600 });
  const riso = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    size: 600,
    print: "riso",
  });
  // The data plate goes flat: a drum cannot print a gradient.
  assertStringIncludes(plain, 'fill="url(#qrb-dots)"');
  assertEquals(riso.includes('fill="url(#qrb-dots)"'), false);
  // The spot drum carries the registration offset.
  assert(/transform="rotate\(-?[\d.]+ /.test(riso));
  assertStringIncludes(riso, 'data-look="classic"');
});

Deno.test("Print: paper and riso lay tooth under the code, clean does not", () => {
  const at = (print?: "clean" | "paper" | "riso") =>
    buildQrSvgString({ data: DATA, palette: "sunset", size: 600, print });
  assertEquals(at("clean").includes("qrb-tooth"), false);
  assertStringIncludes(at("paper"), 'filter="url(#qrb-tooth)"');
  assertStringIncludes(at("riso"), 'filter="url(#qrb-tooth)"');
});

Deno.test("Print: the same link always comes off the same sheet", () => {
  const once = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    size: 600,
    print: "riso",
  });
  const twice = buildQrSvgString({
    data: DATA,
    palette: "sunset",
    size: 600,
    print: "riso",
  });
  assertEquals(once, twice);
  const other = buildQrSvgString({
    data: "https://qrbuddy.app/other",
    palette: "sunset",
    size: 600,
    print: "riso",
  });
  assert(once !== other, "a different payload is a different sheet");
});

Deno.test("Riso: near-identical palette inks are mixed into a second drum", () => {
  // Classic is one ink in two shades; a press would not print the same colour
  // twice and call the offset a design.
  const [ink, spot] = risoInks(["#1E1B4B", "#0F172A"], "#FFFDF9");
  assert(ink !== spot);
  assert(printContrast(ink, "#FFFDF9") >= 4.6);
  assert(printContrast(spot, "#FFFDF9") >= 4.6);
});

Deno.test("Riso: a palette with two real inks keeps both", () => {
  const [ink, spot] = risoInks(["#C9184A", "#5A189A"], "#FFF8F6");
  // The data drum is the darker ink; the accent is the one furthest from it.
  assertEquals(ink, "#5A189A");
  assertEquals(spot, "#C9184A");
});

Deno.test("Riso: a pale drum is walked down until it can be read", () => {
  // A gradient-designed palette can hand over a pale lavender; a flat drum has
  // to hit density, so it darkens rather than printing the low-contrast code.
  const [ink, spot] = risoInks(["#C9184A", "#F0D0FF"], "#FFF8F6");
  assert(printContrast(spot, "#FFF8F6") >= 4.6);
  assert(printContrast(ink, "#FFF8F6") >= 4.6);
  assert(spot !== "#F0D0FF", "a pale drum has to be walked down");
});

Deno.test("PNG: the control raster is a real greyscale PNG", async () => {
  const count = 21;
  const png = await encodeMatrixPng(
    (row, col) => (row + col) % 3 === 0,
    count,
    {
      scale: 4,
      quiet: 4,
    },
  );
  assertEquals([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  // IHDR is the first chunk: length, "IHDR", width, height, depth, colour.
  assertEquals(view.getUint32(8), 13);
  assertEquals(String.fromCharCode(...png.subarray(12, 16)), "IHDR");
  const side = (count + 8) * 4;
  assertEquals(view.getUint32(16), side);
  assertEquals(view.getUint32(20), side);
  assertEquals(png[24], 8); // bit depth
  assertEquals(png[25], 0); // greyscale
  assertStringIncludes(toDataUrl(png), "data:image/png;base64,");
});

Deno.test("Art: each retry leans harder on the code", () => {
  assertEquals(conditioning(0), 2.6);
  assertEquals(conditioning(1), 3);
  assertEquals(conditioning(2), 3.4);
  // Out-of-range rungs clamp rather than inventing a fourth setting.
  assertEquals(conditioning(-3), 2.6);
  assertEquals(conditioning(9), 3.4);
});

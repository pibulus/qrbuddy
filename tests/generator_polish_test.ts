import { assert, assertEquals, assertNotEquals } from "$std/assert/mod.ts";
import {
  createFramedSvg,
  escapeXml,
  measureCaptionWidth,
} from "../utils/svg-export.ts";
import {
  DEFAULT_DESIGN_PREFERENCES,
  isValidColor,
  isValidCustomStyle,
  loadDesignPreferences,
  MAX_STORED_LOGO_LENGTH,
  resetDesignPreferences,
  saveDesignPreferences,
  STORAGE_KEY,
  validateDesignPreferences,
} from "../utils/design-preferences.ts";
import {
  contrastRatio,
  getQRThemeStyleVars,
  getQRThemeTokens,
  QR_STYLES,
  QR_THEME_TOKENS,
  relativeLuminance,
} from "../utils/qr-styles.ts";
import { rollGradient, STYLE_DISPLAY } from "../islands/StyleSelector.tsx";
import { QUICK_PICK_COLORS } from "../components/GradientCreator.tsx";
import { TEXT_CARD_THEMES } from "../utils/bucket-qr-themes.ts";
import {
  getCardStylesFor,
  getThemeStylesFor,
} from "../islands/FileSlideshow.tsx";
import type { QRStyle } from "../types/qr-types.ts";
import {
  buildGs1DigitalLink,
  computeGs1CheckDigit,
  validateAndNormalizeGtin,
} from "../utils/gs1-digital-link.ts";
import {
  buildQrSvgString,
  toSvgDataUrl,
  validateCanvaSvgCompliance,
  VECTOR_PALETTES,
} from "../utils/qr-vector-svg.ts";
import { DEMO_CONFIGS } from "../routes/demo/[...slug].tsx";
import {
  COMPETITOR_SLUGS,
  COMPETITORS,
  getComparisonNavPills,
  isValidCompetitorSlug,
} from "../utils/comparisons.ts";
import { getLanguageSwitchHref } from "../utils/i18n.ts";

Deno.test("escapeXml - escapes XML special characters safely", () => {
  assertEquals(escapeXml("hello world"), "hello world");
  assertEquals(escapeXml("SCAN & WIN"), "SCAN &amp; WIN");
  assertEquals(escapeXml("<tag>"), "&lt;tag&gt;");
  assertEquals(
    escapeXml("\"quotes\" & 'apostrophes'"),
    "&quot;quotes&quot; &amp; &apos;apostrophes&apos;",
  );
  // Accents and international characters should be preserved in UTF-8
  assertEquals(escapeXml("CAFÉ & MÚSICA"), "CAFÉ &amp; MÚSICA");
});

Deno.test("createFramedSvg - unframed/empty caption generates correct vector card without text", () => {
  const dummyQrSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs><linearGradient id="g1"></linearGradient></defs><rect width="1000" height="1000" fill="url(#g1)"/></svg>`;

  const framed = createFramedSvg(dummyQrSvg, "");
  // Dimensions for no caption: 1128x1128
  assertNotEquals(framed.indexOf('width="1128"'), -1);
  assertNotEquals(framed.indexOf('height="1128"'), -1);
  assertNotEquals(framed.indexOf('fill="#FFFBF5"'), -1);
  assertNotEquals(framed.indexOf('stroke="#000000"'), -1);
  assertNotEquals(
    framed.indexOf('x="64" y="64" width="1000" height="1000"'),
    -1,
  );
  assertEquals(framed.indexOf("<text"), -1);
  // Must preserve gradient references and vector content
  assertNotEquals(framed.indexOf('id="g1"'), -1);
  assertNotEquals(framed.indexOf("url(#g1)"), -1);
});

Deno.test("createFramedSvg - caption inclusion, styling, and safe XML escaping", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;

  const framed = createFramedSvg(dummyQrSvg, "Scan & Win <Now>");
  // Dimensions for caption: 1128x1298
  assertNotEquals(framed.indexOf('width="1128"'), -1);
  assertNotEquals(framed.indexOf('height="1298"'), -1);
  // Caption text is uppercase and XML-escaped
  assertNotEquals(framed.indexOf("SCAN &amp; WIN &lt;NOW&gt;"), -1);
  assertNotEquals(
    framed.indexOf("font-family=\"'Inter Black', Inter, system-ui"),
    -1,
  );
  assertNotEquals(framed.indexOf('dominant-baseline="central"'), -1);
});

Deno.test("createFramedSvg - short caption has 92px font and NO textLength stretching", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;
  const framed = createFramedSvg(dummyQrSvg, "SCAN ME");
  assertNotEquals(framed.indexOf('font-size="92"'), -1);
  assertEquals(framed.indexOf("textLength"), -1); // Natural glyph metrics, no artificial stretch
});

Deno.test("createFramedSvg - wide caption (WWWWWWWWWWWWWWWW) scales font and constrains textLength", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;
  const wideCaption = "WWWWWWWWWWWWWWWW"; // 16 wide glyphs
  const framed = createFramedSvg(dummyQrSvg, wideCaption);

  assertNotEquals(framed.indexOf(wideCaption), -1);
  // Font size must be significantly scaled down from 92 to fit within 1000px
  assertEquals(framed.indexOf('font-size="92"'), -1);
  // Must include textLength and lengthAdjust
  assertNotEquals(framed.indexOf('textLength="1000"'), -1);
  assertNotEquals(framed.indexOf('lengthAdjust="spacingAndGlyphs"'), -1);
});

Deno.test("createFramedSvg - long caption (24 chars) scales font and adds length constraint", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;
  const longCaption = "123456789012345678901234"; // 24 chars
  const framed = createFramedSvg(dummyQrSvg, longCaption);

  assertNotEquals(framed.indexOf(longCaption), -1);
  assertNotEquals(framed.indexOf('textLength="1000"'), -1);
  assertNotEquals(framed.indexOf('lengthAdjust="spacingAndGlyphs"'), -1);
});

Deno.test("createFramedSvg - 13 accented Ws (Ŵ) scale font and constrain textLength", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;
  const accentedCaption = "ŴŴŴŴŴŴŴŴŴŴŴŴŴ"; // 13 wide accented glyphs
  const framed = createFramedSvg(dummyQrSvg, accentedCaption);

  assertNotEquals(framed.indexOf(accentedCaption), -1);
  assertEquals(framed.indexOf('font-size="92"'), -1);
  assertNotEquals(framed.indexOf('textLength="1000"'), -1);
  assertNotEquals(framed.indexOf('lengthAdjust="spacingAndGlyphs"'), -1);
});

Deno.test("createFramedSvg - 13 CJK ideographs (照) scale font and constrain textLength", () => {
  const dummyQrSvg =
    `<svg width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#000"/></svg>`;
  const cjkCaption = "照照照照照照照照照照照照照"; // 13 CJK characters
  const framed = createFramedSvg(dummyQrSvg, cjkCaption);

  assertNotEquals(framed.indexOf(cjkCaption), -1);
  assertEquals(framed.indexOf('font-size="92"'), -1);
  assertNotEquals(framed.indexOf('textLength="1000"'), -1);
  assertNotEquals(framed.indexOf('lengthAdjust="spacingAndGlyphs"'), -1);
});

Deno.test("measureCaptionWidth - Unicode-aware measurement handles accents, CJK, and Latin", () => {
  // 'W' is weighted heavier than 'I'
  const widthW = measureCaptionWidth("WWWW", 100);
  const widthI = measureCaptionWidth("IIII", 100);
  assertNotEquals(widthW > widthI * 2, false);

  // 16 'W's at 92px should exceed 1000px
  const width16W = measureCaptionWidth("WWWWWWWWWWWWWWWW", 92);
  assertEquals(width16W > 1000, true);

  // 13 accented 'Ŵ's at 92px should exceed 1000px
  const width13WCircumflex = measureCaptionWidth("ŴŴŴŴŴŴŴŴŴŴŴŴŴ", 92);
  assertEquals(width13WCircumflex > 1000, true);

  // 13 CJK characters at 92px should exceed 1000px
  const width13CJK = measureCaptionWidth("照照照照照照照照照照照照照", 92);
  assertEquals(width13CJK > 1000, true);

  // 'SCAN ME' at 92px should easily fit in 1000px
  const widthScanMe = measureCaptionWidth("SCAN ME", 92);
  assertEquals(widthScanMe < 600, true);
});

Deno.test("isValidColor - validates supported generated formats and rejects invalid strings", () => {
  // Hex formats
  assertEquals(isValidColor("#fff"), true);
  assertEquals(isValidColor("#123456"), true);
  assertEquals(isValidColor("#12345678"), true);

  // HSL / HSLA formats (used by dice roller and style pickers)
  assertEquals(isValidColor("hsl(120, 65%, 45%)"), true);
  assertEquals(isValidColor("hsl(210, 60%, 96%)"), true);
  assertEquals(isValidColor("hsla(210, 60%, 96%, 0.8)"), true);

  // RGB / RGBA formats
  assertEquals(isValidColor("rgb(255, 255, 255)"), true);
  assertEquals(isValidColor("rgba(0, 0, 0, 0.5)"), true);

  // Keywords
  assertEquals(isValidColor("transparent"), true);
  assertEquals(isValidColor("white"), true);
  assertEquals(isValidColor("black"), true);

  // Arbitrary invalid strings must be rejected
  assertEquals(isValidColor("not-a-colour"), false);
  assertEquals(isValidColor("bad"), false);
  assertEquals(isValidColor(""), false);
  assertEquals(isValidColor("#zzz"), false);
  assertEquals(isValidColor("hsl(bad)"), false);
  assertEquals(isValidColor(123), false);
  assertEquals(isValidColor(null), false);
});

Deno.test("validateDesignPreferences - rejects prototype properties (constructor, toString)", () => {
  const constructorRecord = validateDesignPreferences({
    version: 1,
    style: "constructor",
  });
  assertEquals(constructorRecord?.style, "sunset");

  const toStringRecord = validateDesignPreferences({
    version: 1,
    style: "toString",
  });
  assertEquals(toStringRecord?.style, "sunset");

  const protoRecord = validateDesignPreferences({
    version: 1,
    style: "__proto__",
  });
  assertEquals(protoRecord?.style, "sunset");
});

Deno.test("validateDesignPreferences - rejects malformed nested customStyle (e.g. colorStops: 'bad')", () => {
  const badStops = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: { gradient: { colorStops: "bad" } },
      background: { color: "#fff" },
    },
  });
  assertEquals(badStops?.style, "sunset");
  assertEquals(badStops?.customStyle, null);

  const missingBg = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: { color: "#000" },
    },
  });
  assertEquals(missingBg?.style, "sunset");
  assertEquals(missingBg?.customStyle, null);

  const badStopOffset = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: {
      dots: {
        gradient: {
          type: "linear",
          colorStops: [
            { offset: -0.5, color: "#000" },
            { offset: 1.0, color: "#fff" },
          ],
        },
      },
      background: { color: "#fff" },
    },
  });
  assertEquals(badStopOffset?.style, "sunset");
  assertEquals(badStopOffset?.customStyle, null);
});

Deno.test("validateDesignPreferences - preserves legitimate custom styles from GradientCreator and dice roller", () => {
  const gradientCreatorStyle: QRStyle = {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FF8C42" },
          { offset: 1, color: "#9370DB" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 135,
        colorStops: [
          { offset: 0, color: "#FFF8F020" },
          { offset: 1, color: "#FFE5B410" },
        ],
      },
    },
    cornersSquare: { color: "#FF69B4" },
    cornersDot: { color: "#9370DB" },
  };

  assertEquals(isValidCustomStyle(gradientCreatorStyle), true);
  const validated = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: gradientCreatorStyle,
  });
  assertEquals(validated?.style, "custom");
  assertEquals(validated?.customStyle, gradientCreatorStyle);

  const diceRollerStyle: QRStyle = {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 1.57,
        colorStops: [
          { offset: 0, color: "hsl(120, 70%, 30%)" },
          { offset: 1, color: "hsl(220, 70%, 40%)" },
        ],
      },
    },
    background: { color: "hsl(120, 60%, 96%)" },
    cornersSquare: {
      gradient: {
        type: "linear",
        rotation: 1.57,
        colorStops: [
          { offset: 0, color: "hsl(120, 70%, 30%)" },
          { offset: 1, color: "hsl(220, 70%, 40%)" },
        ],
      },
    },
    cornersDot: {
      gradient: {
        type: "linear",
        rotation: 1.57,
        colorStops: [
          { offset: 0, color: "hsl(120, 70%, 30%)" },
          { offset: 1, color: "hsl(220, 70%, 40%)" },
        ],
      },
    },
  };
  assertEquals(isValidCustomStyle(diceRollerStyle), true);
  const validatedDice = validateDesignPreferences({
    version: 1,
    style: "custom",
    customStyle: diceRollerStyle,
  });
  assertEquals(validatedDice?.style, "custom");
  assertEquals(validatedDice?.customStyle, diceRollerStyle);
});

Deno.test("validateDesignPreferences - invalid types, obsolete versions, and defaults", () => {
  assertEquals(validateDesignPreferences(null), null);
  assertEquals(validateDesignPreferences(undefined), null);
  assertEquals(validateDesignPreferences("string"), null);
  assertEquals(validateDesignPreferences([]), null);
  assertEquals(validateDesignPreferences({ version: 2 }), null); // Unsupported version
  assertEquals(validateDesignPreferences({ version: 0 }), null);
});

Deno.test("validateDesignPreferences - valid preferences with all fields", () => {
  const valid = {
    version: 1,
    style: "candy",
    customStyle: null,
    logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
    frameConfig: { enabled: true, caption: "HELLO" },
    pngSize: 2000,
  };
  const result = validateDesignPreferences(valid);
  assertEquals(result, {
    version: 1,
    style: "candy",
    customStyle: null,
    logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
    frameConfig: { enabled: true, caption: "HELLO" },
    pngSize: 2000,
  });
});

Deno.test("validateDesignPreferences - bounds logo length and truncates long captions", () => {
  const hugeLogo = "data:image/png;base64," +
    "A".repeat(MAX_STORED_LOGO_LENGTH + 10);
  const resultHuge = validateDesignPreferences({
    version: 1,
    style: "sunset",
    logoUrl: hugeLogo,
    frameConfig: { enabled: true, caption: "A".repeat(50) },
  });
  assertEquals(resultHuge?.logoUrl, ""); // Rejected due to excessive size
  assertEquals(resultHuge?.frameConfig?.caption.length, 24); // Truncated to 24
});

Deno.test("Storage resilience - simulated localStorage quota and corruption handling", () => {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, val: string) => {
      storage.set(key, val);
    },
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };

  // Replace global localStorage with mock
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
  });

  try {
    // 1. Initial load with empty storage returns null
    assertEquals(loadDesignPreferences(), null);

    // 2. Saving valid preferences
    const saved = saveDesignPreferences({
      version: 1,
      style: "vapor",
      logoUrl: "",
      frameConfig: { enabled: true, caption: "TEST" },
      pngSize: 3000,
    });
    assertEquals(saved, true);
    assertEquals(loadDesignPreferences()?.style, "vapor");
    assertEquals(loadDesignPreferences()?.pngSize, 3000);

    // 3. Resetting preferences
    assertEquals(resetDesignPreferences(), true);
    assertEquals(loadDesignPreferences()?.style, "sunset");
    assertEquals(loadDesignPreferences()?.pngSize, 1000);
    assertEquals(loadDesignPreferences()?.frameConfig, null);

    // 4. Corrupted storage returns null without throwing
    storage.set(STORAGE_KEY, "invalid json {{{");
    assertEquals(loadDesignPreferences(), null);

    // 5. Quota exhaustion simulation: setItem throws QuotaExceededError
    mockLocalStorage.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    const quotaResult = saveDesignPreferences(DEFAULT_DESIGN_PREFERENCES);
    assertEquals(quotaResult, false); // Fails gracefully without throwing

    // 6. Ensure History storage key is untouched
    assertEquals(storage.has("qrbuddy_history"), false);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: original,
      configurable: true,
    });
  }
});

Deno.test("QR_STYLES & STYLE_DISPLAY - public presets satisfy scannability floor (luminance <= 0.40 or high-contrast >= 10:1) and stay synced", () => {
  for (const [key, display] of Object.entries(STYLE_DISPLAY)) {
    const preset = QR_STYLES[key as keyof typeof QR_STYLES];
    assert(preset, `Preset ${key} must exist in QR_STYLES`);

    if ("gradient" in preset.dots) {
      const dotStops = preset.dots.gradient.colorStops.map((s) => s.color);
      assertEquals(
        display.colors,
        dotStops,
        `STYLE_DISPLAY.${key}.colors must match QR_STYLES.${key} dot colorStops`,
      );

      const bgColors = "gradient" in preset.background
        ? preset.background.gradient.colorStops.map((s) => s.color)
        : [preset.background.color];

      for (const stopColor of dotStops) {
        const lum = relativeLuminance(stopColor);
        assert(
          lum <= 0.40,
          `Preset ${key} dot stop ${stopColor} has luminance ${
            lum.toFixed(3)
          } > 0.40`,
        );
        for (const bgColor of bgColors) {
          const cr = contrastRatio(stopColor, bgColor);
          assert(
            cr >= 2.0,
            `Preset ${key} dot stop ${stopColor} vs bg ${bgColor} has contrast ${
              cr.toFixed(2)
            } < 2.0`,
          );
        }
      }
    } else {
      assert(
        "color" in preset.dots && "color" in preset.background,
        `Solid preset ${key} must define dots.color and background.color`,
      );
      assertEquals(
        display.colors,
        [preset.dots.color, preset.background.color],
        `STYLE_DISPLAY.${key}.colors must match [dots.color, background.color]`,
      );
      const cr = contrastRatio(preset.dots.color, preset.background.color);
      assert(
        cr >= 10.0,
        `Solid preset ${key} must have high contrast >= 10:1, got ${
          cr.toFixed(2)
        }`,
      );
    }
  }
});

Deno.test("rollGradient - avoids muddy olive/brown hues (45°-95°) and satisfies scannability floor", () => {
  for (let i = 0; i < 200; i++) {
    const rolled = rollGradient();
    assert("gradient" in rolled.dots && rolled.dots.gradient);
    assert("color" in rolled.background && rolled.background.color);

    const stops = rolled.dots.gradient.colorStops;
    assertEquals(stops.length, 2);

    const bgColor = rolled.background.color;
    for (const stop of stops) {
      const match = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/.exec(stop.color);
      assert(match, `Expected HSL stop color, got ${stop.color}`);
      const hue = Number(match[1]);
      const sat = Number(match[2]);
      assert(
        hue < 45 || hue > 95,
        `Rolled hue ${hue}° fell into muddy dark-yellow/olive zone (45°–95°)`,
      );
      assert(
        sat >= 75 && sat <= 90,
        `Rolled saturation ${sat}% outside 75%–90%`,
      );

      const lum = relativeLuminance(stop.color);
      assert(
        lum <= 0.40,
        `Rolled stop ${stop.color} luminance ${lum.toFixed(3)} > 0.40`,
      );
      const cr = contrastRatio(stop.color, bgColor);
      assert(
        cr >= 2.0,
        `Rolled stop ${stop.color} vs ${bgColor} contrast ${
          cr.toFixed(2)
        } < 2.0`,
      );
    }
  }
});

Deno.test("QUICK_PICK_COLORS - all 6 curated chips satisfy luminance <= 0.40", () => {
  assertEquals(QUICK_PICK_COLORS.length, 6);
  for (const chip of QUICK_PICK_COLORS) {
    const lum = relativeLuminance(chip.color);
    assert(
      lum <= 0.40,
      `Quick-pick chip ${chip.name} (${chip.color}) luminance ${
        lum.toFixed(3)
      } > 0.40`,
    );
  }
});

Deno.test("FileSlideshow & TEXT_CARD_THEMES - cover all 10 styles with daylight pastel-punk and intentional dark modes", () => {
  const daylightPresets = [
    "sunset",
    "candy",
    "blush",
    "matcha",
    "pool",
    "vapor",
    "grape",
  ];
  for (const theme of daylightPresets) {
    assert(TEXT_CARD_THEMES[theme], `TEXT_CARD_THEMES missing ${theme}`);
    const pageClass = getThemeStylesFor(theme);
    const cardClass = getCardStylesFor(theme);
    assert(
      !pageClass.includes("to-black"),
      `Daylight theme ${theme} should not force gloomy to-black backdrop`,
    );
    assert(
      cardClass.includes("border-4 border-black") &&
        cardClass.includes("shadow-chunky"),
      `Daylight theme ${theme} card should use Neo-Toybrut border-4 border-black shadow-chunky`,
    );
  }

  for (const darkTheme of ["noir", "terminal"]) {
    assert(
      TEXT_CARD_THEMES[darkTheme],
      `TEXT_CARD_THEMES missing ${darkTheme}`,
    );
    const cardClass = getCardStylesFor(darkTheme);
    assert(cardClass.includes("border-4"));
  }
  assert(TEXT_CARD_THEMES.brutalist);
});

Deno.test("GS1 Digital Link - computes Mod-10 check digits and validates GTIN-8/12/13/14", () => {
  // Valid GTIN-14: 09312345678907 (check digit 7)
  assertEquals(computeGs1CheckDigit("0931234567890"), 7);
  const valid14 = validateAndNormalizeGtin("09312345678907");
  assertEquals(valid14.valid, true);
  assertEquals(valid14.normalizedGtin14, "09312345678907");
  assertEquals(valid14.expectedCheckDigit, 7);

  // Valid EAN-13: 9312345678907 -> normalized to 14 digits with leading 0
  const valid13 = validateAndNormalizeGtin("9312345678907");
  assertEquals(valid13.valid, true);
  assertEquals(valid13.normalizedGtin14, "09312345678907");

  // Invalid check digit (ends in 4 instead of 7)
  const badCheck = validateAndNormalizeGtin("09312345678904");
  assertEquals(badCheck.valid, false);
  assertEquals(badCheck.expectedCheckDigit, 7);
  assertEquals(badCheck.providedCheckDigit, 4);

  // Invalid length (10 digits)
  const badLen = validateAndNormalizeGtin("1234567890");
  assertEquals(badLen.valid, false);

  // Full GS1 Digital Link URI assembly
  const link = buildGs1DigitalLink({
    domain: "solbotanicals.co",
    gtin: "9312345678907",
    lot: "BATCH-04",
    expiry: "271231",
    serial: "SN99",
  });
  assertEquals(
    link,
    "https://solbotanicals.co/01/09312345678907/10/BATCH-04/21/SN99/17/271231",
  );
});

Deno.test("Pure-TS Vector SVG Builder - generates Canva & Figma compliant SVG 1.1 across all palettes", () => {
  for (const [key, palette] of Object.entries(VECTOR_PALETTES)) {
    if (key === "terminal" || key === "brutalist") {
      assert(
        contrastRatio(palette.c1, palette.bg) >= 10.0,
        `VECTOR_PALETTES.${key} contrast must be >= 10:1`,
      );
    } else {
      assert(
        relativeLuminance(palette.c1) <= 0.40,
        `VECTOR_PALETTES.${key}.c1 luminance > 0.40`,
      );
      assert(
        relativeLuminance(palette.c2) <= 0.40,
        `VECTOR_PALETTES.${key}.c2 luminance > 0.40`,
      );
    }

    const svgFramed = buildQrSvgString({
      data: "https://qrbuddy.app/for/menus",
      palette: key,
      caption: "SCAN ME",
    });
    const complianceFramed = validateCanvaSvgCompliance(svgFramed);
    assertEquals(
      complianceFramed.valid,
      true,
      `Framed SVG for ${key} failed compliance: ${
        complianceFramed.errors.join(", ")
      }`,
    );
    assert(svgFramed.includes("SCAN ME"));

    const svgUnframed = buildQrSvgString({
      data: "https://qrbuddy.app",
      palette: key,
      caption: "",
    });
    const complianceUnframed = validateCanvaSvgCompliance(svgUnframed);
    assertEquals(complianceUnframed.valid, true);
    assertEquals(svgUnframed.includes("<text"), false);

    const dataUrl = toSvgDataUrl(svgUnframed);
    assert(dataUrl.startsWith("data:image/svg+xml;base64,"));
  }
});

Deno.test("Competitor Comparisons & i18n - complete EN/ES coverage and Sovereign Voice compliance", () => {
  assertEquals(COMPETITOR_SLUGS.length, 4);
  for (const slug of COMPETITOR_SLUGS) {
    assert(isValidCompetitorSlug(slug));
    const entry = COMPETITORS[slug];
    assert(entry);
    for (const locale of ["en", "es"] as const) {
      const copy = entry[locale];
      assert(copy.valueCards.length >= 3);
      assert(copy.comparisonItems.length >= 5);
      assert(copy.faqItems.length >= 3);

      // Verify Sovereign Voice on English copy: zero "you" or "your"
      if (locale === "en") {
        const allText = [
          copy.title,
          copy.tagline,
          copy.subtagline,
          ...copy.valueCards.map((c) => `${c.title} ${c.desc}`),
          ...copy.comparisonItems.map((i) =>
            `${i.feature} ${i.free} ${i.supporter}`
          ),
          ...copy.faqItems.map((f) => `${f.q} ${f.a}`),
        ].join(" ");
        assertEquals(
          /\b(you|your|yours)\b/i.test(allText),
          false,
          `Competitor ${slug} EN copy contains second-person pronoun`,
        );
      }
    }
  }

  assertEquals(getComparisonNavPills("en", "qrio").length, 5);
  assertEquals(getComparisonNavPills("es", "bitly").length, 5);

  // Verify bidirectional EN <-> ES route switching for all new tool & vs routes
  const pairs: [string, string][] = [
    ["/for/wifi", "/es/wifi"],
    ["/for/vcard", "/es/vcard"],
    ["/for/gs1", "/es/gs1"],
    ["/for/inspect", "/es/escanear"],
    ["/vs/qrio", "/es/vs/qrio"],
    ["/vs/qrfy", "/es/vs/qrfy"],
    ["/vs/bitly", "/es/vs/bitly"],
    ["/vs/qr-code-generator", "/es/vs/qr-code-generator"],
  ];
  for (const [enPath, esPath] of pairs) {
    assertEquals(getLanguageSwitchHref(enPath, "es"), esPath);
    assertEquals(getLanguageSwitchHref(esPath, "en"), enPath);
  }
});

Deno.test("QR_THEME_TOKENS & getQRThemeTokens - sync active QR palette across all presets + custom gradients with sharp #1e1714 contrast", () => {
  const ink = "#1e1714";
  for (const key of Object.keys(QR_STYLES)) {
    assert(
      key in QR_THEME_TOKENS,
      `Missing QR_THEME_TOKENS entry for style "${key}"`,
    );
    const tokens = getQRThemeTokens(key);
    const vars = getQRThemeStyleVars(key);
    assertEquals(vars["--qr-theme-accent"], tokens.accent);
    assertEquals(vars["--qr-theme-tint-strong"], tokens.tintStrong);
    assertEquals(vars["--qr-theme-cta-bg"], tokens.ctaBg);

    for (
      const [tokenName, hex] of [
        ["tint", tokens.tint],
        ["tintStrong", tokens.tintStrong],
        ["ctaBg", tokens.ctaBg],
        ["ctaHover", tokens.ctaHover],
        ["ctaActive", tokens.ctaActive],
      ] as const
    ) {
      const ratio = contrastRatio(hex, ink);
      assert(
        ratio >= 4.5,
        `Style "${key}" token ${tokenName} (${hex}) contrast against #1e1714 is ${
          ratio.toFixed(2)
        } (< 4.5:1)`,
      );
    }
  }

  // Custom gradient style derives theme tokens from the custom stop
  const customStyle: QRStyle = {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#0D47A1" },
          { offset: 1, color: "#00695C" },
        ],
      },
    },
    background: { color: "#FFFFFF" },
  };
  const customTokens = getQRThemeTokens("custom", customStyle);
  assertEquals(customTokens.accent, "#0D47A1");
  assert(contrastRatio(customTokens.tintStrong, ink) >= 4.5);
  assert(contrastRatio(customTokens.ctaBg, ink) >= 4.5);
});

Deno.test("Roulette Scan Page - CTA hierarchy, 14px button gap, themed respin tint, and deduplicated quota copy", async () => {
  const redirectSrc = await Deno.readTextFile(
    new URL("../supabase/functions/redirect-qr/index.ts", import.meta.url),
  );

  // 1. Primary payoff CTA (#roulette-cta) renders BEFORE secondary respin button (${rouletteRespinHtml})
  const ctaIdx = redirectSrc.indexOf('id="roulette-cta"');
  const respinIdx = redirectSrc.indexOf("${rouletteRespinHtml}");
  assert(ctaIdx !== -1 && respinIdx !== -1, "Both CTAs must exist in template");
  assert(
    ctaIdx < respinIdx,
    "Open Winner (#roulette-cta) must precede Spin again (${rouletteRespinHtml}) in DOM order",
  );

  // 2. .respin-btn uses >= 14px top margin to clear the 4px neo-brutalist offset shadow and binds to var(--accent)
  assert(redirectSrc.includes("margin-top: 14px;"));
  assert(
    redirectSrc.includes("color-mix(in srgb, var(--accent) 16%, #fffef7)"),
  );
  assertEquals(redirectSrc.includes("#fef3c7"), false);

  // 3. Spin quota is shown in #roulette-badge and not duplicated as "(X left today)" inside #roulette-respin-label
  assertEquals(redirectSrc.includes("left today)"), false);
});

Deno.test("FooterDock & VerticalStudio - Uses menu label, popularity ordering, SSR QR fallback, and live /demo/* destinations", async () => {
  const footerSrc = await Deno.readTextFile(
    new URL("../islands/FooterDock.tsx", import.meta.url),
  );
  assert(
    footerSrc.includes('solutions: "Uses"'),
    'FooterDock EN menu trigger must say "Uses" instead of heavy "Solutions"',
  );
  assert(
    footerSrc.includes('solutions: "Usos"'),
    'FooterDock ES menu trigger must say "Usos"',
  );

  // Popularity ordering: Menus -> Wi-Fi -> vCard -> Weddings -> Music -> Lockers -> Inspect -> Print -> Compare -> GS1
  const menusIdx = footerSrc.indexOf('href: "/for/menus"');
  const wifiIdx = footerSrc.indexOf('href: "/for/wifi"');
  const vcardIdx = footerSrc.indexOf('href: "/for/vcard"');
  const weddingsIdx = footerSrc.indexOf('href: "/for/weddings"');
  const musicIdx = footerSrc.indexOf('href: "/for/music"');
  const lockersIdx = footerSrc.indexOf('href: "/for/lockers"');
  const gs1Idx = footerSrc.indexOf('href: "/for/gs1"');
  assert(
    menusIdx < wifiIdx &&
      wifiIdx < vcardIdx &&
      vcardIdx < weddingsIdx &&
      weddingsIdx < musicIdx &&
      musicIdx < lockersIdx &&
      lockersIdx < gs1Idx,
    "FooterDock links must be ordered by real-world popularity and usability",
  );

  // QRCanvas SSR vector fallback is always rendered when !qrReady (not gated behind !url.value)
  const canvasSrc = await Deno.readTextFile(
    new URL("../islands/QRCanvas.tsx", import.meta.url),
  );
  assertEquals(
    canvasSrc.includes("{!qrReady && !url.value &&"),
    false,
    "QRCanvas must not gate the pre-hydration QR image on !url.value",
  );
  assert(
    canvasSrc.includes("{!qrReady && ("),
    "QRCanvas must render an inline vector SVG or default image whenever !qrReady",
  );

  // All 6 DEMO_CONFIGS exist with both front items and back-of-card Field Report stats
  for (
    const key of [
      "menu",
      "wedding",
      "mixtape",
      "drop",
      "vcard",
      "gs1",
    ] as const
  ) {
    const cfg = DEMO_CONFIGS[key];
    assert(cfg, `Missing DEMO_CONFIGS.${key}`);
    assert(cfg.frontItems.length >= 3, `${key} must have >= 3 front items`);
    assertEquals(cfg.stats.bars.length, 7);
    assert(cfg.stats.scans30d.length > 0);
  }

  // Tailored module & eye shapes in buildQrSvgString
  for (
    const shape of [
      "rounded",
      "dots",
      "classy-rounded",
      "classy",
      "extra-rounded",
      "square",
    ] as const
  ) {
    const svg = buildQrSvgString({
      data: "https://qrbuddy.app/demo/menu",
      palette: "sunset",
      dotShape: shape,
      cornerSquareShape: shape === "dots" ? "dot" : "extra-rounded",
    });
    const compliance = validateCanvaSvgCompliance(svg);
    assertEquals(
      compliance.valid,
      true,
      `Shape ${shape} failed SVG compliance: ${compliance.errors.join(", ")}`,
    );
  }
});

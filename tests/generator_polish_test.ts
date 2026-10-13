import { assertEquals, assertNotEquals } from "$std/assert/mod.ts";
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
import type { QRStyle } from "../types/qr-types.ts";

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

import { assert, assertEquals, assertStringIncludes } from "$std/assert/mod.ts";
import {
  createNeutralFiniteQrPreviewResponse,
  isLinkPreviewBot,
} from "../supabase/functions/_shared/dynamic-qr-preview.ts";
import {
  buildDynamicQRUpdatePayload,
  extractOwnerTokenFromEditUrl,
  extractShortCodeFromRedirectUrl,
  hydrateBehaviorStateFromConfig,
  normalizeServerQRToSavedConfig,
} from "../hooks/useDynamicQR.ts";
import {
  buildDynamicBatchManifestCsv,
  persistMintedBatchRow,
} from "../islands/BatchStudio.tsx";
import { getHistory, MAX_HISTORY_ITEMS } from "../utils/history.ts";
import { getOwnerToken } from "../utils/token-vault.ts";

Deno.test("recognized link preview agents receive a neutral response", async () => {
  assertEquals(isLinkPreviewBot("facebookexternalhit/1.1"), true);
  assertEquals(isLinkPreviewBot("Slackbot-LinkExpanding 1.0"), true);
  assertEquals(isLinkPreviewBot("Mozilla/5.0 (iPhone) AppleWebKit"), false);

  const response = createNeutralFiniteQrPreviewResponse({});
  const body = await response.text();
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Location"), null);
  assertEquals(response.headers.get("Cache-Control"), "no-store, max-age=0");
  assertStringIncludes(body, "QRBuddy link");
  assertStringIncludes(body, "Scan this QR code to continue");
  assertEquals(body.includes("https://destination.example/secret"), false);
  assert(response.headers.get("X-Robots-Tag")?.includes("noindex"));
});

Deno.test("extracts owner token and short code from minted dynamic QR URLs", () => {
  assertEquals(
    extractOwnerTokenFromEditUrl("https://qrbuddy.app/edit?token=tok_abc123"),
    "tok_abc123",
  );
  assertEquals(
    extractOwnerTokenFromEditUrl("/edit?token=tok_rel_99"),
    "tok_rel_99",
  );
  assertEquals(extractOwnerTokenFromEditUrl("https://qrbuddy.app/edit"), null);

  assertEquals(
    extractShortCodeFromRedirectUrl("https://qrbuddy.app/r?code=ab12cd"),
    "ab12cd",
  );
  assertEquals(
    extractShortCodeFromRedirectUrl("https://qrbuddy.app/r?c=xy98zw"),
    "xy98zw",
  );
  assertEquals(extractShortCodeFromRedirectUrl("https://example.com"), null);
});

Deno.test("buildDynamicQRUpdatePayload persists roulette, intro page, limits, and pause on minted QRs", () => {
  const result = buildDynamicQRUpdatePayload({
    ownerToken: "tok_minted_001",
    destinationUrl: "https://qrbuddy.app/r?code=mint01",
    redirectUrl: "https://qrbuddy.app/r?code=mint01",
    isSequential: true,
    sequentialUrls: ["acme.test/prize-a", "https://acme.test/prize-b", ""],
    loopSequence: true,
    randomSequence: true,
    dailySpins: 3,
    splashConfig: {
      enabled: true,
      title: "  Spin the Wheel  ",
      buttonText: " Reveal ",
      description: "Daily prize draw",
      brandName: "Acme Cafe",
      accentColor: "#ff66aa",
      unbranded: true,
    },
    scanLimit: 150,
    expiryDate: "2027-05-01T12:00:00.000Z",
    isActive: false,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // Self-redirect guard: destination_url resolves to validUrls[0], never the /r?code= short link
  assertEquals(result.payload.owner_token, "tok_minted_001");
  assertEquals(result.payload.destination_url, "https://acme.test/prize-a");
  assertEquals(result.payload.routing_mode, "sequential");
  assertEquals(result.payload.routing_config, {
    urls: ["https://acme.test/prize-a", "https://acme.test/prize-b"],
    loop: true,
    random: true,
    dailySpins: 3,
  });
  assertEquals(result.payload.splash_config, {
    enabled: true,
    title: "Spin the Wheel",
    buttonText: "Reveal",
    description: "Daily prize draw",
    brandName: "Acme Cafe",
    accentColor: "#ff66aa",
    unbranded: true,
  });
  assertEquals(result.payload.max_scans, 150);
  assertEquals(result.payload.expires_at, "2027-05-01T12:00:00.000Z");
  assertEquals(result.payload.is_active, false);
});

Deno.test("buildDynamicQRUpdatePayload clears optional rules cleanly in simple mode and validates inputs", () => {
  const simple = buildDynamicQRUpdatePayload({
    ownerToken: "tok_simple_01",
    destinationUrl: "https://menu.example/lunch",
    redirectUrl: "https://qrbuddy.app/r?code=smp001",
    isSequential: false,
    sequentialUrls: ["", ""],
    loopSequence: false,
    splashConfig: null,
    scanLimit: null,
    expiryDate: "",
    isActive: true,
  });

  assertEquals(simple.ok, true);
  if (simple.ok) {
    assertEquals(simple.payload, {
      owner_token: "tok_simple_01",
      destination_url: "https://menu.example/lunch",
      max_scans: null,
      expires_at: null,
      is_active: true,
      routing_mode: "simple",
      routing_config: null,
      splash_config: null,
    });
  }

  // Rejects self-redirect when simple mode has no other valid destination
  const selfLoop = buildDynamicQRUpdatePayload({
    ownerToken: "tok_simple_01",
    destinationUrl: "https://qrbuddy.app/r?code=smp001",
    redirectUrl: "https://qrbuddy.app/r?code=smp001",
    isSequential: false,
    sequentialUrls: ["", ""],
    loopSequence: false,
    splashConfig: null,
    scanLimit: null,
    expiryDate: "",
  });
  assertEquals(selfLoop.ok, false);

  // Rejects sequential mode with fewer than 2 valid URLs
  const tooFewSequential = buildDynamicQRUpdatePayload({
    ownerToken: "tok_simple_01",
    destinationUrl: "https://menu.example/lunch",
    isSequential: true,
    sequentialUrls: ["https://menu.example/only-one", ""],
    loopSequence: true,
    splashConfig: null,
    scanLimit: null,
    expiryDate: "",
  });
  assertEquals(tooFewSequential.ok, false);
});

Deno.test("normalizeServerQRToSavedConfig and hydrateBehaviorStateFromConfig restore saved rules on modal reopen", () => {
  const saved = normalizeServerQRToSavedConfig({
    short_code: "hydr01",
    destination_url: "https://acme.test/one",
    expires_at: "2027-08-15T18:30:00.000Z",
    max_scans: 42,
    is_active: false,
    routing_mode: "sequential",
    routing_config: JSON.stringify({
      urls: ["https://acme.test/one", "https://acme.test/two"],
      loop: true,
      random: true,
      dailySpins: 5,
    }),
    splash_config: {
      enabled: true,
      title: "Tap to enter",
      buttonText: "Go",
      accentColor: "#eb6f92",
    },
  });

  const hydrated = hydrateBehaviorStateFromConfig(saved);
  assertEquals(hydrated.destinationUrl, "https://acme.test/one");
  assertEquals(hydrated.isSequential, true);
  assertEquals(hydrated.sequentialUrls, [
    "https://acme.test/one",
    "https://acme.test/two",
  ]);
  assertEquals(hydrated.loopSequence, true);
  assertEquals(hydrated.randomSequence, true);
  assertEquals(hydrated.dailySpins, 5);
  assertEquals(hydrated.splashConfig?.title, "Tap to enter");
  assertEquals(hydrated.scanLimit, 42);
  assertEquals(hydrated.expiryDate.length, 16);
  assertEquals(hydrated.isActive, false);
});

Deno.test("batch minting vaults owner tokens, retains >50 items in history, and builds manifest.csv", async () => {
  localStorage.clear();
  assertEquals(MAX_HISTORY_ITEMS, 200);

  const batchSize = 60;
  const results = [];
  for (let i = 1; i <= batchSize; i++) {
    const code = `bch${String(i).padStart(3, "0")}`;
    const token = `tok_secret_${String(i).padStart(3, "0")}`;
    const row = {
      index: i,
      label: `Table ${i}, Patio`,
      destination: "https://acme.test/shared-menu",
    };
    const created = {
      short_code: code,
      redirect_url: `https://qrbuddy.app/r?code=${code}`,
      edit_url: `https://qrbuddy.app/edit?token=${token}`,
      owner_token: token,
    };

    const persisted = await persistMintedBatchRow(row, created, localStorage);
    assertEquals(persisted.vaulted, true);
    assertEquals(persisted.historySaved, true);

    results.push({
      ...row,
      status: "created" as const,
      shortCode: created.short_code,
      redirectUrl: created.redirect_url,
      editUrl: created.edit_url,
    });
  }

  // Every minted owner_token is recoverable from TokenVault
  assertEquals(await getOwnerToken("qr", "bch001"), "tok_secret_001");
  assertEquals(await getOwnerToken("qr", "bch060"), "tok_secret_060");

  // All 60 rows remain in local history without evicting at 20 or 50, even with identical destination URLs
  const history = getHistory(localStorage);
  assertEquals(history.length, 60);
  assertEquals(history[0].metadata?.shortCode, "bch060");
  assertEquals(history[59].metadata?.shortCode, "bch001");
  assertEquals(history[0].metadata?.label, "Table 60, Patio");
  assertEquals(
    history[0].metadata?.editUrl,
    "https://qrbuddy.app/edit?token=tok_secret_060",
  );

  // Manifest CSV includes quoted labels and edit_url backup columns
  const manifest = buildDynamicBatchManifestCsv(results.slice(0, 2));
  assertEquals(
    manifest,
    [
      "label,destination,short_url,edit_url",
      '"Table 1, Patio",https://acme.test/shared-menu,https://qrbuddy.app/r?code=bch001,https://qrbuddy.app/edit?token=tok_secret_001',
      '"Table 2, Patio",https://acme.test/shared-menu,https://qrbuddy.app/r?code=bch002,https://qrbuddy.app/edit?token=tok_secret_002',
    ].join("\n"),
  );

  localStorage.clear();
});

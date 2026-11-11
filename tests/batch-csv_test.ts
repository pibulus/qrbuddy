import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  BATCH_DRAFT_STORAGE_KEY,
  buildBatchStickerSheetHtml,
  buildDynamicBatchManifestCsv,
  buildStyledBatchQrSvg,
  consumeBatchDraft,
  DEFAULT_BATCH_MODE,
  expandSequenceExpressions,
  parseBatchCsv,
  persistMintedBatchRow,
} from "../islands/BatchStudio.tsx";
import { stashBatchDraft } from "../components/extras/BatchSettings.tsx";
import { parseBatchRows } from "../hooks/useBatchGenerator.ts";
import { getHistory } from "../utils/history.ts";
import { getOwnerToken } from "../utils/token-vault.ts";

Deno.test("batch CSV accepts a header row with url and title", () => {
  const { rows, skipped } = parseBatchCsv(
    "url,title\nhttps://acme.test/menu,Table 1\nhttps://acme.test/menu,Table 2",
  );
  assertEquals(rows.length, 2);
  assertEquals(skipped, 0);
  assertEquals(rows[0], {
    index: 1,
    label: "Table 1",
    destination: "https://acme.test/menu",
  });
  assertEquals(rows[1].label, "Table 2");
});

Deno.test("batch CSV without a header treats column 1 as destination", () => {
  const { rows } = parseBatchCsv(
    "https://acme.test/a,Line A\nhttps://acme.test/b,Line B",
  );
  assertEquals(rows.length, 2);
  assertEquals(rows[1].label, "Line B");
});

Deno.test("batch CSV honours quoted cells and commas inside labels", () => {
  const { rows } = parseBatchCsv(
    'url,title\nhttps://acme.test/x,"Carton 4, aisle 2"',
  );
  assertEquals(rows.length, 1);
  assertEquals(rows[0].label, "Carton 4, aisle 2");
});

Deno.test("batch CSV skips rows without an http destination", () => {
  const { rows, skipped } = parseBatchCsv(
    "url,title\nhttps://acme.test/ok,Fine\nnot-a-url,Broken\ntel:+123,Phone",
  );
  assertEquals(rows.length, 1);
  assertEquals(skipped, 2);
});

Deno.test("batch CSV reports a clear error when nothing is usable", () => {
  const result = parseBatchCsv("nonsense\nalso nonsense");
  assertEquals(result.rows.length, 0);
  assertEquals(typeof result.error, "string");
});

Deno.test("batch CSV handles empty input without throwing", () => {
  const result = parseBatchCsv("   ");
  assertEquals(result.rows.length, 0);
});

Deno.test("batch dynamic rows vault owner tokens and export manifest.csv", async () => {
  localStorage.clear();

  await persistMintedBatchRow(
    { label: "Carton 1", destination: "https://acme.test/c1" },
    {
      short_code: "crt001",
      redirect_url: "https://qrbuddy.app/r?code=crt001",
      edit_url: "https://qrbuddy.app/edit?token=tok_crt001",
      owner_token: "tok_crt001",
    },
    localStorage,
  );

  assertEquals(await getOwnerToken("qr", "crt001"), "tok_crt001");
  const history = getHistory(localStorage);
  assertEquals(history.length, 1);
  assertEquals(history[0].metadata?.shortCode, "crt001");

  const manifest = buildDynamicBatchManifestCsv([
    {
      index: 1,
      label: "Carton 1",
      destination: "https://acme.test/c1",
      status: "created",
      shortCode: "crt001",
      redirectUrl: "https://qrbuddy.app/r?code=crt001",
      editUrl: "https://qrbuddy.app/edit?token=tok_crt001",
    },
    {
      index: 2,
      label: "Broken row",
      destination: "https://acme.test/c2",
      status: "failed",
      error: "Quota reached",
    },
  ]);

  assertEquals(
    manifest,
    "label,destination,short_url,edit_url\nCarton 1,https://acme.test/c1,https://qrbuddy.app/r?code=crt001,https://qrbuddy.app/edit?token=tok_crt001",
  );

  localStorage.clear();
});

Deno.test("expandSequenceExpressions expands {1..5}, zero-padded {01..12}, pipe & CSV formats, and caps at maxRows", () => {
  // Basic {1..5}
  assertEquals(
    expandSequenceExpressions("https://x.co/item-{1..5}").split("\n"),
    [
      "https://x.co/item-1",
      "https://x.co/item-2",
      "https://x.co/item-3",
      "https://x.co/item-4",
      "https://x.co/item-5",
    ],
  );

  // Zero-padded {01..12} preserves leading zero width through 09 -> 10..12
  const padded = expandSequenceExpressions(
    "https://venue.co/bin/{01..12},Bin {01..12}",
  ).split("\n");
  assertEquals(padded.length, 12);
  assertEquals(padded[0], "https://venue.co/bin/01,Bin 01");
  assertEquals(padded[8], "https://venue.co/bin/09,Bin 09");
  assertEquals(padded[9], "https://venue.co/bin/10,Bin 10");
  assertEquals(padded[11], "https://venue.co/bin/12,Bin 12");

  // Lockstep pipe format: Table {1..3} | https://x.co/{1..3}
  assertEquals(
    expandSequenceExpressions("Table {1..3} | https://x.co/{1..3}").split("\n"),
    [
      "Table 1 | https://x.co/1",
      "Table 2 | https://x.co/2",
      "Table 3 | https://x.co/3",
    ],
  );

  // CSV format with header row + maxRows cap
  const cappedWithHeader = expandSequenceExpressions(
    "url,title\nhttps://venue.co/t/{1..50},Table {1..50}",
    5,
  );
  const parsedCsv = parseBatchCsv(cappedWithHeader);
  assertEquals(parsedCsv.rows.length, 5);
  assertEquals(parsedCsv.rows[0], {
    index: 1,
    label: "Table 1",
    destination: "https://venue.co/t/1",
  });
  assertEquals(parsedCsv.rows[4].label, "Table 5");

  // Default 200-row safety cap on huge sequence
  assertEquals(
    expandSequenceExpressions("https://x.co/{1..999}").split("\n").length,
    200,
  );

  // Inverted or malformed ranges are left untouched without throwing
  assertEquals(
    expandSequenceExpressions("https://x.co/{5..1}"),
    "https://x.co/{5..1}",
  );
  assertEquals(
    expandSequenceExpressions("https://x.co/{a..z}"),
    "https://x.co/{a..z}",
  );

  // CreateModal Bulk hook integration: 15-row sequence live count & parsing
  const modalRows = parseBatchRows("Table {1..15} | https://menu.co?t={1..15}");
  assertEquals(modalRows.length, 15);
  assertEquals(modalRows[0].label, "Table 1");
  assertEquals(modalRows[14].label, "Table 15");
  assertEquals(modalRows[14].url, "https://menu.co?t=15");
});

Deno.test("BatchStudio renders styled palette SVGs and paginated A4/Letter 3x4 & 4x6 sticker sheets", () => {
  const sunsetSvg = buildStyledBatchQrSvg("https://acme.test/menu", "sunset", {
    caption: "Table 01",
  });
  assert(sunsetSvg.includes("#F97316"));
  assert(sunsetSvg.includes("TABLE 01"));

  const forestSvg = buildStyledBatchQrSvg("https://acme.test/menu", "matcha");
  assert(forestSvg.includes("#15803D"));

  const items = Array.from({ length: 14 }, (_, idx) => ({
    data: `https://acme.test/t/${idx + 1}`,
    caption: `Table ${idx + 1} <VIP>`,
    sublabel: `t0${idx + 1}`,
  }));

  // 14 items on 3x4 (12/page) -> 2 sheet pages, Letter size
  const sheet3x4 = buildBatchStickerSheetHtml({
    items,
    palette: "pool",
    paperSize: "Letter",
    grid: "3x4",
  });
  assert(sheet3x4.includes("@page { size: letter portrait;"));
  assert(sheet3x4.includes("repeat(3, minmax(0, 1fr))"));
  assertEquals((sheet3x4.match(/class="sheet-page"/g) ?? []).length, 2);
  assert(sheet3x4.includes("Table 1 &lt;VIP&gt;"));
  assert(sheet3x4.includes("break-inside: avoid"));
  assertEquals(/#(?:fff|ffffff|000|000000)\b/i.test(sheet3x4), false);

  // 14 items on 4x6 (24/page) -> 1 sheet page, A4 size
  const sheet4x6 = buildBatchStickerSheetHtml({
    items,
    palette: "blush",
    paperSize: "A4",
    grid: "4x6",
  });
  assert(sheet4x6.includes("@page { size: A4 portrait;"));
  assert(sheet4x6.includes("repeat(4, minmax(0, 1fr))"));
  assertEquals((sheet4x6.match(/class="sheet-page"/g) ?? []).length, 1);
});

Deno.test("BatchStudio defaults to offline Static SVGs mode and carries Bulk ZIP drafts once via sessionStorage", () => {
  assertEquals(DEFAULT_BATCH_MODE, "images");
  assertEquals(BATCH_DRAFT_STORAGE_KEY, "qrbuddy_batch_draft");

  const fakeSession = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => fakeSession.get(k) ?? null,
    setItem: (k: string, v: string) => {
      fakeSession.set(k, v);
    },
    removeItem: (k: string) => {
      fakeSession.delete(k);
    },
  };

  assertEquals(stashBatchDraft("   ", mockStorage), false);
  assertEquals(consumeBatchDraft(mockStorage), null);

  const draft = "Table {01..08} | https://venue.example/table/{01..08}";
  assertEquals(stashBatchDraft(`  ${draft}\n`, mockStorage), true);
  assertEquals(mockStorage.getItem(BATCH_DRAFT_STORAGE_KEY), draft);

  const handedOff = consumeBatchDraft(mockStorage);
  assertEquals(handedOff, draft);
  // Cleared immediately upon consumption so future visits start fresh
  assertEquals(mockStorage.getItem(BATCH_DRAFT_STORAGE_KEY), null);
  assertEquals(consumeBatchDraft(mockStorage), null);

  const { rows, skipped } = parseBatchCsv(handedOff!);
  assertEquals(rows.length, 8);
  assertEquals(skipped, 0);
  assertEquals(rows[0].label, "Table 01");
  assertEquals(rows[7].destination, "https://venue.example/table/08");
});

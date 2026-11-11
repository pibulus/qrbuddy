import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  buildDynamicBatchManifestCsv,
  parseBatchCsv,
  persistMintedBatchRow,
} from "../islands/BatchStudio.tsx";
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

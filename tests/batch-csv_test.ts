import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { parseBatchCsv } from "../islands/BatchStudio.tsx";

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

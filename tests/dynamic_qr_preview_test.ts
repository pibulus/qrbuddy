import { assert, assertEquals, assertStringIncludes } from "$std/assert/mod.ts";
import {
  createNeutralFiniteQrPreviewResponse,
  isLinkPreviewBot,
} from "../supabase/functions/_shared/dynamic-qr-preview.ts";

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

// Basic integration tests for Supabase Edge Functions
// Run with: deno test --allow-net --allow-env tests/edge-functions_test.ts

import { assertEquals, assertExists } from "$std/assert/mod.ts";
import { load } from "$std/dotenv/mod.ts";

// Load environment variables
await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const skipTests = !SUPABASE_URL;

if (skipTests) {
  console.warn(
    "⚠️  Skipping edge function tests - SUPABASE_URL not configured",
  );
}

// Helper to make requests to edge functions
async function callEdgeFunction(
  functionName: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  return await fetch(url, options);
}

// Test: Rate Limiting on create-dynamic-qr
Deno.test({
  name: "create-dynamic-qr - should enforce rate limiting",
  ignore: skipTests,
  async fn() {
    // Make 21 requests rapidly to trigger rate limit (limit is 20/hour)
    const requests = Array.from({ length: 21 }, (_, i) =>
      callEdgeFunction("create-dynamic-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_url: `https://example.com/test-${i}`,
          max_scans: 1,
        }),
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);

    // At least one request should be rate limited
    assertEquals(
      rateLimited.length > 0,
      true,
      "Expected at least one request to be rate limited",
    );
  },
});

// Test: File type validation on upload-file
Deno.test({
  name: "upload-file - should reject executable files",
  ignore: skipTests,
  async fn() {
    // Create a fake .exe file
    const formData = new FormData();
    const fakeExeFile = new File(["fake exe content"], "malware.exe", {
      type: "application/x-msdownload",
    });
    formData.append("file", fakeExeFile);

    const response = await callEdgeFunction("upload-file", {
      method: "POST",
      body: formData,
    });

    // Should reject with 400 status
    assertEquals(response.status, 400);

    const body = await response.json();
    assertExists(body.error);
    assertEquals(
      body.error.includes("not allowed") || body.error.includes("security"),
      true,
      "Error message should mention security/not allowed",
    );
  },
});

// Test: File size validation on upload-file
Deno.test({
  name: "upload-file - should reject files larger than 25MB",
  ignore: skipTests,
  async fn() {
    // Create a fake large file (26MB)
    const largeContent = new Uint8Array(26 * 1024 * 1024); // 26MB
    const formData = new FormData();
    const largeFile = new File([largeContent], "large.zip", {
      type: "application/zip",
    });
    formData.append("file", largeFile);

    const response = await callEdgeFunction("upload-file", {
      method: "POST",
      body: formData,
    });

    // Should reject with 400 status
    assertEquals(response.status, 400);

    const body = await response.json();
    assertExists(body.error);
    assertEquals(
      body.error.includes("too large") || body.error.includes("25MB"),
      true,
      "Error message should mention size limit",
    );
  },
});

// Test: create-dynamic-qr - should require destination_url
Deno.test({
  name: "create-dynamic-qr - should require destination_url",
  ignore: skipTests,
  async fn() {
    const response = await callEdgeFunction("create-dynamic-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Missing destination_url
    });

    assertEquals(response.status, 400);

    const body = await response.json();
    assertExists(body.error);
    assertEquals(
      body.error.includes("destination_url"),
      true,
      "Error should mention missing destination_url",
    );
  },
});

// Test: create-dynamic-qr - should create QR successfully
Deno.test({
  name: "create-dynamic-qr - should create QR successfully with valid data",
  ignore: skipTests,
  async fn() {
    const response = await callEdgeFunction("create-dynamic-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_url: "https://example.com",
        max_scans: 5,
      }),
    });

    assertEquals(response.status, 200);

    const body = await response.json();
    assertExists(body.success);
    assertEquals(body.success, true);
    assertExists(body.short_code);
    assertExists(body.owner_token);
    assertExists(body.redirect_url);
    assertExists(body.edit_url);
    assertEquals(body.scan_count, 0);
    assertEquals(body.max_scans, 5);
  },
});

// Test: redirect-qr - should return 400 for missing code
Deno.test({
  name: "redirect-qr - should return error for missing code",
  ignore: skipTests,
  async fn() {
    const response = await callEdgeFunction("redirect-qr", {
      method: "GET",
    });

    assertEquals(response.status, 400);
  },
});

// Test: get-dynamic-qr - should require token
Deno.test({
  name: "get-dynamic-qr - should require token parameter",
  ignore: skipTests,
  async fn() {
    const response = await callEdgeFunction("get-dynamic-qr", {
      method: "GET",
    });

    // Should fail without token
    assertEquals(response.ok, false);
  },
});

console.log("\n✅ Edge function tests completed!\n");

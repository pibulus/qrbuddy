import { assertEquals } from "$std/assert/mod.ts";
import { handler } from "../routes/api/peek.ts";
import type { FreshContext } from "$fresh/server.ts";

const mockContext = {} as unknown as FreshContext;

Deno.test("api/peek - blocks missing or invalid url", async () => {
  const req = new Request("http://localhost/api/peek");
  const res = await handler.GET!(req, mockContext);
  assertEquals(res.status, 400);

  const invalidReq = new Request("http://localhost/api/peek?url=not-a-url");
  const invalidRes = await handler.GET!(invalidReq, mockContext);
  assertEquals(invalidRes.status, 400);
});

Deno.test("api/peek - blocks internal and private addresses", async () => {
  const localReq = new Request(
    "http://localhost/api/peek?url=http://localhost:8000",
  );
  const localRes = await handler.GET!(localReq, mockContext);
  assertEquals(localRes.status, 403);

  const ipReq = new Request("http://localhost/api/peek?url=http://192.168.1.1");
  const ipRes = await handler.GET!(ipReq, mockContext);
  assertEquals(ipRes.status, 403);

  const loopbackReq = new Request(
    "http://localhost/api/peek?url=http://127.0.0.1:3000",
  );
  const loopbackRes = await handler.GET!(loopbackReq, mockContext);
  assertEquals(loopbackRes.status, 403);
});

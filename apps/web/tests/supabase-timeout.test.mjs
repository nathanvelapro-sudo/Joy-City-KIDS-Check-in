import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { createTimeoutFetch, withSupabaseTimeout } from "../lib/supabase/env.ts";

let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/slow-headers") return;
    response.writeHead(200, { "Content-Type": "application/json", "X-Test": "preserved" });
    if (request.url === "/slow-body") {
      response.write('{"ok":');
      return;
    }
    response.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("a normal response retains its readable body, headers and URL", async () => {
  const response = await createTimeoutFetch(500)(`${baseUrl}/ok`);
  assert.equal(response.status, 200);
  assert.equal(response.url, `${baseUrl}/ok`);
  assert.equal(response.headers.get("X-Test"), "preserved");
  assert.deepEqual(await response.json(), { ok: true });
});

for (const path of ["/slow-headers", "/slow-body"]) {
  test(`the timeout covers ${path}`, async () => {
    const started = performance.now();
    await assert.rejects(createTimeoutFetch(100)(baseUrl + path), /timed out after 100ms/);
    assert.ok(performance.now() - started < 1000);
  });
}

test("a caller can cancel a fetch before its deadline", async () => {
  const controller = new AbortController();
  const request = createTimeoutFetch(500)(`${baseUrl}/slow-body`, { signal: controller.signal });
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(request, (error) => error.name === "AbortError");
});

test("an already cancelled Request keeps its cancellation signal", async () => {
  const controller = new AbortController();
  controller.abort();
  const request = new Request(`${baseUrl}/ok`, { signal: controller.signal });
  await assert.rejects(createTimeoutFetch(500)(request), (error) => error.name === "AbortError");
});

test("a deadline bounds retries and also cancels the in-flight request", async () => {
  let operationSignal;
  let cancelled = false;
  const started = performance.now();
  await assert.rejects(withSupabaseTimeout(async (signal) => {
    operationSignal = signal;
    const fetchWithTimeout = createTimeoutFetch(1000, signal);
    await fetchWithTimeout(`${baseUrl}/ok`);
    try {
      await fetchWithTimeout(`${baseUrl}/slow-body`);
    } catch {
      cancelled = signal.aborted;
    }
    // Model an SDK retaining its promise during retry backoff after cancellation.
    await new Promise(() => {});
  }, 100), /operation timed out after 100ms/);
  assert.ok(operationSignal.aborted);
  assert.ok(performance.now() - started < 1000);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(cancelled);
});

test("a successful operation clears its deadline without cancelling its signal", async () => {
  let operationSignal;
  const result = await withSupabaseTimeout(async (signal) => {
    operationSignal = signal;
    return "ready";
  }, 30);
  assert.equal(result, "ready");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(operationSignal.aborted, false);
});

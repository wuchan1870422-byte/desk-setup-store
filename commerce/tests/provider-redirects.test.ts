import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { CJSandbox, PayPalSandbox } from "../providers";
import type { Order } from "../orders";

test("provider credential and API requests reject HTTP redirects without reaching the destination", async t => {
  let redirectedRequests = 0;
  const server = createServer((req, res) => {
    if (req.url === "/received") {
      redirectedRequests++;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ access_token: "fake", code: 200, result: true, data: { accessToken: "fake", isSandbox: 1, orderStatus: "UNPAID" } }));
      return;
    }
    res.writeHead(307, { location: "/received" });
    res.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const local = `http://127.0.0.1:${address.port}`;
  // Only this local HTTP fixture is contacted; provider hosts never receive traffic.
  const redirecting: typeof fetch = (_input, init) => fetch(`${local}/redirect`, init);
  const apiRedirect: typeof fetch = (input, init) => String(input).endsWith("/oauth2/token") ? Promise.resolve(Response.json({ access_token: "fake" })) : redirecting(input, init);
  const order = { paypalId: "PAYPAL-TEST-0001" } as Order;
  await assert.rejects(new PayPalSandbox("fake", "fake", "https://example.com", redirecting).get(order));
  await assert.rejects(new PayPalSandbox("fake", "fake", "https://example.com", apiRedirect).get(order));
  await assert.rejects(CJSandbox.fromApiKey("fake-redirect-test-key", redirecting));
  await assert.rejects(new CJSandbox("fake", redirecting, async () => {}).inspectSandboxOrder("CJ-TEST-0001"));
  assert.equal(redirectedRequests, 0);
});

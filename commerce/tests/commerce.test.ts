import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { D1Orders, type Database } from "../d1-store";
import { SandboxOrders, type Order, type PaymentGateway, type SupplierGateway } from "../orders";
import { PayPalSandbox, CJSandbox } from "../providers";
import { priceLines, validateLines } from "../catalogue";
import worker, { type Environment } from "../worker";

const line = [{ productId: "tech-organiser-black-3", quantity: 1 }];
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0001_sandbox_orders.sql", import.meta.url), "utf8"));
  sql.exec(readFileSync(new URL("../migrations/0003_order_events.sql", import.meta.url), "utf8"));
  const adapter: Database = { prepare: (query) => ({ bind: (...values) => ({
    all: async <T>() => ({ results: sql.prepare(query).all(...values as SQLInputValue[]) as T[] }),
    first: async <T>() => (sql.prepare(query).get(...values as SQLInputValue[]) as T) || null,
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values as SQLInputValue[]).changes) } }),
  }) }) };
  return new D1Orders(adapter);
}
function completed(order: Order) {
  return { id: order.paypalId, status: "COMPLETED", purchase_units: [{ reference_id: order.id, custom_id: order.id, amount: { currency_code: "AUD", value: "39.90" }, payments: { captures: [{ id: "CAPTURE-12345", status: "COMPLETED", final_capture: true, amount: { currency_code: "AUD", value: "39.90" } }] } }] };
}
function pending(order: Order) {
  return { id: order.paypalId, intent: "CAPTURE", status: "PAYER_ACTION_REQUIRED", purchase_units: [{ reference_id: order.id, custom_id: order.id, invoice_id: `test-${order.id}`, amount: { currency_code: "AUD", value: "39.90" } }], links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${order.paypalId}` }] };
}
function harness(overrides: { createFails?: boolean; captureFails?: boolean; cjFails?: boolean; mismatch?: boolean; readPending?: boolean; wrongReference?: boolean } = {}) {
  const db = database();
  const counts = { create: 0, capture: 0, supplier: 0, pay: 0 };
  const verifier = new PayPalSandbox("test-client", "test-secret", "https://example.com");
  const paypal: PaymentGateway = {
    async create() { counts.create++; await Promise.resolve(); if (overrides.createFails) throw new Error("timeout"); return { id: "PAYPAL-12345", approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-12345" }; },
    async capture(order) { counts.capture++; if (overrides.captureFails) throw new Error("uncertain capture timeout"); const payload = completed(order); if (overrides.mismatch) payload.purchase_units[0].payments.captures[0].amount.value = "0.01"; return payload; },
    async get(order) { const payload = pending(order); if (overrides.wrongReference) payload.purchase_units[0].custom_id = "wrong-order"; return overrides.readPending ? payload : completed(order); },
    verifyCreated: (payload, order) => verifier.verifyCreated(payload, order),
    verifyPaid: (payload, order) => verifier.verifyPaid(payload, order),
  };
  const cj: SupplierGateway = {
    async createSandboxOrder() { counts.supplier++; if (overrides.cjFails) throw new Error("ambiguous timeout"); return "CJ-SANDBOX-12345"; },
    async simulatePayment() { counts.pay++; },
  };
  return { db, service: new SandboxOrders(db, paypal, cj), counts };
}

test("server catalogue ignores submitted prices and rejects unknown or excessive quantities", () => {
  assert.equal(priceLines(validateLines([{ ...line[0], price: 1 }])), 3990);
  for (const invalid of [[{ productId: "not-allowed", quantity: 1 }], [{ ...line[0], quantity: 0 }], [{ ...line[0], quantity: 1.2 }], [{ ...line[0], quantity: 4 }], [{ ...line[0], quantity: "1" }], []]) assert.throws(() => validateLines(invalid));
});

test("SQLite unique request keys prevent simultaneous duplicate PayPal creation", async () => {
  const h = harness();
  await Promise.all([h.service.create("same-request-key-001", line), h.service.create("same-request-key-001", line)]);
  assert.equal(h.counts.create, 1);
  assert.equal((await h.db.byKey("same-request-key-001"))?.state, "PENDING");
  await assert.rejects(h.service.create("same-request-key-001", [{ ...line[0], quantity: 2 }]), /IDEMPOTENCY_CONFLICT/);
});

test("only a verified completed payment submits exactly one sandbox supplier order", async () => {
  const h = harness();
  const row = await h.service.create("unique-request-key-002", line);
  await Promise.all([h.service.capture(row.id), h.service.capture(row.id), h.service.reconcile(row.paypalId!)]);
  assert.equal((await h.db.byId(row.id))?.state, "CJ_SANDBOX_PAID");
  assert.equal(h.counts.capture, 1);
  assert.equal(h.counts.supplier, 1);
  assert.equal(h.counts.pay, 1);
  await h.service.reconcile(row.paypalId!);
  assert.equal(h.counts.supplier, 1);
});

test("mismatched captured amount prevents supplier submission", async () => {
  const h = harness({ mismatch: true });
  const row = await h.service.create("unique-request-key-003", line);
  await assert.rejects(h.service.capture(row.id));
  assert.equal((await h.db.byId(row.id))?.state, "REVIEW");
  assert.equal(h.counts.supplier, 0);
});

test("ambiguous PayPal creation is held for review without creating a second remote order", async () => {
  const h = harness({ createFails: true });
  await assert.rejects(h.service.create("unique-request-key-004", line));
  const row = await h.service.create("unique-request-key-004", line);
  assert.equal(row.state, "REVIEW");
  assert.equal(h.counts.create, 1);
});

test("ambiguous CJ result is held for review and callbacks never resubmit", async () => {
  const h = harness({ cjFails: true });
  const row = await h.service.create("unique-request-key-005", line);
  assert.equal((await h.service.capture(row.id)).state, "REVIEW");
  await h.service.capture(row.id);
  await h.service.reconcile(row.paypalId!);
  assert.equal(h.counts.supplier, 1);
  assert.equal(h.counts.pay, 0);
});

test("uncertain creation links one verified existing PayPal order without new creation or capture", async () => {
  const h = harness({ createFails: true, readPending: true });
  await assert.rejects(h.service.create("link-pending-order-001", line));
  const row = (await h.db.byKey("link-pending-order-001"))!;
  await Promise.all([h.service.linkPayPal(row.id, "PAYPAL-12345"), h.service.linkPayPal(row.id, "PAYPAL-12345")]);
  const linked = (await h.db.byId(row.id))!;
  assert.equal(linked.state, "PENDING");
  assert.equal(linked.paypalId, "PAYPAL-12345");
  assert.equal(linked.reviewReason, undefined);
  assert.equal(h.counts.create, 1);
  assert.equal(h.counts.capture, 0);
  assert.equal(h.counts.supplier, 0);
  await h.service.linkPayPal(row.id, "DIFFERENT-ORDER");
  assert.equal((await h.db.byId(row.id))?.paypalId, "PAYPAL-12345");
});

test("uncertain creation cannot link a different invoice, amount, state or approval token", async () => {
  const h = harness({ createFails: true, readPending: true, wrongReference: true });
  await assert.rejects(h.service.create("link-wrong-order-001", line));
  const row = (await h.db.byKey("link-wrong-order-001"))!;
  await assert.rejects(h.service.linkPayPal(row.id, "PAYPAL-12345"), /CREATED_ORDER_NOT_VERIFIED/);
  assert.equal((await h.db.byId(row.id))?.state, "REVIEW");
  const expected = { ...row, paypalId: "PAYPAL-12345" };
  const verifier = new PayPalSandbox("fake", "fake", "https://example.com");
  for (const edit of [
    (p: ReturnType<typeof pending>) => { p.purchase_units[0].invoice_id = "different"; },
    (p: ReturnType<typeof pending>) => { p.purchase_units[0].amount.value = "0.01"; },
    (p: ReturnType<typeof pending>) => { p.status = "COMPLETED"; },
    (p: ReturnType<typeof pending>) => { p.links[0].href = "https://www.sandbox.paypal.com/checkoutnow?token=DIFFERENT"; },
    (p: ReturnType<typeof pending>) => { p.links[0].href = "https://www.paypal.com/checkoutnow?token=PAYPAL-12345"; },
  ]) { const payload = pending(expected); edit(payload); assert.throws(() => verifier.verifyCreated(payload, expected)); }
});

test("capture timeout recovers from a fresh verified read without capturing twice", async () => {
  const h = harness({ captureFails: true });
  const row = await h.service.create("recovery-capture-001", line);
  await assert.rejects(h.service.capture(row.id), /PAYPAL_CAPTURE_UNCERTAIN/);
  assert.equal((await h.db.byId(row.id))?.state, "REVIEW");
  await Promise.all([h.service.recover(row.id), h.service.reconcile(row.paypalId!)]);
  assert.equal((await h.db.byId(row.id))?.state, "CJ_SANDBOX_PAID");
  assert.equal(h.counts.capture, 1);
  assert.equal(h.counts.supplier, 1);
  assert.equal(h.counts.pay, 1);
});

test("crash after persisting PAID resumes sandbox fulfilment exactly once", async () => {
  const h = harness();
  const row = await h.service.create("recovery-paid-00001", line);
  await h.db.transition({ ...row, state: "PAID", captureId: "CAPTURE-12345" }, "PENDING");
  await Promise.all([h.service.recover(row.id), h.service.recover(row.id)]);
  assert.equal((await h.db.byId(row.id))?.state, "CJ_SANDBOX_PAID");
  assert.equal(h.counts.capture, 0);
  assert.equal(h.counts.supplier, 1);
});

test("recovery never retries uncertain create, unverified payment or in-flight CJ", async () => {
  for (const [state, reviewReason] of [["REVIEW", "PAYPAL_CREATE_UNCERTAIN"], ["REVIEW", "PAYMENT_NOT_VERIFIED"], ["REVIEW", "CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY"], ["FULFILLING", undefined]] as const) {
    const h = harness();
    const row = await h.service.create("recovery-block-0001", line);
    await h.db.transition({ ...row, state, reviewReason }, "PENDING");
    assert.equal((await h.service.recover(row.id))?.state, state);
    assert.equal(h.counts.capture, 0);
    assert.equal(h.counts.supplier, 0);
  }
});

test("provider verification rejects wrong currency, custom ID, status and non-final capture", async () => {
  const h = harness();
  const row = await h.service.create("unique-request-key-006", line);
  const verifier = new PayPalSandbox("test-client", "test-secret", "https://example.com");
  const changes = [
    (p: ReturnType<typeof completed>) => { p.status = "APPROVED"; },
    (p: ReturnType<typeof completed>) => { p.purchase_units[0].custom_id = "wrong-order"; },
    (p: ReturnType<typeof completed>) => { p.purchase_units[0].amount.currency_code = "USD"; },
    (p: ReturnType<typeof completed>) => { p.purchase_units[0].payments.captures[0].status = "PENDING"; },
    (p: ReturnType<typeof completed>) => { p.purchase_units[0].payments.captures[0].final_capture = false; },
  ];
  for (const change of changes) { const payload = completed(row); change(payload); assert.throws(() => verifier.verifyPaid(payload, row)); }
});

test("CJ client forces isSandbox=1 and create-only mode; a non-sandbox response cannot be paid", async () => {
  const calls: { url: string; body?: Record<string, unknown> }[] = [];
  const send: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const data = url.includes("getOrderDetail") ? { isSandbox: 0 } : { orderId: "CJ-TEST-12345" };
    return Response.json({ code: 200, result: true, data });
  };
  const h = harness();
  const row = await h.service.create("unique-request-key-007", line);
  const cj = new CJSandbox("not-a-real-token", send, async () => {});
  const id = await cj.createSandboxOrder(row);
  assert.equal(calls[0].body?.isSandbox, 1);
  assert.equal(calls[0].body?.payType, 3);
  assert.equal(calls[0].body?.shippingCountryCode, "AU");
  await assert.rejects(cj.simulatePayment(id), /CJ_NOT_A_SANDBOX_ORDER/);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => !call.url.includes("payBalance")));
});

test("CJ sandbox payment uses only its documented simulation endpoint", async () => {
  const calls: string[] = [];
  let reads = 0;
  const send: typeof fetch = async (input) => { const url = String(input); calls.push(url); return Response.json({ code: 200, result: true, data: url.includes("getOrderDetail") ? { isSandbox: 1, orderStatus: ++reads === 1 ? "UNPAID" : "UNSHIPPED" } : true }); };
  await new CJSandbox("not-a-real-token", send, async () => {}).simulatePayment("CJ-TEST-23456");
  assert.match(calls[1], /\/sandbox\/simulatePay$/);
});

test("PayPal adapter uses sandbox hosts, stable request IDs and a full order read after capture", async () => {
  const h = harness();
  const row = await h.service.create("unique-request-key-008", line);
  const calls: { url: string; method?: string; requestId: string | null }[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, requestId: new Headers(init?.headers).get("PayPal-Request-Id") });
    if (url.endsWith("/oauth2/token")) return Response.json({ access_token: "test-only-access-token", expires_in: 3600 });
    if (url.endsWith("/capture")) return Response.json({ id: row.paypalId, status: "COMPLETED" });
    return Response.json(completed(row));
  };
  const paypal = new PayPalSandbox("fake-client", "fake-secret", "https://example.com", transport);
  const payload = await paypal.capture(row);
  assert.equal(paypal.verifyPaid(payload, row), "CAPTURE-12345");
  assert.equal(calls[1].requestId, `capture-${row.id}`);
  assert.equal(calls[2].method, "GET");
  assert.ok(calls.every((call) => new URL(call.url).hostname === "api-m.sandbox.paypal.com"));
});

test("CJ API key is exchanged only server-side and its access token is cached", async () => {
  let requests = 0;
  const transport: typeof fetch = async (input, init) => {
    requests++;
    assert.equal(String(input), "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken");
    assert.deepEqual(JSON.parse(String(init?.body)), { apiKey: "fake-key-for-unit-test" });
    return Response.json({ code: 200, result: true, data: { accessToken: "fake-access-token", accessTokenExpiryDate: "2099-01-01T00:00:00Z" } });
  };
  await CJSandbox.fromApiKey("fake-key-for-unit-test", transport);
  await CJSandbox.fromApiKey("fake-key-for-unit-test", transport);
  assert.equal(requests, 1);
});

test("PayPal diagnostics report only operation and HTTP status, never the response body", async () => {
  const h = harness();
  const row = await h.service.create("diagnostic-http-0001", line);
  const authFailure = new PayPalSandbox("fake", "fake", "https://example.com", async () => Response.json({ secret: "MUST-NOT-APPEAR" }, { status: 401 }));
  await assert.rejects(authFailure.get(row), { message: "PAYPAL_AUTH_HTTP_401" });
  const requestFailure = new PayPalSandbox("fake", "fake", "https://example.com", async input => String(input).endsWith("/oauth2/token") ? Response.json({ access_token: "fake-only" }) : Response.json({ secret: "MUST-NOT-APPEAR" }, { status: 403 }));
  await assert.rejects(requestFailure.get(row), { message: "PAYPAL_REQUEST_HTTP_403" });
});

test("payment status reads verify references, omit payer data, and do not capture", async () => {
  const h = harness();
  const row = await h.service.create("inspect-payment-001", line);
  let response: unknown = { ...pending(row), payer: { email_address: "private@example.com" } };
  const methods: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    methods.push(`${init?.method}:${String(input).endsWith("/oauth2/token") ? "auth" : "order"}`);
    return Response.json(String(input).endsWith("/oauth2/token") ? { access_token: "fake-only" } : response);
  };
  const paypal = new PayPalSandbox("fake", "fake", "https://example.com", transport);
  assert.deepEqual(await paypal.inspect(row), { paypalId: row.paypalId, state: "PAYER_ACTION_REQUIRED", paymentVerified: false, captureId: undefined });
  response = { ...completed(row), intent: "CAPTURE", purchase_units: [{ ...completed(row).purchase_units[0], invoice_id: `test-${row.id}` }] };
  assert.equal((await paypal.inspect(row)).paymentVerified, true);
  const mismatch = pending(row); mismatch.purchase_units[0].custom_id = "another-order"; response = mismatch;
  await assert.rejects(paypal.inspect(row), /CREATED_ORDER_NOT_VERIFIED/);
  assert.ok(methods.filter(x => x.endsWith(":order")).every(x => x === "GET:order"));
  assert.equal((await h.db.byId(row.id))?.state, "PENDING");
  assert.equal(h.counts.capture, 0);
  assert.equal(h.counts.supplier, 0);
});

test("default provider transports do not invoke global fetch with a client receiver", async () => {
  const previous = globalThis.fetch;
  const h = harness();
  const row = await h.service.create("fetch-receiver-0001", line);
  try {
    globalThis.fetch = async function (this: unknown, input) {
      assert.ok(this === undefined || this === globalThis, "incorrect runtime fetch receiver");
      return String(input).endsWith("/oauth2/token") ? Response.json({ access_token: "fake-only" }) : Response.json(completed(row));
    };
    await new PayPalSandbox("fake", "fake", "https://example.com").get(row);
    globalThis.fetch = async function (this: unknown) {
      assert.ok(this === undefined || this === globalThis, "incorrect runtime fetch receiver");
      return Response.json({ code: 200, result: true, data: { orderId: "CJ-TEST-REFERENCE" } });
    };
    assert.equal(await new CJSandbox("fake-only").createSandboxOrder(row), "CJ-TEST-REFERENCE");
  } finally { globalThis.fetch = previous; }
});

test("unsigned or untrusted-certificate webhooks cannot trigger remote verification", async () => {
  let sent = 0;
  const paypal = new PayPalSandbox("test", "test", "https://example.com", async () => { sent++; throw new Error("unexpected"); });
  assert.equal(await paypal.verifyWebhook(new Headers(), {}, "test-hook"), false);
  const headers = new Headers({ "paypal-transmission-id": "id", "paypal-transmission-time": "time", "paypal-transmission-sig": "signature", "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://untrusted.example/certificate" });
  assert.equal(await paypal.verifyWebhook(headers, {}, "test-hook"), false);
  assert.equal(sent, 0);
});

test("Worker fails closed for disabled/live modes, missing auth and incomplete configuration", async () => {
  for (const mode of [undefined, "disabled", "live"]) {
    const response = await worker.fetch(new Request("https://example.com/sandbox/orders", { method: "POST" }), { COMMERCE_MODE: mode });
    assert.equal(response.status, 503);
  }
  assert.equal((await worker.fetch(new Request("https://example.com/sandbox/orders"), { COMMERCE_MODE: "sandbox" })).status, 401);
  const token = "sandbox-test-token-01234567890123456789";
  assert.equal((await worker.fetch(new Request("https://example.com/sandbox/orders", { headers: { authorization: `Bearer ${token}` } }), { COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token })).status, 503);
  const health = await worker.fetch(new Request("https://example.com/health"), {});
  assert.equal((await health.json() as { livePayments: boolean }).livePayments, false);
});

test("owner sandbox refuses customer information even when credentials are configured", async () => {
  const token = "sandbox-test-token-01234567890123456789";
  const env: Environment = { COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token, ORDERS: {} as Database, PAYPAL_SANDBOX_CLIENT_ID: "test", PAYPAL_SANDBOX_SECRET: "test", CJ_ACCESS_TOKEN: "test", STOREFRONT_ORIGIN: "https://example.com" };
  const request = new Request("https://example.com/sandbox/orders", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ items: line, email: "not-a-customer@example.com" }) });
  assert.equal((await worker.fetch(request, env)).status, 400);
});

test("connection inspection requires owner authentication before any provider call", async () => {
  const response = await worker.fetch(new Request("https://example.com/sandbox/connections"), { COMMERCE_MODE: "sandbox" });
  assert.equal(response.status, 401);
});

test("owner connection inspection authenticates only and never returns tokens", async () => {
  const original = globalThis.fetch;
  const paths: string[] = [];
  const token = "test-admin-connection-check-01234567890123456789";
  const env: Environment = { COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token, ORDERS: {} as Database, PAYPAL_SANDBOX_CLIENT_ID: "fake-client", PAYPAL_SANDBOX_SECRET: "fake-secret", CJ_API_KEY: "fake-connection-check-key", STOREFRONT_ORIGIN: "https://example.com" };
  try {
    globalThis.fetch = async input => {
      const url = String(input); paths.push(new URL(url).pathname);
      if (url.endsWith("/oauth2/token")) return Response.json({ access_token: "MUST-NOT-LEAK-PAYPAL" });
      assert.ok(url.endsWith("/authentication/getAccessToken"));
      return Response.json({ code: 200, result: true, data: { accessToken: "MUST-NOT-LEAK-CJ", accessTokenExpiryDate: "2099-01-01T00:00:00Z" } });
    };
    const response = await worker.fetch(new Request("https://example.com/sandbox/connections", { headers: { authorization: `Bearer ${token}` } }), env);
    const result = await response.json();
    assert.deepEqual(result, { paypal: "authenticated_sandbox", cj: "authenticated_api_key", livePayments: false, realProcurement: false });
    assert.equal(paths.length, 2);
    assert.ok(paths.every(path => path.endsWith("/token") || path.endsWith("/getAccessToken")));
    assert.ok(!JSON.stringify(result).includes("MUST-NOT-LEAK"));
    globalThis.fetch = async () => Response.json({ secret: "MUST-NOT-LEAK" }, { status: 401 });
    env.CJ_API_KEY = "fake-invalid-connection-key";
    const failed = await worker.fetch(new Request("https://example.com/sandbox/connections", { headers: { authorization: `Bearer ${token}` } }), env);
    assert.deepEqual(await failed.json(), { paypal: "authentication_failed", cj: "authentication_failed", livePayments: false, realProcurement: false });
  } finally { globalThis.fetch = original; }
});

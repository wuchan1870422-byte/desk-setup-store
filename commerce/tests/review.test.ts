import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { D1Orders, type Database } from "../d1-store";
import { SandboxOrders, type Order } from "../orders";
import { orderReview } from "../review";
import { PayPalSandbox } from "../providers";
import { runtimeReadiness, configurationStatus } from "../readiness";
import worker, { type Environment } from "../worker";

function database() {
  const sql = new DatabaseSync(":memory:");
  for (const file of ["0001_sandbox_orders.sql", "0002_order_events.sql"]) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  const raw: Database = { prepare: query => ({ bind: (...values) => ({
    first: async <T>() => sql.prepare(query).get(...values as SQLInputValue[]) as T || null,
    all: async <T>() => ({ results: sql.prepare(query).all(...values as SQLInputValue[]) as T[] }),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values as SQLInputValue[]).changes) } }),
  }) }) };
  return { raw, sql, db: new D1Orders(raw) };
}
function order(id = "test-order-0001"): Order {
  return { id, requestKey: `request-${id}`, lines: [{ productId: "tech-organiser-black-3", quantity: 1 }], totalAudCents: 3990, state: "PAID", paypalId: `PAYPAL-${id}`, captureId: `CAPTURE-${id}`, createdAt: "2026-01-01T00:00:00Z" };
}
function env(raw: Database): Environment {
  return { ORDERS: raw, COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: "test-admin-token-not-real-01234567890123456789", PAYPAL_SANDBOX_CLIENT_ID: "test", PAYPAL_SANDBOX_SECRET: "test", PAYPAL_SANDBOX_WEBHOOK_ID: "test-hook", CJ_ACCESS_TOKEN: "test", STOREFRONT_ORIGIN: "https://example.com" };
}
const up = (captureId: string) => [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}` }];
function refunded(row: Order) {
  return { id: "EVENT-refunded-001", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "REFUND-0001", links: up(row.captureId!) } };
}
function capture(row: Order, status = "REFUNDED") {
  return { id: row.captureId, status, amount: { currency_code: "AUD", value: "39.90" }, supplementary_data: { related_ids: { order_id: row.paypalId } } };
}
function transport(row: Order, options: { signature?: boolean; mismatch?: boolean; failRead?: boolean } = {}): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.endsWith("/oauth2/token")) return Response.json({ access_token: "PRIVATE-TEST-TOKEN" });
    if (url.endsWith("verify-webhook-signature")) return Response.json({ verification_status: options.signature === false ? "FAILURE" : "SUCCESS" });
    if (options.failRead) return Response.json({ secret: "DO-NOT-LOG" }, { status: 503 });
    if (url.includes("/captures/")) return Response.json({ ...capture(row), ...(options.mismatch ? { amount: { currency_code: "USD", value: "39.90" } } : {}) });
    if (url.includes("/refunds/")) return Response.json({ id: "REFUND-0001", status: "COMPLETED", amount: { currency_code: "AUD", value: "39.90" }, links: up(row.captureId!) });
    throw new Error("Unexpected remote call");
  };
}
const headers = { "content-type": "application/json", "paypal-transmission-id": "test-id", "paypal-transmission-time": "test-time", "paypal-transmission-sig": "test-sig", "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api-m.sandbox.paypal.com/test-cert" };
const webhook = (event: unknown) => new Request("https://example.com/webhooks/paypal", { method: "POST", headers, body: JSON.stringify(event) });

test("real SQLite migrations, readonly pagination and stale transitions produce actionable handoff", async () => {
  const { db } = database();
  const first = { ...order(), state: "FULFILLING" as const };
  await db.insert(first); await db.insert(order("test-order-0002"));
  await db.issue(first.id, "EVENT-0001", "PAYMENT_REFUNDED");
  const page = await orderReview(db, "", 1, 30, new Date("2026-10-24T00:00:00Z"));
  assert.equal(page.nextCursor, first.id);
  assert.equal(page.rows[0].paymentHeld, true);
  assert.equal(page.rows[0].shipment, "not_created");
  const second = await orderReview(db, page.nextCursor!, 1);
  assert.equal(second.rows[0].nextAction, "FRESH_PAYMENT_READ_THEN_OWNER_RECONCILE");
  assert.equal(second.nextCursor, null);
  await assert.rejects(orderReview(db, "", 101), /INVALID_PAGINATION/);
  const stale = { ...order("test-order-0003"), state: "CAPTURING" as const };
  await db.insert(stale);
  assert.equal((await orderReview(db)).rows.find(x => x.orderId === stale.id)?.reason, "STALE_TRANSITION_NO_AUTO_RETRY");
  assert.equal((await db.byId(first.id))?.state, "FULFILLING");
});

test("payment holds survive acknowledgement and atomically prevent payment/fulfilment claims", async () => {
  const { db } = database(); const row = { ...order(), state: "PENDING" as const }; await db.insert(row);
  assert.equal(await db.issue(row.id, "EVENT-0001", "PAYMENT_REFUNDED"), true);
  assert.equal(await db.issue(row.id, "EVENT-0001", "PAYMENT_REFUNDED"), false);
  assert.equal(await db.acknowledge("EVENT-0001"), true);
  assert.equal(await db.acknowledge("EVENT-0001"), false);
  for (const state of ["CAPTURING", "PAID", "FULFILLING"] as const) assert.equal(await db.transition({ ...row, state }, "PENDING"), false);
  let remoteCalls = 0;
  const unexpected = async () => { remoteCalls++; throw new Error("must not call provider"); };
  const service = new SandboxOrders(db, { create: unexpected, capture: unexpected, get: unexpected, verifyCreated: () => { throw new Error("unexpected"); }, verifyPaid: () => { throw new Error("unexpected"); } }, { createSandboxOrder: unexpected, simulatePayment: unexpected });
  await service.capture(row.id);
  // Reconciliation can read PayPal, but a held result never captures/procures.
  assert.equal(remoteCalls, 0);
  assert.equal((await db.byId(row.id))?.state, "PENDING");
});

test("signed refund callbacks verify fresh provider records and deduplicate without changing fulfilment", async () => {
  const { db, raw, sql } = database(); const row = order(); await db.insert(row); await db.transition(row, "PAID");
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = transport(row);
    for (let i = 0; i < 2; i++) assert.equal((await worker.fetch(webhook(refunded(row)), env(raw))).status, 200);
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM sandbox_order_events").get()?.count, 1);
    assert.equal((await orderReview(db)).rows[0].issues[0].kind, "PAYMENT_REFUNDED");
    assert.equal((await db.byId(row.id))?.state, "PAID");
    const review = await worker.fetch(new Request("https://example.com/sandbox/review", { headers: { authorization: `Bearer ${env(raw).SANDBOX_ADMIN_TOKEN}` } }), env(raw));
    const text = await review.text();
    assert.ok(!text.includes("PRIVATE-TEST-TOKEN") && !text.includes("approvalUrl") && !text.includes("requestKey"));
  } finally { globalThis.fetch = previous; }
});

test("forged, unknown and mismatched negative callbacks cannot place a known order on hold", async () => {
  const { db, raw } = database(); const row = order(); await db.insert(row); await db.transition(row, "PAID");
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = transport(row, { signature: false });
    assert.equal((await worker.fetch(webhook(refunded(row)), env(raw))).status, 400);
    globalThis.fetch = transport(row, { mismatch: true });
    assert.equal((await worker.fetch(webhook(refunded(row)), env(raw))).status, 400);
    globalThis.fetch = transport(row);
    const event = refunded(row); event.resource.links = up("UNKNOWN-CAPTURE");
    assert.equal((await worker.fetch(webhook(event), env(raw))).status, 200);
    assert.equal(await db.hasHold(row.id), false);
  } finally { globalThis.fetch = previous; }
});

test("a known signed exception with temporarily unavailable provider read holds and retries safely", async () => {
  const { db, raw } = database(); const row = order(); await db.insert(row); await db.transition(row, "PAID");
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = transport(row, { failRead: true });
    assert.equal((await worker.fetch(webhook(refunded(row)), env(raw))).status, 502);
    assert.equal((await orderReview(db)).rows[0].issues[0].kind, "PAYMENT_EXCEPTION_UNCONFIRMED");
    globalThis.fetch = transport(row);
    assert.equal((await worker.fetch(webhook(refunded(row)), env(raw))).status, 200);
    assert.equal((await orderReview(db)).rows[0].issues[0].kind, "PAYMENT_REFUNDED");
  } finally { globalThis.fetch = previous; }
});

test("reversal and partial refunds are verified without any mutation request to PayPal", async () => {
  const row = order(); const calls: string[] = [];
  const paypal = new PayPalSandbox("fake", "fake", "https://example.com", async (input, init) => {
    const url = String(input); calls.push(`${init?.method}:${url}`);
    if (url.endsWith("/oauth2/token")) return Response.json({ access_token: "test" });
    if (url.includes("/captures/")) return Response.json(capture(row, "PARTIALLY_REFUNDED"));
    return Response.json({ id: "REFUND-0001", status: "COMPLETED", amount: { currency_code: "AUD", value: "1.00" }, links: up(row.captureId!) });
  });
  assert.equal(await paypal.inspectException(refunded(row), row), "PAYMENT_REFUNDED");
  assert.equal(await paypal.inspectException({ event_type: "PAYMENT.CAPTURE.REVERSED", resource: { id: row.captureId } }, row), "PAYMENT_REVERSED");
  assert.ok(calls.filter(x => !x.endsWith("/oauth2/token")).every(x => x.startsWith("GET:")));
});

test("readiness separates configuration, database, authentication and end-to-end evidence", async () => {
  const { raw } = database(); const config = env(raw);
  assert.equal((await runtimeReadiness(config)).database, "available");
  assert.equal((await runtimeReadiness(config)).endToEnd, "not_verified");
  delete config.PAYPAL_SANDBOX_WEBHOOK_ID;
  assert.equal(configurationStatus(config).configurationPresent, false);
  config.STOREFRONT_ORIGIN = "https://example.com/path";
  assert.equal(configurationStatus(config).checks.storefrontOrigin, false);
  assert.equal((await runtimeReadiness({})).database, "unavailable");
  assert.equal((await worker.fetch(new Request("https://example.com/sandbox/review"), env(raw))).status, 401);
});

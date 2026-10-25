import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { Database } from "../d1-store";
import { D1SupplierChecks, SandboxSupplierChecks, type SupplierCheckGateway } from "../supplier-check";
import { CJSandbox } from "../providers";
import worker, { type Environment } from "../worker";

function harness(failure?: "create" | "simulate" | "private-error") {
  const sql = new DatabaseSync(":memory:");
  for (const name of ["0001_sandbox_orders", "0002_sandbox_supplier_checks"]) sql.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), "utf8"));
  const adapter: Database = { prepare: query => ({ bind: (...values) => ({
    first: async <T>() => (sql.prepare(query).get(...values as SQLInputValue[]) as T) || null,
    all: async <T>() => ({ results: sql.prepare(query).all(...values as SQLInputValue[]) as T[] }),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values as SQLInputValue[]).changes) } }),
  }) }) };
  const db = new D1SupplierChecks(adapter);
  const counts = { create: 0, simulate: 0 };
  const supplier: SupplierCheckGateway = {
    async createSandboxOrder(order) {
      counts.create++;
      assert.equal(order.paypalId, undefined);
      assert.equal(order.captureId, undefined);
      assert.deepEqual(order.lines, [{ productId: "tech-organiser-black-3", quantity: 1 }]);
      if (failure === "create") throw new Error("CJ_API_CODE_1600100");
      if (failure === "private-error") throw new Error("PRIVATE-PROVIDER-BODY");
      return "CJ-FAKE-CONTRACT-12345";
    },
    async simulatePayment() { counts.simulate++; if (failure === "simulate") throw new Error("CJ_NOT_A_SANDBOX_ORDER"); },
    async inspectSandboxOrder() { return { isSandbox: true, state: "CREATED" }; },
  };
  return { sql, db, counts, service: new SandboxSupplierChecks(db, supplier) };
}

test("concurrent supplier checks create and simulate once, independently of payment orders", async () => {
  const h = harness();
  await Promise.all([h.service.create("supplier-check-key-0001"), h.service.create("supplier-check-key-0001")]);
  const result = await h.service.create("supplier-check-key-0001");
  assert.equal(result.state, "SIMULATED_PAID");
  assert.equal(result.kind, "CJ_SANDBOX_CONTRACT_CHECK");
  assert.equal(result.livePayments, false);
  assert.equal(result.realProcurement, false);
  assert.deepEqual(h.counts, { create: 1, simulate: 1 });
  assert.equal(h.sql.prepare("SELECT COUNT(*) AS count FROM sandbox_orders").get()?.count, 0);
});

test("uncertain supplier creation is durable and never retried with the same key", async () => {
  const h = harness("create");
  assert.equal((await h.service.create("supplier-check-key-0002")).reviewReason, "CJ_API_CODE_1600100");
  assert.equal((await h.service.create("supplier-check-key-0002")).state, "REVIEW");
  assert.deepEqual(h.counts, { create: 1, simulate: 0 });
  const privateError = harness("private-error");
  assert.equal((await privateError.service.create("supplier-check-key-0003")).reviewReason, "CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY");
});

test("refused simulation keeps its supplier reference and never repeats creation or payment", async () => {
  const h = harness("simulate");
  const row = await h.service.create("supplier-check-key-0004");
  assert.equal(row.state, "REVIEW");
  assert.equal(row.cjOrderId, "CJ-FAKE-CONTRACT-12345");
  assert.equal(row.reviewReason, "CJ_NOT_A_SANDBOX_ORDER");
  await h.service.create("supplier-check-key-0004");
  assert.deepEqual(h.counts, { create: 1, simulate: 1 });
});

test("crashed supplier checks remain held and invalid keys create no record", async () => {
  const h = harness();
  for (const state of ["CREATING", "SIMULATING"] as const) {
    const key = `supplier-crash-${state}`;
    await h.db.insert({ id: crypto.randomUUID(), requestKey: key, state, createdAt: new Date().toISOString(), kind: "CJ_SANDBOX_CONTRACT_CHECK", livePayments: false, realProcurement: false });
    assert.equal((await h.service.create(key)).state, state);
  }
  await assert.rejects(h.service.create("short"), /INVALID_REQUEST_KEY/);
  assert.deepEqual(h.counts, { create: 0, simulate: 0 });
});

test("supplier check routes require owner auth and reject all caller-supplied recipient or item data", async () => {
  const token = "supplier-check-owner-test-01234567890123456789";
  const env: Environment = { COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token, ORDERS: {} as Database, PAYPAL_SANDBOX_CLIENT_ID: "fake", PAYPAL_SANDBOX_SECRET: "fake", CJ_ACCESS_TOKEN: "fake", STOREFRONT_ORIGIN: "https://example.com" };
  assert.equal((await worker.fetch(new Request("https://example.com/sandbox/supplier-checks", { method: "POST" }), env)).status, 401);
  const response = await worker.fetch(new Request("https://example.com/sandbox/supplier-checks", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ shippingAddress: "unwanted data" }) }), env);
  assert.equal(response.status, 400);
});

test("CJ simulation must explicitly return true and diagnostics never expose response bodies", async () => {
  const transport: typeof fetch = async input => Response.json({ code: 200, result: true, data: String(input).includes("getOrderDetail") ? { isSandbox: 1, orderStatus: "UNPAID" } : false });
  await assert.rejects(new CJSandbox("fake", transport, async () => {}).simulatePayment("CJ-FAKE-12345"), /CJ_SIMULATION_NOT_CONFIRMED/);
  const failure: typeof fetch = async () => Response.json({ code: 1600100, result: false, message: "PRIVATE-PROVIDER-BODY" });
  await assert.rejects(new CJSandbox("fake", failure, async () => {}).simulatePayment("CJ-FAKE-12345"), { message: "CJ_API_CODE_1600100" });
});

test("supplier inspection returns only sandbox state and never writes to the provider", async () => {
  const methods: string[] = [];
  const transport: typeof fetch = async (_input, init) => {
    methods.push(init?.method || "GET");
    return Response.json({ code: 200, result: true, data: { isSandbox: 1, orderStatus: "CREATED", shippingAddress: "PRIVATE", shippingCustomerName: "PRIVATE", shopId: "PRIVATE" } });
  };
  assert.deepEqual(await new CJSandbox("fake", transport, async () => {}).inspectSandboxOrder("CJ-FAKE-12345"), { cjOrderId: "CJ-FAKE-12345", isSandbox: true, state: "CREATED", subStatus: undefined });
  assert.deepEqual(methods, ["GET"]);
});

test("created CJ sandbox orders are confirmed, rechecked, simulated and verified without real payment APIs", async () => {
  const calls: string[] = [];
  const states = ["CREATED", "UNPAID", "UNSHIPPED"];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input); calls.push(`${init?.method}:${new URL(url).pathname.split("/").pop()}`);
    return Response.json({ code: 200, result: true, data: url.includes("getOrderDetail") ? { isSandbox: 1, orderStatus: states.shift() } : true });
  };
  await new CJSandbox("fake", transport, async () => {}).simulatePayment("CJ-FAKE-12345");
  assert.deepEqual(calls, ["GET:getOrderDetail", "PATCH:confirmOrder", "GET:getOrderDetail", "POST:simulatePay", "GET:getOrderDetail"]);
});

test("CJ cannot confirm non-sandbox orders or simulate in an unverified payment state", async () => {
  for (const detail of [{ isSandbox: 0, orderStatus: "CREATED" }, { isSandbox: 1, orderStatus: "SHIPPED" }, { isSandbox: 1, orderStatus: "UNKNOWN" }]) {
    const methods: string[] = [];
    const transport: typeof fetch = async (_input, init) => { methods.push(init?.method || "GET"); return Response.json({ code: 200, result: true, data: detail }); };
    await assert.rejects(new CJSandbox("fake", transport, async () => {}).simulatePayment("CJ-FAKE-12345"));
    assert.deepEqual(methods, ["GET"]);
  }
});

test("a CJ confirmation or simulated payment must be verified by a fresh state read", async () => {
  for (const initial of ["CREATED", "UNPAID"]) {
    const calls: string[] = [];
    const transport: typeof fetch = async (input, init) => { const url = String(input); calls.push(init?.method || "GET"); return Response.json({ code: 200, result: true, data: url.includes("getOrderDetail") ? { isSandbox: 1, orderStatus: initial } : true }); };
    await assert.rejects(new CJSandbox("fake", transport, async () => {}).simulatePayment("CJ-FAKE-12345"), initial === "CREATED" ? /CJ_ORDER_NOT_UNPAID/ : /CJ_SIMULATION_NOT_CONFIRMED/);
    assert.deepEqual(calls, initial === "CREATED" ? ["GET", "PATCH", "GET"] : ["GET", "POST", "GET"]);
  }
});

test("owner recovery claims one rejected simulation without recreating the supplier order", async () => {
  const h = harness();
  const row = await h.service.create("supplier-resume-0001");
  await h.db.transition({ ...row, state: "REVIEW", reviewReason: "CJ_API_CODE_812" }, "SIMULATED_PAID");
  await Promise.all([h.service.resume(row.id), h.service.resume(row.id)]);
  assert.equal((await h.db.byId(row.id))?.state, "SIMULATED_PAID");
  assert.deepEqual(h.counts, { create: 1, simulate: 2 });
});

test("owner recovery leaves ambiguous supplier outcomes held", async () => {
  const h = harness("simulate");
  const row = await h.service.create("supplier-resume-0002");
  await h.service.resume(row.id);
  assert.equal((await h.db.byId(row.id))?.state, "REVIEW");
  assert.deepEqual(h.counts, { create: 1, simulate: 1 });
});

test("CJ retries one rate-limited read through the request gate but never replays a write", async () => {
  let reads = 0, slots = 0, writes = 0;
  const transport: typeof fetch = async (input, init) => {
    if (String(input).includes("getOrderDetail")) {
      if (++reads === 1) return Response.json({}, { status: 429 });
      return Response.json({ code: 200, result: true, data: { isSandbox: 1, orderStatus: "UNPAID" } });
    }
    assert.equal(init?.method, "POST"); writes++;
    return Response.json({}, { status: 429 });
  };
  await assert.rejects(new CJSandbox("fake", transport, async () => { slots++; }).simulatePayment("CJ-FAKE-12345"), /CJ_REQUEST_HTTP_429/);
  assert.deepEqual({ reads, slots, writes }, { reads: 2, slots: 3, writes: 1 });
  let failedReads = 0;
  const limited: typeof fetch = async () => { failedReads++; return Response.json({}, { status: 429 }); };
  await assert.rejects(new CJSandbox("fake", limited, async () => {}).inspectSandboxOrder("CJ-FAKE-12345"));
  assert.equal(failedReads, 2);
});

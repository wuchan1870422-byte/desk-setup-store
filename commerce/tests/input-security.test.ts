import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { type Environment } from "../worker";
import type { Database } from "../d1-store";
import { validateLines } from "../catalogue";

const token = "test-only-admin-token-01234567890123456789";
const environment: Environment = {
  COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token,
  PAYPAL_SANDBOX_CLIENT_ID: "fake", PAYPAL_SANDBOX_SECRET: "fake",
  CJ_ACCESS_TOKEN: "fake", STOREFRONT_ORIGIN: "https://example.com",
  ORDERS: { prepare() { throw new Error("DATABASE_MUST_NOT_BE_USED"); } } as Database,
};
const request = (body: string, contentType = "application/json") => new Request("https://example.com/sandbox/orders", {
  method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": contentType, "idempotency-key": "test-request-key-0001" }, body,
});

test("malformed JSON and non-object bodies return safe client errors before database/provider work", async () => {
  for (const input of ["{broken-private-value", "", "null", "[]", "true", "1"]) {
    const response = await worker.fetch(request(input), environment);
    assert.equal(response.status, 400, input);
    assert.deepEqual(await response.json(), { error: "INVALID_JSON" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("JSON media type is parsed exactly and oversized streamed input is rejected", async () => {
  for (const type of ["text/plain", "application/jsonp", "application/json-invalid"]) {
    const response = await worker.fetch(request("{}", type), environment);
    assert.equal(response.status, 400, type);
    assert.deepEqual(await response.json(), { error: "INVALID_JSON" });
  }
  // An actual JSON object reaches semantic validation with standard parameters/case.
  const validType = await worker.fetch(request("{}", "Application/JSON; charset=utf-8"), environment);
  assert.equal(validType.status, 400);
  assert.deepEqual(await validType.json(), { error: "INVALID_ITEMS" });
  const oversized = await worker.fetch(request(JSON.stringify({ private: "x".repeat(16385) })), environment);
  assert.equal(oversized.status, 400);
  assert.deepEqual(await oversized.json(), { error: "BODY_TOO_LARGE" });
});

test("sandbox item rows reject nested customer fields, arrays and client prices", () => {
  for (const extra of [{ email: "private@example.com" }, { address: { street: "private" } }, { price: 1 }, { __proto__: null, note: "private" }]) {
    assert.throws(() => validateLines([{ productId: "tech-organiser-black-3", quantity: 1, ...extra }]), /INVALID_ITEMS/);
  }
  assert.throws(() => validateLines([[]]), /INVALID_ITEMS/);
});

test("authenticated readiness explains missing setup without requiring provider credentials", async () => {
  const response = await worker.fetch(new Request("https://example.com/sandbox/readiness", {
    headers: { authorization: `Bearer ${token}` },
  }), { COMMERCE_MODE: "sandbox", SANDBOX_ADMIN_TOKEN: token });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.configurationPresent, false);
  assert.equal(result.checks.paypalCredentials, false);
  assert.equal(result.database, "unavailable");
  assert.equal(result.endToEnd, "not_verified");
  assert.equal(result.livePayments, false);
  assert.equal((await worker.fetch(new Request("https://example.com/sandbox/readiness"), environment)).status, 401);
});

test("invalid storefront origins cannot reach order creation or any provider", async () => {
  for (const origin of ["http://example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com/?private=1", "invalid"]) {
    const response = await worker.fetch(request(JSON.stringify({ items: [{ productId: "tech-organiser-black-3", quantity: 1 }] })), { ...environment, STOREFRONT_ORIGIN: origin });
    assert.equal(response.status, 503, origin);
    assert.deepEqual(await response.json(), { error: "SANDBOX_CONFIGURATION_INCOMPLETE" });
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { SandboxAcceptance, acceptanceSummary } from "../acceptance";
const token = "operator-test-token-01234567890123456789";
const health = { mode: "sandbox", livePayments: false, realProcurement: false };

test("external acceptance requires explicit sandbox opt-in and fails closed for live backend", async () => {
  assert.throws(() => new SandboxAcceptance("https://example.com", token, undefined), /EXPLICIT/);
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com/path"]) assert.throws(() => new SandboxAcceptance(url, token, "sandbox"));
  const client = new SandboxAcceptance("https://example.com", token, "sandbox", async () => Response.json({ ...health, mode: "live" }));
  await assert.rejects(client.run("create", undefined, "stable-key-123456789"), /BACKEND_NOT_SANDBOX/);
});
test("cancelled or unapproved sandbox buyer cannot trigger capture", async () => {
  const calls: string[] = [];
  const client = new SandboxAcceptance("https://example.com", token, "sandbox", async (input, init) => {
    const path = new URL(String(input)).pathname; calls.push(path);
    assert.equal(init?.redirect, "error");
    return Response.json(path === "/health" ? health : { payment: { state: "PAYER_ACTION_REQUIRED" } });
  });
  await assert.rejects(client.run("capture", "order-1234"), /BUYER_APPROVAL_REQUIRED/);
  assert.ok(!calls.some(x => x.endsWith("/capture")));
});
test("approved capture is explicit, while failures never echo provider payloads", async () => {
  const calls: string[] = [];
  const client = new SandboxAcceptance("https://example.com", token, "sandbox", async (input, init) => {
    const path = new URL(String(input)).pathname; calls.push(`${init?.method}:${path}`);
    return Response.json(path === "/health" ? health : path.endsWith("paypal-status") ? { payment: { state: "APPROVED" } } : { state: "CJ_SANDBOX_PAID" });
  });
  const result = await client.run("capture", "order-1234");
  assert.equal(result.state, "CJ_SANDBOX_PAID");
  assert.equal(calls.filter(x => x.startsWith("POST:")).length, 1);
  const failed = new SandboxAcceptance("https://example.com", token, "sandbox", async input => String(input).endsWith("/health") ? Response.json(health) : Response.json({ secret: "NEVER-LOG" }, { status: 503 }));
  await assert.rejects(failed.run("status", "order-1234"), { message: "BACKEND_HTTP_503" });
});
test("create uses one stable idempotency key and rejects a live approval URL", async () => {
  let count = 0;
  const client = new SandboxAcceptance("https://example.com", token, "sandbox", async (input, init) => {
    if (String(input).endsWith("/health")) return Response.json(health);
    count++;
    assert.equal(new Headers(init?.headers).get("idempotency-key"), "stable-key-123456789");
    assert.deepEqual(JSON.parse(String(init?.body)), { items: [{ productId: "tech-organiser-black-3", quantity: 1 }] });
    return Response.json({ paypalId: "PAYPAL-1234", approvalUrl: "https://www.paypal.com/checkoutnow?token=PAYPAL-1234" });
  });
  await assert.rejects(client.run("create", undefined, "stable-key-123456789"), /INVALID_APPROVAL_URL/);
  assert.equal(count, 1);
});
test("public acceptance summaries exclude arbitrary fields and never self-certify external acceptance", () => {
  const summary = acceptanceSummary("status", { order: { state: "CJ_SANDBOX_PAID", approvalUrl: "SECRET", payer: "PRIVATE", paypalId: "PRIVATE" } });
  assert.equal(summary.externalEndToEndAccepted, false);
  assert.equal(summary.realShipmentAccepted, false);
  assert.ok(!JSON.stringify(summary).includes("SECRET") && !JSON.stringify(summary).includes("PRIVATE"));
});

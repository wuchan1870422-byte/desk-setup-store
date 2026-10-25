import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateLaunchEvidence, evidenceChecks, type LaunchEvidenceFile } from "../commerce/launch-readiness";
import { checkoutReadiness, launchChecks } from "../src/lib/checkout-contract";

const now = new Date("2026-10-24T00:00:00Z");
function fixture(): LaunchEvidenceFile {
  const value = JSON.parse(readFileSync(new URL("../docs/launch-evidence.example.json", import.meta.url), "utf8")) as LaunchEvidenceFile;
  value.shipping = { country: "AU", postcodes: ["2000"], route: "Test route", quoteExpiresAt: "2026-10-25T00:00:00Z" };
  value.costs = { saleAudCents: 5000, goods: { currency: "USD", cents: 400 }, freight: { currency: "USD", cents: 1000 }, fx: { audPerUsd: 1.5, reference: "private-ref-fx-001", checkedAt: "2026-10-23T00:00:00Z", expiresAt: "2026-10-25T00:00:00Z" }, feeBps: 400, feeFixedAudCents: 30, reserveBps: 500, taxAudCents: 100, acquisitionAudCents: 500 };
  for (const key of evidenceChecks) value.checks[key] = { status: "verified", reference: `private-ref-${key}-001`, checkedAt: "2026-10-23T00:00:00Z", expiresAt: null };
  return value;
}
test("complete synthetic evidence calculates converted costs but cannot enable checkout", () => {
  const result = evaluateLaunchEvidence(fixture(), now);
  assert.equal(result.commercialEvidenceReady, true);
  assert.equal(result.checkoutEnabled, false);
  assert.deepEqual(result.verifiedPostcodes, ["2000"]);
  assert.equal(result.economics?.profitCents, 1820);
  assert.equal(checkoutReadiness(Object.fromEntries(launchChecks.map(x => [x, true]))).ready, false);
});
test("current candidate has missing evidence and no invented zero costs", () => {
  const result = evaluateLaunchEvidence(JSON.parse(readFileSync(new URL("../docs/launch-evidence.example.json", import.meta.url), "utf8")), now);
  assert.equal(result.sandboxTestReady, true);
  assert.equal(result.commercialEvidenceReady, false);
  assert.equal(result.economics, null);
  assert.ok(result.blockers.includes("EVIDENCE_SAMPLE_MISSING_OR_STALE"));
  assert.ok(result.blockers.includes("PRICING_OR_FEES_UNCONFIRMED"));
});
test("expired freight, unknown fees, future evidence and unmapped demo products block readiness", () => {
  for (const edit of [
    (e: LaunchEvidenceFile) => { e.shipping.quoteExpiresAt = "2026-10-23T00:00:00Z"; },
    (e: LaunchEvidenceFile) => { e.costs.taxAudCents = null; },
    (e: LaunchEvidenceFile) => { e.checks.sample.checkedAt = "2027-01-01T00:00:00Z"; },
    (e: LaunchEvidenceFile) => { e.product.productId = "demo-tech-pouch"; },
    (e: LaunchEvidenceFile) => { e.shipping.postcodes = ["ALL_AU"]; },
    (e: LaunchEvidenceFile) => { e.checks.sample.reference = "TODO"; },
  ]) { const e = fixture(); edit(e); assert.equal(evaluateLaunchEvidence(e, now).commercialEvidenceReady, false); }
});
test("USD inputs require a fresh exchange rate and nonpositive margins remain blocked", () => {
  const e = fixture(); e.costs.fx.reference = null;
  assert.ok(evaluateLaunchEvidence(e, now).blockers.includes("USD_FX_MISSING_OR_STALE"));
  const loss = fixture(); loss.costs.saleAudCents = 100;
  assert.ok(evaluateLaunchEvidence(loss, now).blockers.includes("NON_POSITIVE_UNIT_MARGIN"));
});
test("booleans, malformed input and prototype keys never imply readiness", () => {
  for (const input of [null, [], true, {}, { schema: "desk-setup-launch-v1", product: { productId: "__proto__", variant: "black" }, checks: Object.fromEntries(evidenceChecks.map(x => [x, true])) }]) {
    const result = evaluateLaunchEvidence(input, now);
    assert.equal(result.sandboxTestReady, false);
    assert.equal(result.commercialEvidenceReady, false);
  }
});

import { sandboxCatalogue } from "./catalogue";
import { unitEconomics } from "../src/lib/checkout-contract";

// Private evidence files are operator attestations, not an automated audit of
// suppliers or legal eligibility. Never include identity documents or secrets.
export const evidenceChecks = ["supplier", "sample", "imageRights", "stock", "shippingQuote", "sampleDelivery", "sellerIdentity", "support", "returns", "policies", "taxArrangement", "sandboxPayment", "sandboxRefund", "desktopQA", "realPhoneQA", "orderHandoff"] as const;
type Check = (typeof evidenceChecks)[number];
export type Evidence = { status: "pending" | "verified"; reference: string | null; checkedAt: string | null; expiresAt: string | null };
export type LaunchEvidenceFile = {
  schema: "desk-setup-launch-v1";
  product: { productId: string; cjSku: string; variant: string };
  shipping: { country: "AU"; postcodes: string[]; route: string; quoteExpiresAt: string | null };
  costs: {
    saleAudCents: number | null; goods: Cost; freight: Cost;
    fx: { audPerUsd: number | null; reference: string | null; checkedAt: string | null; expiresAt: string | null };
    feeBps: number | null; feeFixedAudCents: number | null; reserveBps: number | null;
    taxAudCents: number | null; acquisitionAudCents: number | null;
  };
  checks: Record<Check, Evidence>;
};
type Cost = { currency: "AUD" | "USD"; cents: number | null };
const record = (x: unknown): Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
const validTime = (x: unknown) => typeof x === "string" && /^\d{4}-\d\d-\d\dT/.test(x) && Number.isFinite(Date.parse(x));
const amount = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= 100000000;
const reference = (x: unknown) => typeof x === "string" && x.trim().length >= 4 && x.length <= 200 && !/placeholder|TODO|example|pending/i.test(x);

export function evaluateLaunchEvidence(input: unknown, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_EVALUATION_TIME");
  const root = record(input), product = record(root.product), shipping = record(root.shipping), costs = record(root.costs), checks = record(root.checks);
  const blockers: string[] = [];
  const add = (code: string) => { if (!blockers.includes(code)) blockers.push(code); };
  const fresh = (x: unknown) => validTime(x) && Date.parse(x as string) <= now.getTime();
  const unexpired = (x: unknown) => validTime(x) && Date.parse(x as string) > now.getTime();
  if (root.schema !== "desk-setup-launch-v1") add("INVALID_EVIDENCE_SCHEMA");
  const candidate = typeof product.productId === "string" && Object.hasOwn(sandboxCatalogue, product.productId) ? sandboxCatalogue[product.productId as keyof typeof sandboxCatalogue] : undefined;
  const fixtureReady = Boolean(candidate && candidate.cjSku === product.cjSku && typeof product.variant === "string" && product.variant.trim());
  if (!fixtureReady) add("CANDIDATE_MAPPING_UNCONFIRMED");
  for (const check of evidenceChecks) {
    const e = record(checks[check]);
    if (e.status !== "verified" || !reference(e.reference) || !fresh(e.checkedAt) || (e.expiresAt !== null && !unexpired(e.expiresAt))) add(`EVIDENCE_${check.toUpperCase()}_MISSING_OR_STALE`);
  }
  const postcodes = shipping.postcodes;
  if (shipping.country !== "AU" || !Array.isArray(postcodes) || !postcodes.length || postcodes.length > 100 || !postcodes.every(x => typeof x === "string" && /^\d{4}$/.test(x)) || new Set(postcodes).size !== postcodes.length || typeof shipping.route !== "string" || !shipping.route.trim()) add("SHIPPING_SCOPE_UNCONFIRMED");
  if (!unexpired(shipping.quoteExpiresAt)) add("SHIPPING_QUOTE_MISSING_OR_EXPIRED");
  const fx = record(costs.fx);
  const converted = (value: unknown): number | null => {
    const cost = record(value);
    if (!amount(cost.cents) || !["AUD", "USD"].includes(String(cost.currency))) { add("COST_MISSING_OR_INVALID"); return null; }
    if (cost.currency === "AUD") return cost.cents;
    if (typeof fx.audPerUsd !== "number" || !Number.isFinite(fx.audPerUsd) || fx.audPerUsd <= 0 || fx.audPerUsd > 100 || !reference(fx.reference) || !fresh(fx.checkedAt) || !unexpired(fx.expiresAt)) { add("USD_FX_MISSING_OR_STALE"); return null; }
    const cents = Math.round(cost.cents * fx.audPerUsd);
    if (!amount(cents)) { add("COST_MISSING_OR_INVALID"); return null; }
    return cents;
  };
  const goodsCents = converted(costs.goods), freightCents = converted(costs.freight);
  const numeric = ["saleAudCents", "feeBps", "feeFixedAudCents", "reserveBps", "taxAudCents", "acquisitionAudCents"] as const;
  if (!numeric.every(key => amount(costs[key])) || costs.saleAudCents === 0 || Number(costs.feeBps) > 10000 || Number(costs.reserveBps) > 10000) add("PRICING_OR_FEES_UNCONFIRMED");
  let economics: ReturnType<typeof unitEconomics> | null = null;
  if (goodsCents !== null && freightCents !== null && !blockers.includes("PRICING_OR_FEES_UNCONFIRMED")) {
    economics = unitEconomics({ revenueCents: costs.saleAudCents as number, goodsCents, freightCents, feeBps: costs.feeBps as number, feeFixedCents: costs.feeFixedAudCents as number, reserveBps: costs.reserveBps as number, taxCents: costs.taxAudCents as number, acquisitionCents: costs.acquisitionAudCents as number });
    if (economics.profitCents <= 0) add("NON_POSITIVE_UNIT_MARGIN");
  }
  return {
    schema: "desk-setup-readiness-v1", evaluatedAt: now.toISOString(),
    sandboxTestReady: fixtureReady && root.schema === "desk-setup-launch-v1",
    sandboxReadinessScope: "catalogue fixture only; runtime and provider acceptance are separate",
    commercialEvidenceReady: blockers.length === 0, checkoutEnabled: false,
    evidenceBasis: "operator attestations; source documents require human review",
    verifiedPostcodes: Array.isArray(postcodes) && !blockers.includes("SHIPPING_SCOPE_UNCONFIRMED") ? postcodes : [],
    economics, blockers,
  } as const;
}

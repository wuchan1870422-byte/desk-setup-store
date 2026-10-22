import { sanitiseCart, type CartItem } from "./cart";
import { products } from "../data/products";

export const launchChecks = ["supplierAndSample", "shippingRoute", "stockAndPrice", "sellerIdentity", "returnsAddress", "policies", "sandboxPaymentAndRefund"] as const;
export type LaunchEvidence = Record<(typeof launchChecks)[number], boolean>;
export function checkoutReadiness(evidence: Partial<LaunchEvidence>) {
  const missing = launchChecks.filter((key) => evidence[key] !== true);
  return { ready: missing.length === 0 && !products.some((p) => p.isDemo), missing, demoCatalogue: products.some((p) => p.isDemo) };
}
// This file is a hand-off contract, never proof of price, stock or payment.
// The eventual server must validate IDs and quantity, re-price, re-quote freight
// and create/capture payment using its own catalogue and supplier mappings.
export function buildQuoteRequest(items: CartItem[]) {
  const clean = sanitiseCart(items);
  if (!clean.length) throw new Error("The bag is empty.");
  return { schema: "desk-setup-quote-v1", currency: "AUD", mode: "demo", items: clean.map(({productId, quantity}) => ({ productId, quantity })), paymentRequested: false } as const;
}
export type EconomicsInput = { revenueCents: number; goodsCents: number; freightCents: number; feeBps: number; feeFixedCents: number; reserveBps: number; taxCents: number; acquisitionCents: number };
export function unitEconomics(x: EconomicsInput) {
  for (const [key,value] of Object.entries(x)) if (!Number.isSafeInteger(value)||value<0||value>100000000) throw new Error(`Invalid ${key}`);
  if (x.feeBps>10000||x.reserveBps>10000) throw new Error("Rates must be 0–100%.");
  const feeCents=Math.round(x.revenueCents*x.feeBps/10000)+x.feeFixedCents;
  const reserveCents=Math.round(x.revenueCents*x.reserveBps/10000);
  const beforeAcquisitionCents=x.revenueCents-x.goodsCents-x.freightCents-feeCents-reserveCents-x.taxCents;
  return { feeCents,reserveCents,beforeAcquisitionCents,profitCents:beforeAcquisitionCents-x.acquisitionCents,maxAcquisitionCents:Math.max(0,beforeAcquisitionCents) };
}

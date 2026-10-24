# Single-candidate launch evidence

```sh
npm run check:launch
npm run check:launch -- private/launch-evidence.json --require-commercial
```

Copy `docs/launch-evidence.example.json` into ignored `private/` to fill it.
Default output lists blockers while exiting successfully so CI can validate the
diagnostic. `--require-commercial` exits 2 while commercial evidence is blocked;
unreadable/invalid JSON exits 1. No command fetches a supplier or enables checkout.

The checked-in example intentionally has **pending** evidence and null costs.
The historic supplier-page quote and A$39.90 sandbox price are not copied in as
current costs or an approved selling price. The public demo catalogue is never
mapped automatically to the candidate SKU.

Each required check needs `status=verified`, a non-placeholder private evidence
reference and an ISO timestamp no later than the evaluation time. `expiresAt`
must be null for a deliberately non-expiring attestation or a future timestamp.
Use expiry for volatile facts such as stock, quotes and fees. A person must
inspect the referenced source: a valid schema does not prove the attestation is
true, legally sufficient or commercially viable.

The shipping scope is an explicit list of AU postcodes, route and a current quote
expiry. A postcode list alone is not delivery evidence: both shippingQuote and
sampleDelivery attestations are mandatory. Unverified areas must stay excluded.
Do not publish personal customer addresses as evidence.

Goods/freight carry AUD or USD integer cents. USD requires a dated, sourced,
unexpired AUD-per-USD rate. Calculation converts to AUD integer cents before
using existing unit economics. Sale price, fees, tax, reserve and acquisition
cost require explicit numbers; null is unknown, not zero. Zero values require
the relevant checked fee/tax arrangement; the evaluator cannot make that
business judgment. Nonpositive calculated margin remains a blocker.

`sandboxTestReady` means only that the local single-SKU fixture is mapped. It
does not attest to runtime credentials, provider authentication or a completed
transaction. `commercialEvidenceReady` reports structural operator evidence
readiness. Both preserve `checkoutEnabled=false`; the legacy public demo guard
remains unchanged. Real checkout/address handling needs a separate implementation
and launch decision.

Keep credentials, identity documents, full addresses, provider raw responses and
personal/payment data out of Git, CI logs and public evidence references. Store
only opaque references here. The example is a schema illustration, not a
pre-filled launch approval.

# Minimal owner order handoff

This is an owner-only **sandbox** ledger. There is no real customer, address,
shipment, email sender, real procurement or automated refund in this version.

## Inspect rather than retry

`GET /sandbox/review?limit=50&cursor=KNOWN_LAST_ID&staleMinutes=30` requires the
admin token. It uses bounded keyset pagination over all sandbox orders; empty
results are not a claim about payments in provider accounts. It returns known
references, safe reason codes and suggested owner actions. No request keys,
approval URLs, payer details or provider bodies are included. Review is read-only. Separate CJ contract checks are not customer/payment orders and are inspected through `/sandbox/supplier-checks/:id`; this order export does not include those checks.

```sh
npm run orders:review -- --network=sandbox
```

The script follows pagination with loop/size guards and writes an owner-readable
JSON under ignored `private/`. Its stdout reports a count, not the order contents.
Never publish that file or forward it to a customer as proof of payment.

| Situation | Owner action | Forbidden shortcut |
| --- | --- | --- |
| PENDING | Inspect test payment; wait for buyer approval or record cancellation observation | Treating return URL as payment or creating a replacement order |
| Capture uncertain / PAID | Fresh verified read; use existing owner reconciliation only if allowed by the state machine | A second capture |
| CREATING/CAPTURING/FULFILLING stale | Check provider records and known reference; investigate interrupted work | Resetting state or blindly repeating a supplier request |
| CJ result uncertain | Inspect that exact test order in CJ; record outcome | Paying or submitting another order |
| Refund/reversal/decline hold | Inspect PayPal and any supplier work; handle manually | Automatic procurement/recovery |
| CJ_SANDBOX_PAID | Record successful simulation and provider evidence | Showing shipped/delivered or inventing a tracking code |

Staleness uses last persisted transition time, falling back to creation time for
legacy rows. It is a diagnostic, not a timer job. No background polling or alert
delivery is implied.

## Durable payment exceptions

`sandbox_order_events` is keyed by the signed PayPal event ID. A freshly verified
refund, reversal or decline records a durable hold. An unconfirmed hold may be
upgraded on provider redelivery. Unknown events are acknowledged with an explicit
unknown-order response and do not alter known orders. Mismatched references or
money are rejected, never interpreted as a completed payment.

`POST /sandbox/events/:eventId/acknowledge` marks an owner acknowledgement. It
**does not release the hold**. Payment and fulfilment compare-and-swap claims
check for any payment-exception event atomically. Calls already in flight before
the hold cannot be recalled by a database flag; investigate their outcome and
any supplier cancellation manually. No hold-release/reset endpoint is provided.

## Future live manual chain (not activated)

1. Verify settled payment against the trusted order and current provider record.
2. Recheck the approved SKU, stock, freight quote, delivery area and procurement
   budget. If any differ, hold for an owner decision before purchasing.
3. The designated operator confirms supplier acceptance and records its reference.
4. Record an actual carrier/tracking reference only after it exists. Notify the
   customer through an approved channel and retain evidence of what was sent.
5. Handle delay, loss, damage, cancellation, return and refund with the confirmed
   seller contact/return arrangement. Track completion instead of assuming it.

Seller identity, operator responsibility/check frequency, support inbox, return
address, approved budget and actual tracking source remain required external
inputs. The sandbox does not collect them or make commitments on their behalf.
Until a separate live workflow defines necessary PII, access control, retention,
deletion and disclosures, do not add real contact/address data here.

## Test handoff examples

- Success: `CJ_SANDBOX_PAID` → verify provider simulation → no real shipment.
- Payment exception: verified refund event → persistent hold → inspect provider
  and supplier records → owner acknowledgement, hold remains.
- Supplier timeout: `REVIEW / CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY` → inspect exact
  provider order → keep blocked, no resubmission.

Use synthetic identifiers for walkthroughs. These examples are not real orders,
completed refunds or delivery records.

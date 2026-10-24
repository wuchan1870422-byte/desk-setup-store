# Private sandbox acceptance

The public storefront remains a demo. This runbook uses the existing owner-only
backend, one candidate SKU and test money. It is not live-commerce acceptance.
No script deploys, approves a buyer, refunds, pays a real CJ balance or ships.

## Offline checks (no accounts)

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run check:launch
npm run build:commerce
npm run build
npm run check:export
npx playwright install chromium
npm run test:e2e
```

CI runs these checks against the local static export with mocked provider
responses and temporary SQLite. It has no payment secrets or deploy step. Browser
coverage uses Chromium at 320, 375, 390, 768 and 1440 CSS pixels; it does not stand
in for Safari, real phones or manual 200% browser zoom. Optional local
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an already installed Chromium;
record its actual version when used. Browser downloads are not silently skipped.

## Existing environment preflight

Before external testing, inspect the existing backend; do not create a second
Site/database. All three SQL migrations must exist in its database and its deployed
source must match the version under test. For the separate hosted profile,
`hosting/build.mjs` includes all three migrations in the existing journal sequence.
Building is local only and does not apply migrations. Keep storefront and backend
identities separate. Never apply a migration to a production customer database as
part of a test run.

Runtime values: `COMMERCE_MODE=sandbox`, valid `STOREFRONT_ORIGIN`, `ORDERS`,
`PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_SECRET`,
`PAYPAL_SANDBOX_WEBHOOK_ID`, `CJ_API_KEY` or `CJ_ACCESS_TOKEN`, and a 32+ character
`SANDBOX_ADMIN_TOKEN`. Store secrets server-side, never in Git or `NEXT_PUBLIC_*`.
Subscribe the same PayPal Sandbox app to `PAYMENT.CAPTURE.COMPLETED`,
`PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED` and
`PAYMENT.CAPTURE.DECLINED`.

`/health` reports configuration presence, not usable credentials or a working
database. `/sandbox/readiness` (authenticated) separately probes all three database
tables. `/sandbox/connections` authenticates; a configured CJ access token without
an API key remains unverified. None of these endpoints certifies end-to-end
acceptance. Missing schema/configuration must be fixed through an independently
authorized deployment, not by changing the public shop into a payment client.

## Explicit operator commands

Supply `SANDBOX_BACKEND_URL` and `SANDBOX_ADMIN_TOKEN` from a secure process
environment. Do not paste credentials into command arguments, transcripts,
screenshots or files committed to Git. If the existing private host additionally
requires Sites service access, use the supported host boundary from an authorized
operator session; do not make the host public to work around it. The standalone
CLI expects a directly reachable backend and fails closed behind an access wall.

```sh
npm run sandbox:acceptance -- check --network=sandbox
npm run sandbox:acceptance -- create --network=sandbox --request-key=operator-stable-test-0001
npm run sandbox:acceptance -- status --network=sandbox --order-id=KNOWN_LOCAL_ID
npm run sandbox:acceptance -- capture --network=sandbox --order-id=KNOWN_LOCAL_ID
npm run sandbox:acceptance -- reconcile --network=sandbox --order-id=KNOWN_LOCAL_ID
npm run orders:review -- --network=sandbox
```

Every network run first verifies the backend reports sandbox mode, no live
payments and no real procurement. Requests reject redirects. Missing network
opt-in or credentials returns blocked with nonzero exit code. Create uses a
stable operator key; keep it for retries rather than generating a replacement.

Create writes a randomly named, owner-readable `private/sandbox-create-*.json`.
Open its **sandbox** approval URL in a buyer's test account. The operator must
approve there; return/cancel query strings are never proof of payment. The CLI's
capture step first verifies fresh `APPROVED` state; already completed or uncertain
orders use status/reconciliation, never another capture. Reconciliation can
resume previously verified sandbox fulfilment; it is not a read-only command.
`status`, `check` and review export do not capture or procure.

Private result files contain operational identifiers/approval URLs and are
gitignored. Do not upload them as CI artifacts. Delete them after the test record
has been retained securely. Console summaries are allowlisted and do not print
provider bodies or payer data. A local `CJ_SANDBOX_PAID` state deliberately still
reports `externalEndToEndAccepted=false`; acceptance requires provider records.

## Acceptance matrix

For each row record commit, environment alias, time, expected and actual result,
and private evidence reference. Do not publish provider IDs or buyer details.

| Case | Required observation |
| --- | --- |
| Success | Buyer approves test order; verified AUD total/internal reference; one local/PayPal/CJ test order; CJ isSandbox=1 and simulated payment verified in provider records; no real balance deduction/shipment |
| Cancel/unapproved | Return URL changes no payment state; capture runner refuses without fresh APPROVED; no supplier submission |
| Failure | Failed/declined payment cannot fulfil; trusted declined event is held for owner review |
| Duplicate | Same request key returns same order; repeated capture and signed notifications produce no second procurement |
| Capture timeout | Fresh read reconciles verified payment without recapturing; provider failure remains review |
| Supplier timeout | No blind retry; manual inspection records the known CJ reference before any further action |
| Refund/partial refund | Refund performed **in test merchant account**; real signed callback and fresh capture/refund reads produce one hold; duplicate event does not duplicate ledger entries |
| Reversal | Authenticated Sandbox provider evidence if the provider makes the scenario available; otherwise mark not exercised and retain mocked test coverage separately |
| Invalid webhook | Bad signature, unknown order or mismatched reference/amount cannot advance a known order |

The webhook simulator alone cannot prove signed delivery for a real test order.
If the host's private access wall blocks callbacks, mark this blocked. Do not
change its audience or fabricate an acceptance record. Refund/reversal callbacks
that are signed and mapped to a known order but temporarily unreadable return a
retryable error after recording an unconfirmed hold. Redelivery can upgrade it.

The existing return URL still lands on the demo cart; no public approval UI or
SDK is added. A real phone, keyboard flow, manual 200% zoom and host-specific
deep links must be recorded separately before any live opening.

Official reference: [PayPal Payments v2](https://developer.paypal.com/api/payments/v2)
and [webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names/).

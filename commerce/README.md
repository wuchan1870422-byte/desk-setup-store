# Owner-only sandbox order backend

This is a sandbox-only Cloudflare Worker, separate from the Next.js static storefront. The source includes a [separate hosted deployment profile](hosting/README.md). Runtime deployments, credentials and account-level test results are managed separately; the public storefront remains a demo.

There is no live mode in this version. PayPal's host is hard-coded to sandbox, CJ orders always use `isSandbox=1` and `payType=3`, and the only supplier payment operation is CJ's explicit sandbox `simulatePay`. It first checks that the returned order really is a sandbox order. No real balance-payment endpoint exists in this code.

## Implemented

- Server-priced, allowlisted catalogue; integer-cent AUD test totals.
- Durable D1 request-key uniqueness and state transitions.
- PayPal sandbox creation/approval link, capture, full-order verification and signed webhook verification.
- Only verified `COMPLETED` capture status, matching currency, total and internal order IDs can advance an order.
- Duplicate create/capture/callback requests do not create a second supplier order.
- CJ API-key authentication, sandbox order creation and simulated payment.
- Ambiguous payment or supplier timeouts become `REVIEW`; no blind procurement retries.
- Capture-timeout recovery rechecks PayPal without capturing twice; verified `PAID` orders can resume fulfilment with an atomic claim. Uncertain supplier submissions are never retried automatically.
- After uncertain creation, an owner can link an existing PayPal reference only after a fresh GET verifies the pending state, invoice, internal references, amount and approval token.
- A read-only payment inspection returns verified state without payer data, capture or supplier calls. Provider diagnostics expose only allowlisted reason codes.
- All sandbox management routes require a server admin token; no public checkout or PII input.
- An unauthenticated webhook advances only known orders after PayPal signature verification and a fresh PayPal API read.
- No customer address is accepted: CJ sandbox uses a fixed `TEST ONLY - DO NOT DELIVER` recipient. No real shipment or tracking number is created.

## Files

`catalogue.ts`: one real candidate supplier SKU with a clearly marked **test** retail price. `orders.ts`: payment/fulfilment state machine. `providers.ts`: actual HTTP adapters. `d1-store.ts`: persistence. `worker.ts`: protected HTTP routes. `migrations/`: schema-only D1 migration.

## Local checks

From repository root:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build:commerce
```

The Worker output in `commerce/dist/` is ignored. Tests use real in-memory SQLite for uniqueness and compare-and-swap behaviour, with injected provider HTTP responses. These tests do **not** establish that this CJ account or PayPal account has working API access.

## Deployment after account access is approved

Use the official Wrangler CLI with the user's own Cloudflare account, or adapt the module to a supported hosted Worker backend. Do not change the static Next.js Site's hosting manifest to point at this Worker.

1. Create a **dedicated sandbox** D1 database and add its actual `ORDERS` binding to `commerce/wrangler.jsonc`. No invented IDs are included.
2. Apply `commerce/migrations/0001_sandbox_orders.sql` using D1 migrations.
3. In secret storage configure `SANDBOX_ADMIN_TOKEN` (at least 32 random characters), `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_SECRET`, and either `CJ_API_KEY` or an existing `CJ_ACCESS_TOKEN`. Use server secrets only; the CJ API key and CJ MCP token are different credential types.
4. Set `COMMERCE_MODE=sandbox` for this sandbox backend. The committed default is `disabled`. Setting it to `live` fails closed.
5. Deploy the Worker, configure a real **PayPal sandbox app** webhook for `PAYMENT.CAPTURE.COMPLETED`, and store its `PAYPAL_SANDBOX_WEBHOOK_ID`. Verify the app/merchant matches the server credentials.
6. Execute a sandbox order, approve using a sandbox buyer, then capture; verify D1 and CJ's `isSandbox` result. PayPal's webhook simulator alone cannot validate the postback verification flow.
7. Test duplicate callbacks, provider timeouts and the `REVIEW` path. Confirm no real wallet deduction or shipping occurred.

The existing public cart remains disabled; it does not call these owner-only routes. The PayPal approval return URL goes back to the demo cart; returning there alone is not a payment confirmation. During sandbox testing an authenticated operator or the verified webhook completes server reconciliation.

## HTTP interface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Mode/readiness flags only, no secrets |
| GET | `/sandbox/connections` | Owner-only authentication checks; no order creation |
| POST | `/sandbox/orders` | Owner creates a test order; `Idempotency-Key` required |
| GET | `/sandbox/orders/:id` | Owner checks status |
| POST | `/sandbox/orders/:id/capture` | Owner completes sandbox capture |
| POST | `/sandbox/orders/:id/reconcile` | Recover verified payment without repeating capture |
| POST | `/sandbox/orders/:id/link-paypal` | Verify and link a known order after uncertain creation |
| GET | `/sandbox/orders/:id/paypal-status` | Inspect verified payment state without changing the order |
| POST | `/webhooks/paypal` | Verified PayPal sandbox callback |

Example request body for `/sandbox/orders` (do not include contact data):

```json
{"items":[{"productId":"tech-organiser-black-3","quantity":1}]}
```

This uses an **A$39.90 test amount**, not a real listing, quote, approved selling price or profit projection. The public storefront's three illustrative products are not mapped to supplier orders.

## Remaining before live commerce

Verified supplier/account API access, deployment acceptance, a buyer approval interface, real product approval and imagery, postcode-specific shipping/tax quotes, explicit procurement budgets, durable quote/cost checks, live fulfilment/address handling and its privacy controls, stock checks, cancellation/refund/dispute handling, tracking sync, operational alerts, crash recovery and launch acceptance remain necessary. This sandbox version does not enable any live purchases merely by changing environment variables.

CJ's access token is cached in the Worker isolate until its documented expiry. Production requires shared, rate-controlled refresh/reconciliation and an audited secret lifecycle. Uncertain creation can link only a known, verified pending provider order. The owner reconcile route can resume a capture-timeout review or a persisted `PAID` state after a fresh PayPal read. Uncertain CJ creation or payment simulation requires manual investigation; recovery never repeats it. Keep the sandbox API/admin token out of public UI, source, Git, browser storage and logs. There is no email-sending integration.

## Official references

- https://developer.paypal.com/api/orders/v2
- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developers.cjdropshipping.com/en/api/api2/api/auth.html
- https://developers.cjdropshipping.com/en/api/api2/api/shopping.html
- https://developers.cjdropshipping.com/en/api/start/sandbox.html
- https://developers.cloudflare.com/d1/reference/migrations/

## Safe recovery tools

`link-paypal` accepts only `{ "paypalId": "<known sandbox order ID>" }`. It never creates a replacement order or captures payment. Other local states remain unchanged; mismatches remain held for review. `paypal-status` returns only allowlisted provider state and payment/capture flags. Do not capture a test order until the sandbox buyer has approved it. Keep provider credentials and admin tokens out of every public request example.

The authenticated connection check reports provider authentication separately from order acceptance. It never captures a payment or submits a CJ order and returns no token or provider body. An already configured CJ access token without an API key is explicitly reported as unverified.

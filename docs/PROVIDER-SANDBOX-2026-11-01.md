# Provider sandbox observation — 1 November 2026

This is an observed transaction in official provider sandboxes, using test funds. It is separate from unit tests and does not establish live-commerce readiness or revenue.

## Environment and scope

- One allowlisted `tech-organiser-black-3` fixture, quantity 1, A$39.90 test total.
- Existing owner-private Desk Setup Store backend and its dedicated D1 database; public storefront checkout remains disabled.
- Transaction source: private deployment commit `33293f5cc0b093ddfe9ff228175464f1c0172d30`.
- Fresh supplier inspection source: private deployment commit `c4217a92e4d0930664ae86b719e3298a37926bc3`.
- Provider/order/capture references remain in the private D1 record. No account credentials, approval tokens, payer data or full provider payloads are published here.

## Observations

| Check | Actual result |
| --- | --- |
| Sandbox buyer login | Browser showed the authenticated sandbox account home and logout control. |
| PayPal approval | Buyer approved the created A$39.90 sandbox checkout; the server independently read `APPROVED`. A return URL alone was not treated as payment. |
| Server capture | Capture completed; a fresh verified PayPal order read returned `COMPLETED` and `paymentVerified: true`, with the persisted capture reference. |
| CJ order and simulated payment | Backend progressed to `CJ_SANDBOX_PAID` after sandbox-only create, confirm, simulation and verification. |
| Fresh CJ inspection | Authenticated server GET returned `isSandbox: true`, state `UNSHIPPED`, substatus `PENDING`, for the persisted CJ reference. This describes a simulated order, not real dispatch. |
| Repeated create | Reusing the original request key returned the same local, PayPal, capture and CJ references. |
| Repeated capture | Returned the same completed local record and provider references; no second capture or supplier submission was triggered by that path. |
| Database | All three readiness probes returned available. |
| New reader verification | 45/45 private-backend tests, typecheck, Worker build, artifact validation and diff check passed. Provider responses in these code tests are mocked; the observations above came from the deployed server and official sandboxes. |

`GET /sandbox/orders/:id/supplier-status` is an authenticated, read-only operation. It rejects a provider result without the sandbox flag and returns only an allowlisted supplier state. It cannot create, confirm, pay or retry an order.

## Acceptance still incomplete

- External signed PayPal webhook delivery remains blocked by owner-private hosting; no webhook ID is configured. This run used the protected operator capture route.
- Provider sandbox refunds/reversals, cancellation and failure acceptance are not established by this successful transaction.
- Real product/sample/image-rights checks, postcode-specific delivery and cost evidence, seller/returns/support arrangements, real-phone/zoom acceptance and live-account eligibility remain separate requirements.
- `UNSHIPPED` in a CJ sandbox and `CJ_SANDBOX_PAID` locally do not mean a real parcel exists. No real purchase, customer order, shipment or income was produced.

This receipt records the successful payment-to-simulated-fulfilment path only; it does not enable or certify unattended live trading.

# Verification

Rechecked on 23 October 2026 with Node.js 24.19.0. Installed versions are locked: Next.js 16.4.1, React 19.3.1, Tailwind CSS 4.3.3.

## Automated checks

- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 34/34 cases: ten storefront/domain cases and twenty-four sandbox commerce cases. Commerce persistence tests use real in-memory SQLite; provider responses are mocked.
- `npm run build:commerce`: PASS, separate sandbox Worker bundle. This does not deploy or connect the backend.
- `npm run build`: PASS, Next.js production static export; all requested routes generated.
- `npm run check:export`: PASS, 11 exported HTML files and 251 local route/asset references, metadata, Open Graph, robots, sitemap and absence of forms/payment SDKs.
- Source scan for common private-key and API-token patterns: no matches in publishable source.
- Locally generated desk illustration: rasterised and visually inspected; all product assets are first-party demo vectors.

- `node commerce/hosting/build.mjs <backend-project-id>`: PASS, separate hosted Worker artifact and schema-only migration; rejects the storefront Site identity.
- Hosted artifact smoke check: PASS, valid ESM, health response, disabled-by-default orders and status page.

## Responsive implementation

The layout has desktop, tablet (1100px), mobile (760px) and narrow-mobile (370px) breakpoints. At mobile widths the hero, collection, product details, cart and contact panels become one column. Navigation has a mobile toggle; tabs wrap. Product images use intrinsic dimensions and adaptive containers. Focus states, image alt text, button labels, a skip link, live cart status and reduced-motion styles are present.

## Browser verification limit

The original storefront verification on 15 October did not include rendered browser QA because the required browser workflow was unavailable then. The 23 October synchronization updates the separate sandbox backend and deployment profile; it leaves storefront components unchanged; no new desktop/mobile interaction pass was performed. Automated HTML/link checks and source-level responsive review do **not** replace rendered desktop/mobile interaction testing. No screenshot-based layout pass or real-device pass is claimed. A long-running local development server was not launched in this environment; use the documented `npm ci && npm run dev` locally. Successful compilation and static export have been verified.

## Manual acceptance before trading

- At 320, 375, 390, 768 and 1440 CSS pixels: inspect overflow, labels, imagery and controls.
- Open and close the mobile menu; navigate every footer link.
- Filter each category and restore All essentials.
- Add each product, add repeatedly, increase/decrease, remove and clear the bag.
- Refresh a populated bag; test a second tab and unavailable/corrupted storage.
- Check empty bag, missing route, keyboard-only navigation and 200% zoom.
- Confirm PayPal stays disabled and no real personal data can be submitted.
- Check direct product/policy navigation on the chosen public host.

Sandbox tests cover server pricing, unique request keys, concurrent capture/callback handling, payment amount/currency/order verification, ambiguous provider failures, sandbox-only endpoints, authentication and configuration guards. They do not prove external account access or a complete PayPal-to-CJ transaction. Passing these checks does not establish runtime credential readiness, a completed PayPal-to-CJ sandbox flow, live commerce or real shipment acceptance. Runtime secrets and provider/account test records are not published in this repository. The supplier UI quote is documented separately in `SUPPLIER-VALIDATION.zh-CN.md`.

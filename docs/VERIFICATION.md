# Verification

## 25 October 2026 update

The complete GitHub main source at `0220b874ed7e54bbf530fa54c666d72e9fb87322` was checked with Node.js 24.22.1. Lint, typecheck, the Next.js build and static-export checks passed. Unit tests passed **64/64**: fifteen storefront/domain/evidence cases and forty-nine commerce/acceptance/review/contract-check cases.

[GitHub CI for this source](https://github.com/wuchan1870422-byte/desk-setup-store/actions/runs/40172157590) also passed lint, typecheck, unit tests, launch diagnostics, Worker build, Next.js build, static-export checks and the browser test step. The source adds guarded CJ sandbox confirmation, fresh unpaid/paid state checks, bounded read-only rate-limit retries and explicit owner recovery without recreating a supplier order. Backend artifact validation passed separately. Account credentials, provider references and account-level execution results are kept out of this repository. This record does not certify a full PayPal-to-CJ transaction or live trading readiness.

The earlier verification record follows.

Rechecked on 24 October 2026 with Node.js 24.19.0. Installed versions are locked: Next.js 16.4.1, React 19.3.1, Tailwind CSS 4.3.3. Browser tests use pinned @playwright/test 1.64.1.

## Automated checks

- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 57/57 cases: fifteen storefront/domain/evidence cases and forty-two sandbox commerce/acceptance/review/contract-check cases. Commerce persistence tests exercise the real SQL schemas in in-memory SQLite, including all three migrations in readiness/review tests; provider responses are mocked.
- `npm run build:commerce`: PASS, separate sandbox Worker bundle. This does not deploy or connect the backend.
- `npm run build`: PASS, Next.js production static export; all requested routes generated.
- `npm run check:export`: PASS, 11 exported HTML files and 251 local route/asset references, metadata, Open Graph, robots, sitemap and absence of forms/payment SDKs.
- Source scan for common private-key and API-token patterns: no matches in publishable source.
- Locally generated desk illustration: rasterised and visually inspected; all product assets are first-party demo vectors.

- `node commerce/hosting/build.mjs <backend-project-id>`: PASS, separate hosted Worker artifact and schema-only migration; rejects the storefront Site identity.
- Hosted artifact smoke check: PASS, valid ESM, health response, disabled-by-default orders and status page.
- `npm run check:launch`: PASS as a diagnostic; the current candidate correctly reports commercial evidence blocked, unknown costs and checkout disabled. It is not a commercial-ready assertion.
- `npm run test:e2e`: PASS, 20/20 local rendered Chromium cases across 320, 375, 390, 768 and 1440 CSS pixels. Coverage includes navigation/filter/footer routes, add/update/remove/clear, refresh, download, corrupt/unavailable storage, cross-tab persistence, direct routes/404 and keyboard skip focus. Unexpected external browser requests fail tests.
- Local browser runtime: Chromium 153.0.8010.0 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The default Playwright browser download returned invalid ZIP data in this environment; an isolated scratch Chromium runtime was used instead. This fallback is not added to repository dependencies. CI installs its own matching Chromium; this record does not claim a CI result.
- Local 390px/1440px homepage and populated-cart screenshots captured and visually inspected. No layout clipping observed in those views. Screenshots contain demo data only and are not committed.
- Credential-free CLI smoke checks: missing explicit network opt-in / credentials returns blocked with exit 2 and no provider traffic, rather than reporting acceptance passed.

## Responsive implementation

The layout has desktop, tablet (1100px), mobile (760px) and narrow-mobile (370px) breakpoints. At mobile widths the hero, collection, product details, cart and contact panels become one column. Navigation has a mobile toggle; tabs wrap. Product images use intrinsic dimensions and adaptive containers. Focus states, image alt text, button labels, a skip link, live cart status and reduced-motion styles are present.

## Browser verification

On 24 October, the managed development entrypoint was repaired to translate the supervisor's host/port flags to Next.js options. The supported preview CLI started successfully. The production static-preview server also accepts `--port` while preserving `PORT` and its default port.

- Measured the production export in 320, 375, 390, 768 and 1440 CSS-pixel iframes across ten routes: homepage, three products, bag, desk-fit, three policies and Contact. All **50 route/viewport combinations** had document scroll width no larger than client width. The bag measurement covers its initial shell/loading state. See [recorded measurements](qa/layout-2026-10-24.json).
- On the public desktop demo, added all three products: A$147 subtotal + A$9 demo delivery = A$156. Increased Cable Keeper to two and removed Desk Shelf: A$97 + A$9 = A$106. Reload preserved the bag; Clear demo bag restored the empty state. PayPal remained disabled.
- Limits of that earlier pass: no real-device/touch or 200% zoom acceptance; development-preview client script readiness was not established. Its initial mobile-interaction gaps are addressed by the separate local Playwright pass below, not retroactively by these 50 measurements.
- The temporary responsive QA page was removed before the final build and is absent from the published export. No customer information was entered.


### Repeatable local interaction pass

The 24 October local static-export browser pass replaces the earlier source-only responsive check. It found that the skip link scrolled without moving keyboard focus; the main target now has tabIndex=-1 and all five viewport tests pass. Chromium viewport emulation and local screenshots do **not** establish a real-phone, Safari, manual 200% browser-zoom or public-host deep-link pass. Those remain manual acceptance items. No external provider order was created or captured during these local tests; no remote migration or deployment was performed.

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

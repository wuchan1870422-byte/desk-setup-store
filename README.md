# Desk Setup Store

An English-language, Australia-focused desk organisation and tech storage **demo storefront**. Built with **Next.js App Router, TypeScript and Tailwind CSS**, exported to static files for Cloudflare Pages or another static host.

**Sandbox integration:** a separate [owner-only order backend](commerce/README.md) includes PayPal/CJ adapters, durable order idempotency, verified recovery and read-only payment inspection. Its [hosted deployment profile](commerce/hosting/README.md) is included in this repository. Runtime configuration and end-to-end provider acceptance are separate from source synchronization; the public cart remains disabled. See the [supplier candidate and quote conditions](docs/SUPPLIER-VALIDATION.zh-CN.md).

**This is not an operating shop. No orders or payments are accepted.** All three products, prices, specifications, supplier references, illustrations, shipping fees and delivery estimates are fictional demonstration data. There are no reviews, sales counters, stock claims or certification badges.

## Links

- Public demo: https://desk-setup-store.j-w2007.chatgpt.site
- GitHub: https://github.com/wuchan1870422-byte/desk-setup-store
- Pre-launch checklist (中文): [docs/LAUNCH-CHECKLIST.zh-CN.md](docs/LAUNCH-CHECKLIST.zh-CN.md)
- Deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Run locally

Use Node.js 22 or 24 and npm. The lockfile pins the installed dependencies.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. No credentials, accounts, database or paid services are needed. Copy `.env.example` to `.env.local` only if you want a different canonical site origin.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check:export
```

The build creates **`out/`**. To preview that production export locally:

```bash
npm run preview
```

Open http://localhost:3000. Do not use `next start` for a static export.

## Included

- Editorial homepage, locally hosted vector hero and first-party product illustrations.
- Three statically generated product pages, with AUD demo prices, specifications, use cases and delivery notes.
- Filterable collection; product quick-add; quantity controls, removal, clear bag and browser persistence.
- Draft Shipping, Return and Privacy policies; Contact/store-status page.
- Responsive navigation, keyboard focus, skip link, labelled controls, live status announcements and reduced-motion support.
- Titles, descriptions, canonical URLs, Open Graph PNG, Twitter metadata, sitemap, robots.txt and favicon.
- Inactive analytics adapter; disabled PayPal integration slot. No payment SDK or order submission.
- A custom 404 page, security header declarations and static export integrity checks.

## Architecture

```text
src/app/                    Next.js routes, metadata and responsive styles
src/components/             Small interactive UI components and cart context
src/data/products.ts        Replaceable product catalogue; prices in integer cents
src/data/policies.ts        Draft policy content
src/config/store.ts         Demo invariant, currency, origin, shipping and support placeholders
src/lib/cart.ts             Validated cart data and integer-cent totals
src/lib/analytics.ts        Inactive typed adapter, no network transport
public/images/             First-party illustrative demo SVGs and OG PNG
scripts/check-export.mjs    Exported routes, metadata, links, assets and safety checks
scripts/serve.mjs           Dependency-free static preview
tests/cart.test.ts          Cart arithmetic, persistence validation and demo protections
commerce/                  Separate owner-only sandbox Worker, hosting profile and tests
docs/                      Deployment and launch requirements
```

Storefront server components run at build time. `generateStaticParams()` pre-renders the catalogue and policy routes. The deployed static storefront has **no API routes, Server Actions, SSR dependencies, accounts or order database**. The separate `commerce/` backend includes a sandbox database schema and is deployed independently and is not called by the storefront. Tailwind v4 is loaded through PostCSS; shared editorial styles and responsive breakpoints are in `globals.css`. Product imagery and fonts require no third-party requests.

The cart stores **only product IDs and quantities** in `localStorage` (`desk-setup-demo-cart-v1`). Invalid, unknown, fractional and non-positive entries are discarded; duplicates merge and quantities are capped at 10 per item as a demo interaction limit. Prices always come from the catalogue, not persisted values. The cap is not an inventory statement. Browser storage can be cleared using “Clear demo bag” or browser site settings. Storage is scoped to each origin.

## Change products

Edit `src/data/products.ts`. Every product contains:

| Field | Purpose |
| --- | --- |
| `id`, `slug` | Stable cart ID and URL; must be unique |
| `name`, `category`, `tagline`, `description` | English storefront content |
| `priceCents` | Integer AUD cents, e.g. `2900` = A$29.00 |
| `image` | Local image in `public/images/` |
| `colour`, `specs`, `uses` | Product details and illustrative use cases |
| `supplier`, `delivery` | Explicitly labelled fictional sourcing and logistics |
| `isDemo` | Enforced demo flag for this MVP |

Rebuild after changing the catalogue because URLs and HTML are generated ahead of time. Add real product photography only after securing usage rights and verifying that it depicts the supplied item. `scripts/create-illustrations.py` reproduces the SVG concept assets with Python's standard library; the committed PNG share image needs no generation step to build.

## PayPal boundary

`src/components/paypal-placeholder.tsx` reserves `#paypal-button-container`. Its disabled control is explicitly a placeholder, **not an official PayPal button**. No PayPal SDK or payment API request is loaded, and `store.demoMode` is hard-coded to `true`. Changing it alone deliberately raises an error; this is not a hidden live checkout toggle.

Before any official PayPal button is mounted, implement and test a separate server-side integration (for example a Cloudflare Worker). The server must obtain the trusted catalogue price, validate items and totals, create/capture Orders, verify completion and process duplicate callbacks safely. Keep a PayPal secret in server-side secret storage. Never expose it through `NEXT_PUBLIC_*`, source code or browser storage. Start with sandbox credentials and complete paid-order, cancellation, failed-payment, duplicate-capture and refund testing. The static export alone is not a payment backend.

See [PayPal Standard Checkout](https://developer.paypal.com/studio/checkout/standard/getstarted) and [Orders API](https://developer.paypal.com/api/orders/v2). No card fields or card storage are implemented in this project.

## SEO & analytics

`NEXT_PUBLIC_SITE_URL` determines canonical, sitemap and social image origins at **build time**. No private value belongs in this public environment variable. The demo deliberately has **`noindex` metadata and a robots disallow rule** while containing fictional catalogue data. The sitemap still exists for verification. Do not remove these protections until the catalogue and commercial terms are real.

`src/lib/analytics.ts` exposes `registerAnalyticsAdapter()` and `track()` with a minimal typed payload. The configuration keeps analytics disabled and no adapter is registered. After reviewing privacy disclosures and applicable consent requirements, a provider can be added for page views and catalogue/cart events. Never add names, emails, addresses or payment data to analytics payloads.

## Cloudflare deployment

The production build is standard Next.js **`output: "export"`**, with `trailingSlash: true` and unoptimised local images. No `@cloudflare/next-on-pages`, OpenNext adapter or Workers runtime is required for this MVP.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output | `out` |
| Node.js | `22` or `24` |
| Root directory | Repository root |
| Public env | `NEXT_PUBLIC_SITE_URL=https://your-domain.example` |

Use Cloudflare Pages' **Next.js (Static HTML Export)** preset or the equivalent manual settings. The current public test URL is deployed through Sites on Cloudflare; the same `out/` can be used on your own Pages project. `.openai/hosting.json` records that demo host's identity; Cloudflare Pages does not require it. Do not reuse its project ID when creating an unrelated Site.

Official references: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports), [Cloudflare static Next.js deployment](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

## Verification & known limits

Automated checks cover lint, TypeScript, 32 tests (ten storefront/domain and twenty-two sandbox commerce), the separate Worker bundle, exported routes, local links/assets, metadata, demo notices and absence of forms/payment SDKs in the storefront. Automated provider responses are mocked; passing them does not establish a completed external-provider transaction. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for actual results and remaining manual acceptance checks.

The public cart has no real checkout, fulfilment, tax calculation, inventory feed, customer support inbox or analytics provider. Sandbox deployment and credentials do not enable live commerce. Draft policies must be finalised for the actual seller. In particular, overseas sellers offering goods directly to Australian consumers must account for Australian Consumer Law and consumer guarantees; see [ACCC's guidance](https://www.accc.gov.au/business/selling-products-and-services/selling-online).

## Desk fit and quote handoff

The `/desk-fit/` page gives concept recommendations from clear desk width, cable count and portability. The demo bag can export a JSON handoff with allowlisted IDs and quantities; no submitted price, payment or order is implied. `tools/launch-lab.html` is a local owner economics tool, not part of the public export. These additions preserve the separate, owner-only `commerce/` Sandbox backend already in this repository.

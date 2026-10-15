# Verification

Verified on 15 October 2026 with Node.js 24.19.0. Installed versions are locked: Next.js 16.4.1, React 19.3.1, Tailwind CSS 4.3.3.

## Automated checks

- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 6/6 domain/cart cases.
- `npm run build`: PASS, Next.js production static export; all requested routes generated.
- `npm run check:export`: PASS, 10 exported HTML files and 218 local route/asset references, metadata, Open Graph, robots, sitemap and absence of forms/payment SDKs.
- Source scan for common private-key and API-token patterns: no matches in publishable source.
- Locally generated desk illustration: rasterised and visually inspected; all product assets are first-party demo vectors.

## Responsive implementation

The layout has desktop, tablet (1100px), mobile (760px) and narrow-mobile (370px) breakpoints. At mobile widths the hero, collection, product details, cart and contact panels become one column. Navigation has a mobile toggle; tabs wrap. Product images use intrinsic dimensions and adaptive containers. Focus states, image alt text, button labels, a skip link, live cart status and reduced-motion styles are present.

## Browser verification limit

The managed environment does not provide the required control-browser skill for a local preview. Per the Sites workflow, no alternative preview browser or browser installation was used. Automated HTML/link checks and source-level responsive review do **not** replace rendered desktop/mobile interaction testing. No screenshot-based layout pass or real-device pass is claimed. A long-running local development server was not launched in this environment; use the documented `npm ci && npm run dev` locally. Successful compilation and static export have been verified.

## Manual acceptance before trading

- At 320, 375, 390, 768 and 1440 CSS pixels: inspect overflow, labels, imagery and controls.
- Open and close the mobile menu; navigate every footer link.
- Filter each category and restore All essentials.
- Add each product, add repeatedly, increase/decrease, remove and clear the bag.
- Refresh a populated bag; test a second tab and unavailable/corrupted storage.
- Check empty bag, missing route, keyboard-only navigation and 200% zoom.
- Confirm PayPal stays disabled and no real personal data can be submitted.
- Check direct product/policy navigation on the chosen public host.

Payments, suppliers, fulfilment and real-world logistics are deliberately untested because they do not exist in this MVP.

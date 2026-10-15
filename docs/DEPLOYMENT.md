# Deployment

## Cloudflare Pages (Git integration)

1. Connect the `desk-setup-store` GitHub repository in Cloudflare Workers & Pages → Create → Pages → Import an existing Git repository.
2. Select the production branch (`main`).
3. Select **Next.js (Static HTML Export)** or enter build command `npm run build` and output directory `out`.
4. Set `NODE_VERSION` to `22` or `24`. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS origin, with no trailing slash. If the Pages URL is not known until first deploy, rebuild after setting it.
5. Deploy. Test `/`, all three `/products/<slug>/` routes, `/cart/`, policy pages and `/contact/` with direct navigation and refresh.
6. Check `/sitemap.xml`, `/robots.txt`, `/images/og-cover.png`, custom 404 behaviour and the security headers from `public/_headers`.

No API key, database, binding or server runtime is needed. The build artefact is `out/`; do not publish source files, `node_modules`, `.next` or `.env.local` as web content. No wildcard SPA redirect should replace genuine exported HTML routes.

## Local production export

```bash
npm ci
npm run build
npm run check:export
npm run preview
```

The last command serves port 3000 by default. To change it use `PORT=4173 npm run preview` on macOS/Linux, or set the equivalent environment variable in your shell. This preview server has no checkout capability.

## Optional direct upload

With an authenticated, officially installed Wrangler CLI, `wrangler pages deploy out --project-name <your-pages-project>` uploads the static export. This project does not provision a Cloudflare account, purchase a domain or configure billing.

## Current test deployment

- Demo origin: https://desk-setup-store.j-w2007.chatgpt.site
- Audience: public test access.
- Mode: demo only, blocked from indexing.
- Host: Sites / Cloudflare static hosting.
- `out/` is regenerated from source and excluded from Git.

## After domain changes

Update `NEXT_PUBLIC_SITE_URL` and rebuild to update absolute metadata. Browser-local bags do not transfer to another origin. Keep `noindex`, robots disallow and demo notices in place until all launch work is complete.

## References

- https://nextjs.org/docs/app/guides/static-exports
- https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

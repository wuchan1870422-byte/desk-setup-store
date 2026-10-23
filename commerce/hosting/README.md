# Separate hosted sandbox deployment

This profile contains the Worker entrypoint and schema migration journal used by a separate Sites backend. The Next.js storefront continues to export static files; do not replace its `.openai/hosting.json` or deploy its identity as a Worker.

From the repository root after `npm ci`:

```sh
node commerce/hosting/build.mjs <existing-backend-project-id>
```

Use the exact backend project ID returned by Sites. The build rejects the storefront project ID and produces `commerce/dist/site/server/index.js` plus its own `.openai/hosting.json` and schema-only migrations. Output is ignored by Git and contains no runtime credentials. This is a reproducible artifact build, not a deployment command.

For the supported Sites source workflow, use a dedicated backend checkout with its own preserved project ID. Copy the `commerce/` core, this profile's `entry.ts` as `worker/index.ts` (change the import to `../commerce/worker`), the SQL and journal under `drizzle/`, and a build command which bundles the entrypoint into `dist/server/index.js`. Open that checkout with the Sites source helper before editing, push its source, package from the exact pushed commit, then save and deploy the matching version. Do not push the storefront repository to the backend's source remote or overwrite either Site identity. Configure runtime values through server secret storage, never Git or build arguments.

Keep the backend owner-private while running authenticated manual tests. External PayPal callbacks cannot reach an owner-private Site; expose the verified callback only after the intended access policy is approved. Order-management routes retain their own admin authentication even if a callback becomes externally reachable.

The standalone Cloudflare Worker alternative remains `commerce/wrangler.jsonc` and `commerce/migrations/`. Both use the same canonical TypeScript core. Deployment access, actual D1 bindings and provider credentials are separate from this source profile. No production payment or real-procurement mode exists.

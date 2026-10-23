import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// A separate artifact keeps the static storefront's manifest and out/ intact.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [projectId, ...extra] = process.argv.slice(2);
if (!projectId || extra.length) throw new Error('Usage: node commerce/hosting/build.mjs <existing-backend-project-id>');
const storefront = JSON.parse(await readFile(resolve(root, '.openai/hosting.json'), 'utf8'));
if (projectId === storefront.project_id) throw new Error('Use the separate backend Site identity, never the storefront Site identity.');
const output = resolve(root, 'commerce/dist/site');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'server'), { recursive: true });
await mkdir(resolve(output, '.openai/drizzle/meta'), { recursive: true });
await build({ entryPoints: [resolve(root, 'commerce/hosting/entry.ts')], outfile: resolve(output, 'server/index.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022' });
await writeFile(resolve(output, '.openai/hosting.json'), JSON.stringify({ project_id: projectId, d1: 'ORDERS', r2: null }, null, 2) + '\n');
await cp(resolve(root, 'commerce/migrations/0001_sandbox_orders.sql'), resolve(output, '.openai/drizzle/0000_sandbox_orders.sql'));
await cp(resolve(root, 'commerce/hosting/journal.json'), resolve(output, '.openai/drizzle/meta/_journal.json'));
console.log('Built separate Sites sandbox artifact in commerce/dist/site. No runtime credentials are included.');

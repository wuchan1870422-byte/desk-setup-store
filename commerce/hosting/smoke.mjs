import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const profile = new URL("./", import.meta.url);
const artifact = new URL("../dist/site/", profile);
const testProject = "local-hosted-sandbox-smoke";
const storefront = JSON.parse(await readFile(new URL("../../.openai/hosting.json", profile), "utf8"));
const buildScript = fileURLToPath(new URL("build.mjs", profile));
assert.throws(() => execFileSync(process.execPath, [buildScript, storefront.project_id], { stdio: "pipe", encoding: "utf8" }), {
  stderr: /Use the separate backend Site identity/,
});
execFileSync(process.execPath, [buildScript, testProject], { stdio: "inherit" });

const manifest = JSON.parse(await readFile(new URL(".openai/hosting.json", artifact), "utf8"));
assert.deepEqual(manifest, { project_id: testProject, d1: "ORDERS", r2: null });
const migrations = new URL(".openai/drizzle/", artifact);
const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrations), "utf8"));
assert.equal(journal.dialect, "sqlite");
const migrationNames = journal.entries.map(({ idx, tag }, index) => {
  assert.equal(idx, index);
  assert.match(tag, /^\d{4}_[a-z0-9_]+$/);
  return `${tag}.sql`;
});
assert.deepEqual(migrationNames, (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort());

const database = new DatabaseSync(":memory:");
try {
  for (const name of migrationNames) {
    database.exec(await readFile(new URL(name, migrations), "utf8"));
  }

  const source = await readFile(new URL("server/index.js", artifact));
  const { default: worker } = await import(`data:text/javascript;base64,${source.toString("base64")}`);
  const request = (path, init) => new Request(`https://hosted-smoke.test${path}`, init);
  const page = await worker.fetch(request("/"), {});
  assert.equal(page.status, 200);
  assert.match(await page.text(), /owner sandbox/);
  const health = await worker.fetch(request("/health"), {});
  assert.equal(health.status, 200);
  const { mode, livePayments, realProcurement } = await health.json();
  assert.deepEqual({ mode, livePayments, realProcurement }, { mode: "disabled", livePayments: false, realProcurement: false });
  const orders = await worker.fetch(request("/sandbox/orders", { method: "POST" }), {});
  assert.equal(orders.status, 503);
  assert.deepEqual(await orders.json(), { error: "SANDBOX_DISABLED" });

  const token = "local-smoke-token-no-runtime-access";
  const bindings = {
    COMMERCE_MODE: "sandbox",
    SANDBOX_ADMIN_TOKEN: token,
    ORDERS: { prepare: sql => ({ bind: () => ({ first: async () => database.prepare(sql).get() }) }) },
  };
  const unauthorized = await worker.fetch(request("/sandbox/readiness"), bindings);
  assert.equal(unauthorized.status, 401);
  const readiness = await worker.fetch(request("/sandbox/readiness", { headers: { Authorization: `Bearer ${token}` } }), bindings);
  assert.equal(readiness.status, 200);
  const status = await readiness.json();
  assert.equal(status.database, "available");
  assert.equal(status.configurationPresent, false);
  assert.equal(status.endToEnd, "not_verified");
} finally {
  database.close();
}
console.log("Hosted Worker, migration journal, SQLite readiness and default order lock passed.");

import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

// Local verification only: no provider credentials, deployments, charges or purchases.
// Browser installation remains an explicit prerequisite so this also works offline
// after dependencies and the matching Playwright browser have been cached.
const directory = resolve(process.argv[2] || "verification-results");
await mkdir(directory, { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const steps = [
  ["install", ["ci"], 0],
  ["audit", ["audit", "--json"], 0],
  ["lint", ["run", "lint"], 0],
  ["typecheck", ["run", "typecheck"], 0],
  ["tests", ["test"], 0],
  ["launch-diagnostic", ["run", "check:launch"], 0],
  ["commercial-gate", ["run", "check:launch", "--", "--require-commercial"], 2],
  ["credential-free-sandbox", ["run", "sandbox:acceptance", "--", "check", "--network=sandbox"], 2],
  ["commerce-build", ["run", "build:commerce"], 0],
  ["storefront-build", ["run", "build"], 0],
  ["export", ["run", "check:export"], 0],
  ["browser", ["run", "test:e2e"], 0],
];
const summary = {
  startedAt: new Date().toISOString(), node: process.version,
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  // The hash identifies the exact dependency lock used by this run.
  lockSha256: createHash("sha256").update(await readFile("package-lock.json")).digest("hex"),
  scope: "local source, SQLite fixtures and local browser; no external provider acceptance or deployment",
  steps: [],
};
let unexpected = false;
for (const [name, args, expectedCode] of steps) {
  const startedAt = new Date().toISOString();
  const file = `${String(summary.steps.length + 1).padStart(2, "0")}-${name}.log`;
  const log = createWriteStream(join(directory, file));
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", CI: "1" };
  if (name === "credential-free-sandbox") {
    env.SANDBOX_BACKEND_URL = "";
    env.SANDBOX_ADMIN_TOKEN = "";
  }
  console.log(`Checking ${name}: npm ${args.join(" ")} (expected exit ${expectedCode})`);
  const child = spawn(npm, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", data => { log.write(data); process.stdout.write(data); });
  const result = await new Promise(resolveResult => {
    child.on("error", error => { log.write(`PROCESS_START_ERROR: ${error.code || "UNKNOWN"}\n`); });
    child.on("close", (exitCode, signal) => resolveResult({ exitCode, signal }));
  });
  log.end();
  await finished(log);
  const passed = result.exitCode === expectedCode;
  summary.steps.push({ name, command: `npm ${args.join(" ")}`, startedAt, finishedAt: new Date().toISOString(), ...result, expectedCode, passed, log: file });
  unexpected ||= !passed;
  await writeFile(join(directory, "summary.json"), JSON.stringify({ ...summary, allExpected: !unexpected }, null, 2) + "\n");
}
process.exitCode = unexpected ? 1 : 0;
console.log(`Verification ${unexpected ? "FAILED" : "matched all expected outcomes"}; full logs: ${directory}`);

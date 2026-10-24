import { mkdir, writeFile } from "node:fs/promises";
import { SandboxAcceptance, acceptanceSummary, type SandboxCommand } from "../commerce/acceptance";

const [command, ...args] = process.argv.slice(2);
const commands = ["check", "create", "status", "capture", "reconcile", "review"];
const options = new Map(args.map(x => { const index = x.indexOf("="); return [x.slice(0, index), x.slice(index + 1)]; }));
async function main() {
  if (!commands.includes(command) || args.some(x => !/^--(network|order-id|request-key)=.+$/.test(x)) || options.size !== args.length) throw new Error("INVALID_ARGUMENTS");
  const client = new SandboxAcceptance(process.env.SANDBOX_BACKEND_URL || "", process.env.SANDBOX_ADMIN_TOKEN || "", options.get("--network"));
  const result = await client.run(command as SandboxCommand, options.get("--order-id"), options.get("--request-key"));
  await mkdir("private", { recursive: true, mode: 0o700 });
  const name = `private/sandbox-${command}-${crypto.randomUUID()}.json`;
  await writeFile(name, JSON.stringify(result, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ ...acceptanceSummary(command as SandboxCommand, result), privateResultFile: name }, null, 2));
}
main().catch(error => {
  const message = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "SANDBOX_CHECK_BLOCKED";
  console.error(JSON.stringify({ status: "blocked", code: message, externalEndToEndAccepted: false }));
  process.exitCode = 2;
});

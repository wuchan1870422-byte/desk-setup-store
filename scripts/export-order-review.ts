import { mkdir, writeFile } from "node:fs/promises";
import { SandboxAcceptance } from "../commerce/acceptance";

async function main() {
  if (process.argv.slice(2).join(" ") !== "--network=sandbox") throw new Error("EXPLICIT_SANDBOX_NETWORK_REQUIRED");
  const client = new SandboxAcceptance(process.env.SANDBOX_BACKEND_URL || "", process.env.SANDBOX_ADMIN_TOKEN || "", "sandbox");
  const rows: unknown[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await client.run("review", undefined, undefined, cursor);
    if (!Array.isArray(page.rows) || (page.nextCursor !== null && typeof page.nextCursor !== "string")) throw new Error("INVALID_REVIEW_RESPONSE");
    rows.push(...page.rows);
    cursor = typeof page.nextCursor === "string" ? page.nextCursor : undefined;
    if (cursor) {
      if (cursors.has(cursor) || cursors.size >= 100) throw new Error("PAGINATION_REQUIRES_REVIEW");
      cursors.add(cursor);
    }
  } while (cursor);
  await mkdir("private", { recursive: true, mode: 0o700 });
  const file = `private/order-review-${crypto.randomUUID()}.json`;
  await writeFile(file, JSON.stringify({ mode: "sandbox", exportedAt: new Date().toISOString(), shipment: "not_created", rows }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ status: "exported", rows: rows.length, privateResultFile: file, messagesSent: 0, purchasesMade: 0 }));
}
main().catch(() => { console.error("REVIEW_EXPORT_BLOCKED: inspect configuration; no response body was logged."); process.exitCode = 2; });

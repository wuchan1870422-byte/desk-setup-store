import { readFile } from "node:fs/promises";
import { evaluateLaunchEvidence } from "../commerce/launch-readiness";

const args = process.argv.slice(2);
const requireReady = args.includes("--require-commercial");
const files = args.filter(x => x !== "--require-commercial");
async function main() {
  if (files.length > 1 || files.some(x => x.startsWith("--"))) {
    console.error("Usage: npm run check:launch -- [private-evidence.json] [--require-commercial]");
    process.exitCode = 1;
  } else {
    try {
      const evidence: unknown = JSON.parse(await readFile(files[0] || "docs/launch-evidence.example.json", "utf8"));
      const result = evaluateLaunchEvidence(evidence);
      console.log(JSON.stringify(result, null, 2));
      if (requireReady && !result.commercialEvidenceReady) process.exitCode = 2;
    } catch {
      console.error("EVIDENCE_FILE_UNREADABLE_OR_INVALID: no input contents were logged.");
      process.exitCode = 1;
    }
  }

}
void main();

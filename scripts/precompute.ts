// npm run precompute: runs the pipeline on all 60 cases with a real key and writes data/demo-outputs.json,
// which the app serves. Masked text and AI outputs only: the token map and raw text are never saved.
import { writeFileSync } from "node:fs";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { createClient } from "../lib/anthropic";
import { createBatchClient } from "../lib/batch-client";
import { findLeaks } from "../lib/mask";
import { requestText } from "../lib/request-text";
import { ALL_COMPLAINTS, pipelineDeps, runAll } from "../lib/run-all";
import { configuredModels, POLICY_VERSION, PROMPT_VERSION } from "../lib/versions";
import type { DemoOutputs } from "../lib/stored-types";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local (never commit it), then run npm run precompute again.");
    process.exit(1);
  }

  const models = configuredModels(process.env);
  console.log(`Running the pipeline on ${ALL_COMPLAINTS.length} complaints · triage ${models.triage} · draft ${models.draft}`);
  // Logged check (acceptance criterion 3): a second, independent scan of every request actually sent.
  // The pipeline's own leak check (MASK-01) is what stops a call; this proves it held.
  let requests = 0;
  const leaks: string[] = [];
  const batch = process.argv.includes("--batch"); // Message Batches API: half price, results in minutes to hours
  const results = await runAll(ALL_COMPLAINTS, pipelineDeps(batch ? createBatchClient() : createClient(), models), {
    concurrency: batch ? ALL_COMPLAINTS.length : undefined,
    onRequest: (ref, params) => {
      requests++;
      const complaint = ALL_COMPLAINTS.find((c) => c.ref === ref)!;
      if (findLeaks(requestText(params), complaint.customer, { names, merchants }).length) leaks.push(ref);
    },
  });
  console.log(`
Masking check: ${leaks.length} of ${requests} model requests contained personal data${leaks.length ? ` (${leaks.join(", ")})` : ""}`);
  if (leaks.length) {
    console.error("Personal data reached the model. demo-outputs.json was NOT written. Fix masking first.");
    process.exit(1);
  }

  const output: DemoOutputs = { runDate: new Date().toISOString(), models, promptVersion: PROMPT_VERSION, policyVersion: POLICY_VERSION, results };
  writeFileSync("data/demo-outputs.json", JSON.stringify(output, null, 2) + "\n");

  const cost = results.reduce((sum, r) => sum + r.usage.costGbp, 0);
  console.log(`\nWrote data/demo-outputs.json · ${results.filter((r) => r.draft).length} drafts · ${results.filter((r) => !r.draft).length} withheld · total cost £${cost.toFixed(4)}${batch ? " at list price (billed at half via the Batch API)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

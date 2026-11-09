// npm run eval: runs the full pipeline on all 60 cases with a real key, scores it against the human labels
// (docs/06) and appends the run to data/eval-results.json. Never edit that file by hand.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { createClient } from "../lib/anthropic";
import { scoreRuns } from "../lib/evaluate";
import { loadClauses } from "../lib/policies";
import { requestText } from "../lib/request-text";
import { ALL_COMPLAINTS, pipelineDeps, runAll } from "../lib/run-all";
import { configuredModels, POLICY_VERSION, PROMPT_VERSION } from "../lib/versions";
import type { EvalResults, EvalRun } from "../lib/eval-types";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local (never commit it), then run npm run eval again.");
    process.exit(1);
  }

  const models = configuredModels(process.env);
  const requests = new Map<string, string[]>(); // ref -> text of every model request, to prove masking held
  console.log(`Evaluating ${ALL_COMPLAINTS.length} complaints · triage ${models.triage} · draft ${models.draft} · prompt ${PROMPT_VERSION}`);
  const results = await runAll(ALL_COMPLAINTS, pipelineDeps(createClient(), models), {
    onRequest: (ref, params) => requests.set(ref, [...(requests.get(ref) ?? []), requestText(params)]),
  });

  const timestamp = new Date().toISOString();
  const commit = (() => {
    try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "unknown"; }
  })();
  const scored = scoreRuns(
    ALL_COMPLAINTS.map((complaint, i) => ({ complaint, result: results[i], requests: requests.get(complaint.ref) ?? [] })),
    { names, merchants },
    new Set(loadClauses().map((c) => c.id)),
  );
  const run: EvalRun = { timestamp, commit, models, promptVersion: PROMPT_VERSION, policyVersion: POLICY_VERSION, ...scored };

  const file = "data/eval-results.json";
  const previous: EvalResults = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { runs: [] };
  writeFileSync(file, JSON.stringify({ runs: [...previous.runs, run] } satisfies EvalResults, null, 2) + "\n");

  // Raw results for inspecting failures. Only latest.json is committed.
  mkdirSync("data/eval-runs", { recursive: true });
  const raw = JSON.stringify({ timestamp, commit, models, results }, null, 2) + "\n";
  writeFileSync(`data/eval-runs/${timestamp.replace(/[:.]/g, "-")}.json`, raw);
  writeFileSync("data/eval-runs/latest.json", raw);

  console.log(`\n=== Evaluation ${timestamp.slice(0, 16)} · commit ${commit} ===`);
  console.table(run.metrics.map((m) => ({ metric: m.label, result: m.display, target: m.target ?? "report", status: m.pass === null ? "" : m.pass ? "PASS" : "MISS" })));
  const c = run.calibration;
  console.log(`Calibration: confidence ≥ ${c.threshold}: ${c.high.correct}/${c.high.n} correct · below: ${c.low.correct}/${c.low.n} correct`);
  console.log(`Cost £${run.cost.meanGbp.toFixed(4)} per case (total £${run.cost.totalGbp.toFixed(4)}) · latency mean ${run.latency.meanS.toFixed(1)}s, p95 ${run.latency.p95S.toFixed(1)}s`);
  console.log(`\nFailures (${run.failures.length}):`);
  for (const f of run.failures) console.log(`  ${f.ref} · ${f.area}: expected ${f.expected}; got ${f.actual}`);
  console.log(`\nAppended to ${file} (${previous.runs.length + 1} runs). Run it twice and report both.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

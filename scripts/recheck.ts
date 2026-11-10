// npm run recheck: re-runs step 5 (the code-only checks) on the stored model outputs in data/demo-outputs.json.
// No model call and no API key: triage, drafts and handover packs are untouched. Use it after a change to
// lib/verify.ts so the app shows checks from the current verifier. The file records when this was done.
import { readFileSync, writeFileSync } from "node:fs";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { maskComplaint, tokenCount } from "../lib/mask";
import { loadClauses } from "../lib/policies";
import { ALL_COMPLAINTS } from "../lib/run-all";
import { verify } from "../lib/verify";
import type { DemoOutputs } from "../lib/stored-types";
import type { AuditEvent } from "../lib/types";

const FILE = "data/demo-outputs.json";
const VERIFIER = "System · verification";

const stored = JSON.parse(readFileSync(FILE, "utf8")) as DemoOutputs;
const library = loadClauses();
let changed = 0;

for (const r of stored.results) {
  const complaint = ALL_COMPLAINTS.find((c) => c.ref === r.ref);
  if (!complaint) throw new Error(`${r.ref} is not in data/complaints.json`);
  const masked = maskComplaint(complaint, { names, merchants });
  const schemaFail = r.checks.find((c) => c.id === "SCHEMA-01" && c.result === "Fail");
  const checks = verify({
    maskLeaks: masked.leaks, obfuscatedRuns: masked.obfuscatedRuns, tokenCount: tokenCount(masked.counts),
    maskedText: r.maskedText, maskedNotes: r.maskedNotes.map((n) => n.text),
    triage: r.triage, schemaError: schemaFail ? schemaFail.detail : null, responseType: r.responseType,
    draft: r.draft, retrievedIds: r.retrieved.map((c) => c.id), library,
  });
  if (JSON.stringify(checks) !== JSON.stringify(r.checks)) changed++;

  // Replace the verifier's audit events in place, keeping the time the original checks ran.
  const first = r.audit.findIndex((e) => e.actor === VERIFIER);
  const ts = first >= 0 ? r.audit[first].ts : stored.runDate;
  const count = (result: string) => checks.filter((c) => c.result === result).length;
  const events: AuditEvent[] = [
    { ts, ref: r.ref, actor: VERIFIER, event: "Checks run", detail: `${checks.length} checks: ${count("Pass")} pass, ${count("Refer")} refer, ${count("Fail")} fail` },
    ...checks.filter((c) => c.result !== "Pass").map((c) => ({ ts, ref: r.ref, actor: VERIFIER, event: c.result === "Fail" ? "Check failed" : "Check referred", detail: `${c.id}: ${c.detail}` })),
  ];
  const rest = r.audit.filter((e) => e.actor !== VERIFIER);
  const at = first >= 0 ? r.audit.slice(0, first).filter((e) => e.actor !== VERIFIER).length : rest.length;
  r.audit = [...rest.slice(0, at), ...events, ...rest.slice(at)];
  r.checks = checks;
}

stored.checksRerun = new Date().toISOString();
writeFileSync(FILE, JSON.stringify(stored, null, 2) + "\n");
console.log(`Re-ran the checks on ${stored.results.length} stored results: ${changed} changed. Model outputs untouched.`);
console.log(`${stored.results.filter((r) => r.checks.some((c) => c.result === "Fail")).length} cases still have a failing check.`);

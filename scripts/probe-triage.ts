// One-off probe: does triage prompt v2 fix the v1 failure patterns? Re-runs triage only (no drafting) on the
// cases v1 got wrong plus passing controls, twice, and compares with the two stored v1 eval runs.
// Writes data/eval-probes/ only. It is NOT an evaluation: the cases were chosen because v1 failed them,
// so the numbers must never be reported as v2 accuracy. The app does not read this folder.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { createClient } from "../lib/anthropic";
import { injectionMatched } from "../lib/verify";
import { maskComplaint } from "../lib/mask";
import { routeCase } from "../lib/route";
import { ALL_COMPLAINTS } from "../lib/run-all";
import { runTriage } from "../lib/triage";
import { configuredModels } from "../lib/versions";
import type { Complaint, TriageOutput } from "../lib/types";

const TARGETED = ["105160", "100503", "100506", "100507", "100508", "100603", "100606", "100702", "100705", "100706", "100801", "100803", "100804", "100805", "100806", "100904", "100905", "101101"];
const CONTROLS = ["104712", "100402", "100501", "100601", "100703", "100802", "100902", "101001"];
const REFS = [...TARGETED, ...CONTROLS].map((n) => `CMP-2026-${n}`);

type Scored = { category: boolean; deadline: boolean; route: boolean };

function score(c: Complaint, t: TriageOutput | null, maskedText: string): Scored {
  if (!t) return { category: false, deadline: false, route: false };
  const route = routeCase({ maskingFailed: false, injection: injectionMatched(maskedText) || t.injectionSuspected, triage: t, redressAmount: null, maskedText }).route;
  return {
    category: t.category === c.labels.category,
    deadline: t.paymentServices === c.labels.paymentServices && t.summaryResolutionEligible === c.labels.summaryResolutionEligible,
    route: route === c.labels.route,
  };
}

const tally = (rows: Scored[]) => ({
  category: rows.filter((r) => r.category).length,
  deadline: rows.filter((r) => r.deadline).length,
  route: rows.filter((r) => r.route).length,
});

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env.local");
  const prompt = readFileSync("lib/prompts/triage.v2.md", "utf8").trim();
  const model = configuredModels(process.env).triage;
  const create = createClient();
  const cases = REFS.map((ref) => ALL_COMPLAINTS.find((c) => c.ref === ref)!);
  const masked = cases.map((c) => maskComplaint(c, { names, merchants }));
  masked.forEach((m, i) => { if (m.leaks.length) throw new Error(`Masking leak in ${cases[i].ref}; nothing sent`); });

  // v1 baseline: the stored triage from both full eval runs, scored the same way.
  const runFiles = readdirSync("data/eval-runs").filter((f) => f !== "latest.json").sort();
  const v1 = runFiles.map((f) => {
    const results: { ref: string; triage: TriageOutput | null }[] = JSON.parse(readFileSync(`data/eval-runs/${f}`, "utf8")).results;
    return cases.map((c, i) => score(c, results.find((r) => r.ref === c.ref)?.triage ?? null, masked[i].maskedText));
  });

  const v2: Scored[][] = [];
  const raw: unknown[] = [];
  let cost = 0;
  for (let run = 0; run < 2; run++) {
    const rows = await Promise.all(cases.map(async (c, i) => {
      const r = await runTriage(create, model, prompt, masked[i].maskedText, masked[i].maskedNotes);
      cost += r.usage.costGbp;
      const t = r.ok ? r.value : null;
      raw.push({ run: run + 1, ref: c.ref, triage: t });
      return score(c, t, masked[i].maskedText);
    }));
    v2.push(rows);
  }

  const split = (rows: Scored[]) => ({ targeted: tally(rows.slice(0, TARGETED.length)), controls: tally(rows.slice(TARGETED.length)) });
  const summary = { model, targeted: TARGETED.length, controls: CONTROLS.length, v1: v1.map(split), v2: v2.map(split), costGbp: cost };
  console.log(JSON.stringify(summary, null, 2));
  for (const [i, c] of cases.entries()) {
    const mark = (rows: Scored[][]) => rows.map((r) => `${r[i].category ? "C" : "c"}${r[i].deadline ? "D" : "d"}${r[i].route ? "R" : "r"}`).join(" ");
    console.log(`${c.ref} v1 ${mark(v1)} → v2 ${mark(v2)}`);
  }

  mkdirSync("data/eval-probes", { recursive: true });
  writeFileSync(`data/eval-probes/triage-v2-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify({ summary, raw }, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

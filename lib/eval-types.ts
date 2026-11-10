// Shape of data/eval-results.json, written only by npm run eval (docs/06). Never edited by hand.
import type { Category, GoldLabels } from "./types";

export type Metric = {
  id: string;
  label: string;
  display: string; // e.g. "57 / 60 (95.0%)"
  value: number | null; // 0..1 for rates; null when there is nothing to measure
  target: string | null; // e.g. "≥ 90%"; null for report-only metrics
  pass: boolean | null; // null for report-only metrics
  note?: string;
};

export type AdversarialResult = {
  ref: string;
  type: NonNullable<GoldLabels["adversarial"]>;
  expected: string;
  actual: string;
  pass: boolean;
};

export type Failure = { ref: string; area: string; expected: string; actual: string };

export type EvalRun = {
  timestamp: string;
  commit: string;
  models: { triage: string; draft: string };
  promptVersion: string;
  policyVersion: string;
  cases: number;
  metrics: Metric[];
  confusion: { labels: Category[]; matrix: number[][] }; // rows = human label, columns = AI category
  adversarial: AdversarialResult[];
  calibration: { threshold: number; high: { n: number; correct: number }; low: { n: number; correct: number } };
  failures: Failure[];
  cost: { meanGbp: number; totalGbp: number };
  latency: { meanS: number; p95S: number };
  batch?: true; // run through the Batch API: billed at half the listed cost, and latency is queue time, not model time
};

export type EvalResults = { runs: EvalRun[] }; // every run is kept, newest last, so run-to-run variation is visible

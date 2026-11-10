// Shapes of the generated files the app serves, and of the case view sent to the browser.
import type { EvalResults } from "./eval-types";
import type { RegulatorySource } from "./regulation";
import type { Check, CaseNote, PipelineResult } from "./types";

export type RunInfo = {
  runDate: string;
  models: { triage: string; draft: string };
  promptVersion: string;
  policyVersion: string;
  checksRerun?: string; // set by npm run recheck: the code-only checks were re-run on the stored model outputs
};

export type DemoOutputs = RunInfo & { results: PipelineResult[] };

/** A stored result as sent to the browser: retrieved clauses carry ID and score only (clause text is in the library). */
export type StoredResult = Omit<PipelineResult, "retrieved" | "maskedText" | "maskedNotes"> & { retrieved: { id: string; score: number }[] };

/** What the browser receives for a case: masked text and stored results only, never raw text, customer fields or labels. */
export type CaseView = {
  ref: string;
  received: string;
  channel: string;
  product: string;
  maskedText: string;
  maskedNotes: CaseNote[];
  result: StoredResult | null; // null until npm run precompute has been run
};

export type ClauseInfo = { id: string; doc: string; title: string; section: string; text: string; basis: RegulatorySource[] };

export type VerifyResponse = { checks: Check[] };

/** Everything the browser needs, assembled on the server. Client components never import from data/. */
export type WorkbenchData = {
  cases: CaseView[];
  run: RunInfo | null;
  clauses: Record<string, ClauseInfo>;
  checkBasis: Record<string, RegulatorySource[]>;
  evalResults: EvalResults | null;
  versions: { release: string; policyVersion: string; promptVersion: string };
  regulatory: { asOf: string; sources: RegulatorySource[] };
};

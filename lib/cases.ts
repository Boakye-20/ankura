import "server-only";
// Server-side access to the synthetic data and the stored pipeline outputs.
// Only masked views leave this module: never raw complaint text, customer fields, labels or the token map.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import complaints from "../data/complaints.json";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { maskComplaint } from "./mask";
import { loadClauses } from "./policies";
import { REGULATORY_MAP, regulatoryBasis, type RegulatorySource } from "./regulation";
import type { EvalResults } from "./eval-types";
import type { CaseView, ClauseInfo, DemoOutputs, StoredResult } from "./stored-types";
import type { Complaint, PipelineResult } from "./types";

const ALL = complaints as Complaint[];

function readJson<T>(file: string): T | null {
  const full = path.join(process.cwd(), "data", file);
  return existsSync(full) ? (JSON.parse(readFileSync(full, "utf8")) as T) : null;
}

export const loadDemoOutputs = () => readJson<DemoOutputs>("demo-outputs.json");
export const loadEvalResults = () => readJson<EvalResults>("eval-results.json");

export function findComplaint(ref: string): Complaint | undefined {
  return ALL.find((c) => c.ref === ref);
}

export function storedResult(ref: string): PipelineResult | undefined {
  return loadDemoOutputs()?.results.find((r) => r.ref === ref);
}

export function maskFor(complaint: Complaint) {
  return maskComplaint(complaint, { names, merchants });
}

function toStored({ retrieved, maskedText: _t, maskedNotes: _n, ...rest }: PipelineResult): StoredResult {
  return { ...rest, retrieved: retrieved.map(({ id, score }) => ({ id, score })) };
}

export function caseViews(): CaseView[] {
  const outputs = loadDemoOutputs();
  return ALL.map((c) => {
    const stored = outputs?.results.find((r) => r.ref === c.ref);
    const masked = stored ? { maskedText: stored.maskedText, maskedNotes: stored.maskedNotes } : maskFor(c);
    return {
      ref: c.ref, received: c.received, channel: c.channel, product: c.product,
      maskedText: masked.maskedText, maskedNotes: masked.maskedNotes,
      result: stored ? toStored(stored) : null,
    };
  });
}

export function clauseLibrary(): Record<string, ClauseInfo> {
  return Object.fromEntries(loadClauses().map((c) => [c.id, { ...c, basis: regulatoryBasis(c.id) }]));
}

export function checkBasis(): Record<string, RegulatorySource[]> {
  return Object.fromEntries(Object.keys(REGULATORY_MAP.checks).map((id) => [id, regulatoryBasis(id)]));
}

import { describe, expect, it } from "vitest";
import complaints from "../data/complaints.json";
import { draftToText, textToDraft } from "../lib/case-helpers";
import { scoreRuns, type CaseRun } from "../lib/evaluate";
import type { Complaint, PipelineResult, TriageOutput } from "../lib/types";

const lists = { names: [], merchants: [] };
const byRef = (ref: string) => (complaints as Complaint[]).find((c) => c.ref === ref)!;

function run(ref: string, triage: Partial<TriageOutput> | null, over: Partial<PipelineResult> = {}, requests = ["masked text only"]): CaseRun {
  const complaint = byRef(ref);
  const L = complaint.labels;
  const t: TriageOutput | null = triage && {
    category: L.category, categoryConfidence: 0.9, vulnerable: L.vulnerable, vulnerabilityIndicators: [], paymentServices: L.paymentServices,
    summaryResolutionEligible: L.summaryResolutionEligible, injectionSuspected: false, summary: "", keyFacts: [], ...triage,
  };
  const result = {
    ref, mode: "demo", maskedText: "", maskedNotes: [], tokenCount: 0, triage: t, retrieved: [], responseType: "Final response", draft: null,
    draftWithheldReason: null, checks: [], route: L.route, routeReason: "", requiresSeniorCoApproval: false, deadline: null, audit: [],
    usage: { inputTokens: 0, outputTokens: 0, costGbp: 0.01, ms: 2000 }, promptVersion: "v1", policyVersion: "v", model: { triage: "t", draft: "d" }, ...over,
  } as PipelineResult;
  return { complaint, result, requests };
}

describe("scoreRuns", () => {
  it("counts category accuracy and lists each failure", () => {
    const scored = scoreRuns([run("CMP-2026-104712", {}), run("CMP-2026-105160", { category: "Account administration" })], lists, new Set());
    expect(scored.metrics.find((m) => m.id === "category")?.display).toBe("1 / 2 (50.0%)");
    expect(scored.failures).toContainEqual(expect.objectContaining({ ref: "CMP-2026-105160", area: "Category" }));
  });

  it("fails masking when a customer value reaches the model", () => {
    const scored = scoreRuns([run("CMP-2026-104712", {}, {}, ["Customer is Priya Sharma"])], lists, new Set());
    expect(scored.metrics.find((m) => m.id === "masking")?.pass).toBe(false);
  });

  it("scores an injection case as passed only with no draft and INJ-01 Fail", () => {
    const pass = run("CMP-2026-105103", { injectionSuspected: true }, { checks: [{ id: "INJ-01", label: "", result: "Fail", detail: "" }] });
    const fail = run("CMP-2026-105103", {}, { checks: [{ id: "INJ-01", label: "", result: "Pass", detail: "" }] });
    expect(scoreRuns([pass], lists, new Set()).adversarial[0].pass).toBe(true);
    expect(scoreRuns([fail], lists, new Set()).adversarial[0].pass).toBe(false);
  });

  it("counts a hidden vulnerability miss against recall", () => {
    const scored = scoreRuns([run("CMP-2026-101003", { vulnerable: false })], lists, new Set());
    expect(scored.metrics.find((m) => m.id === "vuln-recall")?.value).toBe(0);
    expect(scored.adversarial[0].pass).toBe(false);
  });
});

describe("amend editor text", () => {
  it("round-trips draft parts and citations", () => {
    const parts = [{ text: "Sorry for the delay.", citations: [] }, { text: "We will refund the £96.", citations: ["POL-07 §3.2", "POL-05 §2.1"] }];
    expect(textToDraft(draftToText(parts))).toEqual(parts);
  });

  it("keeps a bracketed citation in an unknown format so CIT-01 can block it", () => {
    expect(textToDraft("All fees are refundable. [POL 9.4]")).toEqual([{ text: "All fees are refundable.", citations: ["POL 9.4"] }]);
  });

  it("picks up a made-up clause ID so CIT-01 can block it", () => {
    expect(textToDraft("We will pay you. [POL-11 §9.9]")).toEqual([{ text: "We will pay you.", citations: ["POL-11 §9.9"] }]);
  });
});

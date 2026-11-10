import { describe, expect, it } from "vitest";
import type { Session } from "../lib/audit";
import { clauseName, filterRows, queueBucket, rowStats, sortRows, statusLabel, toRows } from "../lib/case-helpers";
import type { CaseView, ClauseInfo } from "../lib/stored-types";
import type { Check } from "../lib/types";

describe("queueBucket", () => {
  it("puts a case in 'mine' when the current role must act on it", () => {
    expect(queueBucket("Open", "Handler")).toBe("mine");
    expect(queueBucket("Returned by specialist", "Handler")).toBe("mine");
    expect(queueBucket("Escalated", "Handler")).toBe("mine");
    expect(queueBucket("Awaiting senior co-approval", "Senior")).toBe("mine");
    expect(queueBucket("With specialist", "Specialist")).toBe("mine");
  });
  it("puts a case in 'progress' when someone else must act on it", () => {
    expect(queueBucket("Awaiting senior co-approval", "Handler")).toBe("progress");
    expect(queueBucket("Open", "Senior")).toBe("progress");
    expect(queueBucket("With specialist", "Handler")).toBe("progress");
    expect(queueBucket("Escalated", "Specialist")).toBe("progress");
  });
  it("puts finished cases in 'done' for every role", () => {
    for (const role of ["Handler", "Senior", "Specialist"] as const) {
      expect(queueBucket("Approved", role)).toBe("done");
      expect(queueBucket("Co-approved", role)).toBe("done");
      expect(queueBucket("Accepted by specialist", role)).toBe("done");
    }
  });
  it("marks a case 'upcoming' for the senior or specialist it will reach once the handler has acted", () => {
    expect(queueBucket("Open", "Senior", { needsSenior: true, route: "Handler" })).toBe("upcoming");
    expect(queueBucket("Returned to handler", "Senior", { needsSenior: true, route: "Handler" })).toBe("upcoming");
    expect(queueBucket("Open", "Senior", { needsSenior: false, route: "Handler" })).toBe("progress");
    expect(queueBucket("Open", "Specialist", { needsSenior: false, route: "Fraud & Disputes" })).toBe("upcoming");
    expect(queueBucket("Escalated", "Specialist", { needsSenior: false, route: "Fraud & Disputes" })).toBe("upcoming");
    expect(queueBucket("Open", "Specialist", { needsSenior: true, route: "Senior" })).toBe("progress");
    expect(queueBucket("Open", "Handler", { needsSenior: true, route: "Fraud & Disputes" })).toBe("mine");
  });
});

describe("statusLabel: where the case is, in plain words", () => {
  it("names the person or team holding the case", () => {
    expect(statusLabel("Open", "Fraud & Disputes")).toBe("With handler");
    expect(statusLabel("Returned to handler", "Fraud & Disputes")).toBe("Back with handler");
    expect(statusLabel("Escalated", "Fraud & Disputes")).toBe("Handler preparing handover");
    expect(statusLabel("Awaiting senior co-approval", "Fraud & Disputes")).toBe("Waiting for a senior");
    expect(statusLabel("With specialist", "Fraud & Disputes")).toBe("With Fraud & Disputes");
    expect(statusLabel("Returned by specialist", "Fraud & Disputes")).toBe("Returned by Fraud & Disputes");
    expect(statusLabel("Approved", "Fraud & Disputes")).toBe("Approved");
    expect(statusLabel("Co-approved", "Fraud & Disputes")).toBe("Approved by senior");
    expect(statusLabel("Accepted by specialist", "Fraud & Disputes")).toBe("Accepted by Fraud & Disputes");
  });
});

describe("clauseName: a policy reference a handler can read", () => {
  const clauses: Record<string, ClauseInfo> = {
    "POL-04 §3.3": { id: "POL-04 §3.3", doc: "POL-04", title: "Unauthorised transactions and fraud", section: "Handling", text: "…", basis: [] },
    "DISP-G §2.4": { id: "DISP-G §2.4", doc: "DISP-G", title: "Regulatory complaint rules (internal summary)", section: "Timescales", text: "…", basis: [] },
  };
  it("uses the policy title and the section number, without a bracketed aside", () => {
    expect(clauseName("POL-04 §3.3", clauses)).toBe("Unauthorised transactions and fraud §3.3");
    expect(clauseName("DISP-G §2.4", clauses)).toBe("Regulatory complaint rules §2.4");
  });
  it("falls back to the ID when the clause is not in the library", () => {
    expect(clauseName("POL-99 §1.1", clauses)).toBe("POL-99 §1.1");
  });
});

const pass = (id: string): Check => ({ id, label: id, result: "Pass", detail: "" });
const fail = (id: string): Check => ({ id, label: id, result: "Fail", detail: "" });
function view(ref: string, o: Partial<{ category: string; route: string; vulnerable: boolean; used: number; total: number; needsSenior: boolean; checks: Check[] }> = {}): CaseView {
  return {
    ref, received: "2026-10-01", channel: "Email", product: "Current account", maskedText: "", maskedNotes: [],
    result: {
      ref, mode: "demo", tokenCount: 1, retrieved: [], responseType: "Final response", draftWithheldReason: null,
      triage: { category: (o.category ?? "Charges and interest") as never, categoryConfidence: 0.9, vulnerable: o.vulnerable ?? false, vulnerabilityIndicators: [], paymentServices: false, summaryResolutionEligible: false, injectionSuspected: false, summary: "", keyFacts: [] },
      draft: { response: [], proposedRedress: null, handover: null },
      checks: o.checks ?? [pass("MASK-01")],
      route: (o.route ?? "Handler") as never, routeReason: "", requiresSeniorCoApproval: o.needsSenior ?? false,
      deadline: { basis: "DISP-G §2.2", total: o.total ?? 56, used: o.used ?? 10, unit: "days", due: "2026-12-01" },
      audit: [], usage: { inputTokens: 0, outputTokens: 0, costGbp: 0, ms: 0 }, promptVersion: "v2", policyVersion: "v1", model: { triage: "t", draft: "d" },
    },
  };
}
const session: Session = { cases: { "CMP-3": { status: "Awaiting senior co-approval" } }, events: [] };
const cases = [
  view("CMP-1", { category: "APP scam", route: "Fraud & Disputes", used: 60, total: 56 }), // 4 days overdue
  view("CMP-2", { category: "Bereavement", vulnerable: true, needsSenior: true, used: 56 }), // due today
  view("CMP-3", { category: "Charges and interest", needsSenior: true, used: 53 }), // 3 days left, with the senior
  view("CMP-4", { category: "Charges and interest", used: 10, checks: [fail("CIT-02")] }),
];

describe("toRows, filterRows, sortRows, rowStats", () => {
  const rows = toRows(cases, session, "Handler");

  it("flattens a case into what the table shows", () => {
    const r = rows.find((x) => x.ref === "CMP-1")!;
    expect(r).toMatchObject({ category: "APP scam", route: "Fraud & Disputes", status: "Open", where: "With handler", daysLeft: -4, late: true, bucket: "mine" });
    expect(rows.find((x) => x.ref === "CMP-3")!).toMatchObject({ status: "Awaiting senior co-approval", where: "Waiting for a senior", bucket: "progress" });
  });

  it("filters by view, category, route, deadline and vulnerability", () => {
    expect(filterRows(rows, { view: "mine" }).map((r) => r.ref)).toEqual(["CMP-1", "CMP-2", "CMP-4"]);
    expect(filterRows(rows, { view: "all", category: "Charges and interest" }).map((r) => r.ref)).toEqual(["CMP-3", "CMP-4"]);
    expect(filterRows(rows, { view: "all", route: "Fraud & Disputes" }).map((r) => r.ref)).toEqual(["CMP-1"]);
    expect(filterRows(rows, { view: "all", deadline: "overdue" }).map((r) => r.ref)).toEqual(["CMP-1"]);
    expect(filterRows(rows, { view: "all", deadline: "today" }).map((r) => r.ref)).toEqual(["CMP-2"]);
    expect(filterRows(rows, { view: "all", deadline: "late" }).map((r) => r.ref)).toEqual(["CMP-1", "CMP-2"]);
    expect(filterRows(rows, { view: "all", deadline: "week" }).map((r) => r.ref)).toEqual(["CMP-1", "CMP-2", "CMP-3"]);
    expect(filterRows(rows, { view: "all", vulnerableOnly: true }).map((r) => r.ref)).toEqual(["CMP-2"]);
  });

  it("shows a senior the cases that will need them, as 'upcoming'", () => {
    const senior = toRows(cases, session, "Senior");
    expect(filterRows(senior, { view: "mine" }).map((r) => r.ref)).toEqual(["CMP-3"]);
    expect(filterRows(senior, { view: "upcoming" }).map((r) => r.ref)).toEqual(["CMP-2"]);
  });

  it("sorts by deadline (closest first by default), and by any column either way", () => {
    expect(sortRows(rows, "deadline", "asc").map((r) => r.ref)).toEqual(["CMP-1", "CMP-2", "CMP-3", "CMP-4"]);
    expect(sortRows(rows, "deadline", "desc").map((r) => r.ref)).toEqual(["CMP-4", "CMP-3", "CMP-2", "CMP-1"]);
    expect(sortRows(rows, "category", "asc").map((r) => r.category)).toEqual(["APP scam", "Bereavement", "Charges and interest", "Charges and interest"]);
    expect(sortRows(rows, "ref", "desc")[0].ref).toBe("CMP-4");
    expect(sortRows(rows, "deadline", "asc")).not.toBe(rows); // does not mutate
  });

  it("counts the stat tiles from the rows", () => {
    expect(rowStats(rows)).toEqual({ total: 4, mine: 3, upcoming: 0, late: 2, vulnerable: 1, locked: 1 });
  });
});

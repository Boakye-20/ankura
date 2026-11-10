import { describe, expect, it } from "vitest";
import { describeEvent } from "../lib/audit-copy";
import type { ClauseInfo } from "../lib/stored-types";

const clause = (id: string, title: string): ClauseInfo => ({ id, doc: id.split(" ")[0], title, section: "", text: "", basis: [] });
const clauses = {
  "POL-01 §3.1": clause("POL-01 §3.1", "Complaints handling procedure"),
  "POL-08 §1.1": clause("POL-08 §1.1", "Complaint data protection"),
  "POL-04 §3.3": clause("POL-04 §3.3", "Unauthorised transactions and fraud"),
  "POL-07 §2.2": clause("POL-07 §2.2", "Customers in vulnerable circumstances"),
  "DISP-G §2.1": clause("DISP-G §2.1", "Regulatory complaint rules (internal summary)"),
};
const ev = (actor: string, event: string, detail: string) => ({ ts: "2026-11-09T19:28:20Z", ref: "CMP-1", actor, event, detail });

describe("describeEvent: the case record in plain English", () => {
  it("masking: names what was hidden", () => {
    expect(describeEvent(ev("System · masking", "Personal data masked", "2 tokens: SORTCODE, CUSTOMER"), clauses))
      .toEqual({ what: "Personal details hidden", who: "Automatic (code)", detail: "2 items hidden before the AI saw anything: sort code, customer name." });
  });

  it("triage: the type and what it means, without the confidence score or model name", () => {
    expect(describeEvent(ev("System · triage", "Classified", "Card delivery and access, confidence 0.95, flags: summary resolution · claude-haiku-5-5 · prompt v2"), clauses))
      .toEqual({ what: "Complaint sorted", who: "AI model", detail: "Sorted as Card delivery and access. Can be closed within 3 business days." });
    expect(describeEvent(ev("System · triage", "Classified", "Unauthorised payment, confidence 0.97, flags: vulnerable, payment services · m · prompt v2"), clauses).detail)
      .toBe("Sorted as Unauthorised payment. Signs of vulnerability. Payment complaint: 15 business days to reply.");
  });

  it("retrieval: a count and the first policies by name, without scores", () => {
    expect(describeEvent(ev("System · retrieval", "Policy retrieved", "POL-01 §3.1 (13.13), POL-08 §1.1 (12.54), DISP-G §2.1 (0.00), POL-99 §1.1 (1.00)"), clauses))
      .toEqual({ what: "Policy found", who: "Automatic (code)", detail: "4 policy clauses found, led by Complaints handling procedure, section 3.1; Complaint data protection, section 1.1; Regulatory complaint rules, section 2.1." });
  });

  it("drafting, checks and routing", () => {
    expect(describeEvent(ev("System · drafting", "Draft generated", "Summary resolution · cites POL-01 §3.1, DISP-G §2.1 · handover pack · claude-sonnet-5-5 · prompt v2"), clauses))
      .toEqual({ what: "Reply drafted", who: "AI model", detail: "Summary resolution drafted, citing 2 policy clauses. Handover pack prepared for the specialist team." });
    expect(describeEvent(ev("System · verification", "Checks run", "13 checks: 13 pass, 0 refer, 0 fail"), clauses).detail).toBe("All 13 checks passed.");
    expect(describeEvent(ev("System · verification", "Checks run", "13 checks: 10 pass, 2 refer, 1 fail"), clauses).detail)
      .toBe("13 checks: 10 passed, 2 need a look, 1 blocks approval.");
    expect(describeEvent(ev("System · verification", "Check referred", "VUL-01: Vulnerability indicators found: senior co-approval required (POL-07 §2.2)"), clauses))
      .toEqual({ what: "Needs a look: Signs of vulnerability", who: "Automatic (code)", detail: "Vulnerability indicators found: senior co-approval required (Customers in vulnerable circumstances, section 2.2)" });
    expect(describeEvent(ev("System · routing", "Routed", "Handler: Standard complaint"), clauses))
      .toEqual({ what: "Kept with a complaint handler", who: "Automatic (code)", detail: "Standard complaint." });
    expect(describeEvent(ev("System · routing", "Routed", "Fraud & Disputes: Authorisation decisions are reserved for Fraud & Disputes (POL-04 §3.3)"), clauses).what)
      .toBe("Sent to Fraud & Disputes");
  });

  it("people: name and role, and IDs in the detail turned into words", () => {
    expect(describeEvent(ev("J. Okafor · handler", "Amended", "Factual error corrected · checks re-run: 0 fail, 1 refer"), clauses))
      .toEqual({ what: "Draft edited", who: "J. Okafor (handler)", detail: "Factual error corrected · checks re-run: 0 fail, 1 refer" });
    expect(describeEvent(ev("J. Okafor · handler", "Over-reliance prompt shown", "x"), clauses).what).toBe("Quick-approval check shown");
  });
});

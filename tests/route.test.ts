import { describe, expect, it } from "vitest";
import { routeCase, type RouteInput } from "../lib/route";
import type { TriageOutput } from "../lib/types";

const triage = (over: Partial<TriageOutput> = {}): TriageOutput => ({
  category: "Service and conduct", categoryConfidence: 0.9, vulnerable: false, vulnerabilityIndicators: [],
  paymentServices: false, summaryResolutionEligible: false, injectionSuspected: false, summary: "s", keyFacts: [], ...over,
});
const input = (over: Partial<RouteInput> = {}): RouteInput => ({
  maskingFailed: false, injection: false, triage: triage(), redressAmount: null, maskedText: "I waited a long time.", ...over,
});

describe("routeCase", () => {
  it("1. masking failure goes to a handler", () => {
    expect(routeCase(input({ maskingFailed: true, triage: null }))).toMatchObject({ route: "Handler", reason: expect.stringContaining("Masking failed") });
  });

  it("1. injection goes to a handler with a Financial Crime referral, even for fraud categories", () => {
    const r = routeCase(input({ injection: true, triage: triage({ category: "Unauthorised payment" }) }));
    expect(r).toMatchObject({ route: "Handler", financialCrimeReferral: true });
  });

  it("invalid AI output goes to a handler", () => {
    expect(routeCase(input({ triage: null })).reason).toContain("AI output invalid");
  });

  it.each(["Unauthorised payment", "APP scam"] as const)("2. %s goes to Fraud & Disputes", (category) => {
    expect(routeCase(input({ triage: triage({ category }) })).route).toBe("Fraud & Disputes");
  });

  it("3. lending goes to Lending Support", () => {
    expect(routeCase(input({ triage: triage({ category: "Lending and affordability" }) })).route).toBe("Lending Support");
  });

  it.each(["I am instructing a solicitor", "I will escalate this to the FCA", "I will contact a journalist"])("4. '%s' goes to Complaints Management", (text) => {
    expect(routeCase(input({ maskedText: text })).route).toBe("Complaints Management");
  });

  it("4. redress over £1,000 goes to Complaints Management", () => {
    expect(routeCase(input({ redressAmount: 1500 })).route).toBe("Complaints Management");
  });

  it("5. one vulnerability driver goes to a senior with co-approval", () => {
    const r = routeCase(input({ triage: triage({ vulnerable: true, vulnerabilityIndicators: [{ driver: "Life events", indicator: "bereavement" }] }) }));
    expect(r).toMatchObject({ route: "Senior", requiresSeniorCoApproval: true });
  });

  it("5. two drivers go to the Vulnerability Team with co-approval", () => {
    const vuln = triage({ vulnerable: true, vulnerabilityIndicators: [{ driver: "Life events", indicator: "bereavement" }, { driver: "Health", indicator: "surgery" }] });
    expect(routeCase(input({ triage: vuln }))).toMatchObject({ route: "Vulnerability Team", requiresSeniorCoApproval: true });
  });

  it("6. low confidence goes to a handler with a reason", () => {
    expect(routeCase(input({ triage: triage({ categoryConfidence: 0.6 }) })).reason).toContain("Low confidence");
  });

  it("7. otherwise a handler, with no co-approval", () => {
    expect(routeCase(input())).toMatchObject({ route: "Handler", requiresSeniorCoApproval: false });
  });

  it("redress above the handler limit needs senior co-approval", () => {
    expect(routeCase(input({ redressAmount: 300 })).requiresSeniorCoApproval).toBe(true);
    expect(routeCase(input({ redressAmount: 250 })).requiresSeniorCoApproval).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { retrieve, searchClauses } from "@/lib/retrieve";

const top3 = (query: string) => searchClauses(query).slice(0, 3).map((c) => c.id);

describe("searchClauses", () => {
  // Expected clause chosen by reading data/policies, not by running the ranker.
  const cases: [query: string, expected: string][] = [
    ["Replacement card has not arrived after ten days", "POL-02 §4.1"],
    ["Charged a fee because a direct debit was returned unpaid", "POL-03 §1.2"],
    ["Service and conduct: waited 45 minutes in the branch queue", "POL-06 §1.1"],
    ["Promised call-back never happened, twice", "POL-06 §3.1"],
    ["APP scam: tricked into sending a bank transfer to a fraudster posing as a builder", "POL-04 §4.1"],
    ["Bereavement: husband died, fees still being charged on his sole account", "POL-09 §2.1"],
    ["Lost my job and in financial difficulty, collections letters keep coming", "POL-03 §3.1"],
    ["Card declined at the till because of a bank system fault", "POL-02 §2.1"],
    ["Lending and affordability: loan was unaffordable when it was approved", "POL-10 §2.2"],
    ["How much redress can a complaint handler approve without a senior", "POL-05 §2.1"],
  ];

  it.each(cases)("ranks the obvious clause in the top 3 for: %s", (query, expected) => {
    expect(top3(query)).toContain(expected);
  });

  it("returns results best first, with scores", () => {
    const results = searchClauses("replacement card not arrived");
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
  });
});

describe("retrieve", () => {
  const triage = {
    category: "Card delivery and access" as const,
    summary: "[CUSTOMER_1] ordered a replacement debit card ten days ago and it has not arrived.",
    keyFacts: ["Replacement card ordered 26/10/2026", "No card received"],
    paymentServices: false,
    summaryResolutionEligible: true,
  };
  const ids = (t: typeof triage) => retrieve(t).map((c) => c.id);
  const AUTHORITY_LIMITS = ["POL-05 §2.1", "POL-05 §2.2", "POL-05 §2.3", "POL-05 §2.4", "POL-05 §2.5"];

  it("puts the best-matching clause first", () => {
    expect(ids(triage)[0]).toBe("POL-02 §4.1");
  });

  it("always includes the redress authority limits and FOS signposting", () => {
    expect(ids(triage)).toEqual(expect.arrayContaining([...AUTHORITY_LIMITS, "DISP-G §2.3"]));
  });

  it("includes the deadline clause that matches the case", () => {
    expect(ids(triage)).toContain("DISP-G §2.1");
    expect(ids({ ...triage, summaryResolutionEligible: false })).toContain("DISP-G §2.2");
    expect(ids({ ...triage, summaryResolutionEligible: false, paymentServices: true })).toContain("DISP-G §2.4");
    expect(ids({ ...triage, summaryResolutionEligible: false, paymentServices: true })).not.toContain("DISP-G §2.2");
  });

  it("returns at most the top 6 plus the always-include clauses, with no duplicates", () => {
    const result = ids(triage);
    expect(new Set(result).size).toBe(result.length);
    expect(result.length).toBeLessThanOrEqual(6 + AUTHORITY_LIMITS.length + 2);
  });
});

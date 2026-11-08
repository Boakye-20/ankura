import { describe, expect, it } from "vitest";
import { loadClauses, parsePolicyDoc } from "@/lib/policies";

describe("loadClauses", () => {
  const clauses = loadClauses();

  it("loads every clause in the library (87, counted by hand from data/policies)", () => {
    expect(clauses).toHaveLength(87);
  });

  it("gives each clause a stable, unique ID such as 'POL-04 §2.1'", () => {
    const ids = clauses.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("POL-04 §2.1");
    expect(ids).toContain("DISP-G §2.3");
    expect(ids).toContain("POL-05 §2.5");
  });

  it("does not treat the library README as a policy", () => {
    expect(clauses.some((c) => c.doc === "README")).toBe(false);
  });

  it("records the document, its title, the section heading and the clause text", () => {
    expect(clauses.find((c) => c.id === "POL-05 §2.1")).toEqual({
      id: "POL-05 §2.1",
      doc: "POL-05",
      title: "Redress and goodwill payments",
      section: "Approval limits",
      text: "Complaint handler: total redress up to £250 per case.",
    });
  });
});

describe("parsePolicyDoc", () => {
  it("reads Windows line endings the same as Unix ones", () => {
    const unix = "# POL-99: Test policy\nOwner: X\n\n## §1 Things\n§1.1 First rule.\n§1.2 Second rule.\n";
    const windows = unix.replace(/\n/g, "\r\n");
    expect(parsePolicyDoc("POL-99", windows)).toEqual(parsePolicyDoc("POL-99", unix));
    expect(parsePolicyDoc("POL-99", windows)[1].text).toBe("Second rule.");
  });
});

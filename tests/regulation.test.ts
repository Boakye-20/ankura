import { describe, expect, it } from "vitest";
import { loadClauses } from "@/lib/policies";
import { REGULATORY_MAP, regulatoryBasis } from "@/lib/regulation";

const CHECK_IDS = [
  "MASK-01", "MASK-02", "INJ-01", "CIT-01", "CIT-02", "CIT-03", "RED-01", "RED-02",
  "FOS-01", "VUL-01", "CONF-01", "SCHEMA-01", "CLEAR-01", "LTR-01",
];
const PRIMARY_SOURCES = ["handbook.fca.org.uk", "www.fca.org.uk", "www.legislation.gov.uk", "ico.org.uk", "www.psr.org.uk", "www.financial-ombudsman.org.uk"];

describe("regulatory map", () => {
  it("only maps clauses that exist in the policy library", () => {
    const clauseIds = new Set(loadClauses().map((c) => c.id));
    for (const id of Object.keys(REGULATORY_MAP.clauses)) expect(clauseIds, id).toContain(id);
  });

  it("gives every pre-release check a regulatory or policy basis", () => {
    expect(Object.keys(REGULATORY_MAP.checks).sort()).toEqual([...CHECK_IDS].sort());
  });

  it("only refers to sources that are defined", () => {
    const refs = [...Object.values(REGULATORY_MAP.clauses), ...Object.values(REGULATORY_MAP.checks)].flat();
    for (const ref of refs) expect(Object.keys(REGULATORY_MAP.sources), ref).toContain(ref);
  });

  it("links only to primary sources", () => {
    for (const source of Object.values(REGULATORY_MAP.sources)) {
      if (source.url) expect(PRIMARY_SOURCES, source.url).toContain(new URL(source.url).hostname);
    }
  });
});

describe("regulatoryBasis", () => {
  it("returns the sources behind a policy clause", () => {
    expect(regulatoryBasis("DISP-G §2.4").map((s) => s.ref)).toEqual(["DISP 1.6.2AR"]);
  });

  it("returns the sources behind a check", () => {
    expect(regulatoryBasis("VUL-01").map((s) => s.ref)).toContain("FG21/1");
  });

  it("returns nothing for a clause with no mapped regulation", () => {
    expect(regulatoryBasis("POL-06 §1.1")).toEqual([]);
  });
});

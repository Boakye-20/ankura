import map from "../data/regulatory-map.json";

export type RegulatorySource = { ref: string; title: string; url: string | null };

type RegulatoryMap = {
  asOf: string;
  note: string;
  sources: Record<string, { title: string; url: string | null }>;
  clauses: Record<string, string[]>;
  checks: Record<string, string[]>;
};

export const REGULATORY_MAP: RegulatoryMap = map;

/** The regulatory sources behind a policy clause (e.g. "DISP-G §2.4") or a check (e.g. "VUL-01"). */
export function regulatoryBasis(id: string): RegulatorySource[] {
  const refs = REGULATORY_MAP.clauses[id] ?? REGULATORY_MAP.checks[id] ?? [];
  return refs.map((ref) => ({ ref, ...REGULATORY_MAP.sources[ref] }));
}

import { loadClauses } from "./policies";
import type { Clause, TriageOutput } from "./types";

// BM25 parameters from docs/04.
const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set(
  "a an and are as at be been but by did do does for from had has have he her his i in is it its me my not of on or our she so than that the their them they this to was we were what when which who will with you your".split(" "),
);

// Crude suffix stripping so "charged", "charges" and "charging" match. Deterministic and easy to explain.
function stem(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  for (const suffix of ["ing", "ed", "es", "s", "e"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  return word;
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9£]+/)
    .filter((word) => word && !STOPWORDS.has(word))
    .map(stem);
}

type Index = { clauses: Clause[]; docs: string[][]; avgLength: number; docFreq: Map<string, number> };

let index: Index | null = null;

function getIndex(): Index {
  if (index) return index;
  const clauses = loadClauses();
  const docs = clauses.map((c) => tokenise(`${c.title} ${c.section} ${c.text}`));
  const docFreq = new Map<string, number>();
  for (const terms of docs) for (const term of new Set(terms)) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  const avgLength = docs.reduce((sum, terms) => sum + terms.length, 0) / docs.length;
  index = { clauses, docs, avgLength, docFreq };
  return index;
}

export type ScoredClause = Clause & { score: number };

/** BM25 search over the policy library. Returns clauses with a positive score, best first. */
export function searchClauses(query: string): ScoredClause[] {
  const { clauses, docs, avgLength, docFreq } = getIndex();
  const queryTerms = [...new Set(tokenise(query))];
  const n = docs.length;

  return clauses
    .map((clause, i) => {
      const terms = docs[i];
      let score = 0;
      for (const term of queryTerms) {
        const tf = terms.filter((t) => t === term).length;
        if (!tf) continue;
        const df = docFreq.get(term) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * terms.length) / avgLength));
      }
      return { ...clause, score: Math.round(score * 1000) / 1000 };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

const TOP_K = 6;
const AUTHORITY_LIMITS = ["POL-05 §2.1", "POL-05 §2.2", "POL-05 §2.3", "POL-05 §2.4", "POL-05 §2.5"];
const FOS_CLAUSES = ["DISP-G §2.3", "DISP-G §2.5"]; // FOS signposting and the six-month time limit

type RetrievalInput = Pick<TriageOutput, "category" | "summary" | "keyFacts" | "paymentServices" | "summaryResolutionEligible">;

function deadlineClauses({ paymentServices, summaryResolutionEligible }: RetrievalInput): string[] {
  const ids: string[] = [];
  if (summaryResolutionEligible) ids.push("DISP-G §2.1");
  if (paymentServices) ids.push("DISP-G §2.4");
  if (!ids.length) ids.push("DISP-G §2.2");
  return ids;
}

/**
 * Step 3 of the pipeline: the top 6 BM25 matches for the triage output, plus the clauses every
 * draft may need (deadline rule, FOS signposting and time limit, redress authority limits), with no duplicates.
 */
export function retrieve(triage: RetrievalInput): ScoredClause[] {
  const ranked = searchClauses([triage.summary, ...triage.keyFacts, triage.category].join(" "));
  const result = ranked.slice(0, TOP_K);

  for (const id of [...deadlineClauses(triage), ...FOS_CLAUSES, ...AUTHORITY_LIMITS]) {
    if (result.some((c) => c.id === id)) continue;
    const clause = ranked.find((c) => c.id === id) ?? { ...loadClauses().find((c) => c.id === id)!, score: 0 };
    result.push(clause);
  }
  return result;
}

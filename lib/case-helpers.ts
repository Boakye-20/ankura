// Pure helpers for the browser views. Imports types only, so nothing server-side reaches the client bundle.
import type { CaseState } from "./audit";
import type { CaseView } from "./stored-types";
import type { Check, Deadline, DraftPart } from "./types";

export type Tone = "ok" | "warn" | "bad" | "info" | "";

export function effectiveChecks(c: CaseView, state: CaseState): Check[] {
  return state.amended?.checks ?? c.result?.checks ?? [];
}

export function effectiveDraft(c: CaseView, state: CaseState) {
  if (state.amended) return { response: state.amended.response, proposedRedress: state.amended.proposedRedress };
  return c.result?.draft ? { response: c.result.draft.response, proposedRedress: c.result.draft.proposedRedress } : null;
}

export const resultOf = (checks: Check[], id: string) => checks.find((c) => c.id === id)?.result;

/** Co-approval is needed when the stored result says so, or an amended draft now refers redress to a senior. */
export function needsCoApproval(c: CaseView, checks: Check[]): boolean {
  return Boolean(c.result?.requiresSeniorCoApproval) || resultOf(checks, "RED-01") === "Refer";
}

export function flags(c: CaseView): [string, Tone][] {
  const r = c.result;
  if (!r) return [["Not processed", ""]];
  const out: [string, Tone][] = [];
  if (r.triage?.vulnerable) out.push(["Vulnerable", "bad"]);
  if (resultOf(r.checks, "INJ-01") === "Fail") out.push(["Injection detected", "bad"]);
  if (resultOf(r.checks, "MASK-01") === "Fail") out.push(["Masking failed", "bad"]);
  if (!r.draft) out.push(["Draft withheld", "bad"]);
  if (r.requiresSeniorCoApproval) out.push(["Senior co-approval", "warn"]);
  if (resultOf(r.checks, "CONF-01") === "Refer") out.push(["Low confidence", "warn"]);
  if (resultOf(r.checks, "MASK-02") === "Refer") out.push(["Check personal data", "warn"]);
  if (r.responseType === "Summary resolution") out.push(["Summary resolution", "ok"]);
  return out;
}

export function deadlineShare(d: Deadline | null): number {
  return d ? d.used / d.total : 0;
}

export function deadlineTone(d: Deadline | null): Tone {
  const share = deadlineShare(d);
  return share >= 0.9 ? "bad" : share >= 0.5 ? "warn" : "";
}

export function statusTone(status: CaseState["status"]): Tone {
  if (status === "Approved" || status === "Co-approved" || status === "Accepted by specialist") return "ok";
  if (status === "Open") return "";
  if (status === "Returned to handler" || status === "Returned by specialist") return "bad";
  return "warn";
}

/** Draft parts as editable text: one part per line, citations in square brackets at the end. */
export function draftToText(parts: DraftPart[]): string {
  return parts.map((p) => (p.citations.length ? `${p.text} [${p.citations.join(", ")}]` : p.text)).join("\n");
}

const CITATION = /\b(?:POL-\d{2}|DISP-G) §\d+\.\d+/g;

export function textToDraft(text: string): DraftPart[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    // Everything in a trailing [ ] is a citation, even in an unknown format, so CIT-01 sees it rather than it vanishing.
    const tail = /\s*\[([^\]]*)\]\s*$/.exec(line);
    const bracketed = tail ? tail[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const body = tail ? line.slice(0, tail.index) : line;
    const citations = [...new Set([...(body.match(CITATION) ?? []), ...bracketed])];
    const clean = body.replace(CITATION, "").replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s{2,}/g, " ").trim();
    return { text: clean, citations };
  });
}

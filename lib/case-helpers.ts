// Pure helpers for the browser views. Imports types only, so nothing server-side reaches the client bundle.
import type { CaseState, CaseStatus, Role, Session } from "./audit";
import { isLetterDue } from "./letter";
import type { CaseView, ClauseInfo } from "./stored-types";
import type { Check, Deadline, DraftPart, HandoverPack } from "./types";

export type Tone = "ok" | "warn" | "bad" | "info" | "";

/** Which queue a case belongs in for a role: act now, coming to me once the handler has acted, with someone else, or finished. */
export type QueueBucket = "mine" | "upcoming" | "progress" | "done";
const MY_ACTION: Record<Role, CaseStatus[]> = {
  Handler: ["Open", "Returned to handler", "Returned by specialist", "Escalated"],
  Senior: ["Awaiting senior co-approval"],
  Specialist: ["With specialist"],
};
const DONE: CaseStatus[] = ["Approved", "Co-approved", "Accepted by specialist"];
const isSpecialistTeam = (route: string) => route !== "Handler" && route !== "Senior";

export function queueBucket(status: CaseStatus, role: Role, next?: { needsSenior: boolean; route: string }): QueueBucket {
  if (DONE.includes(status)) return "done";
  if (MY_ACTION[role].includes(status)) return "mine";
  if (next && MY_ACTION.Handler.includes(status)) {
    if (role === "Senior" && next.needsSenior) return "upcoming";
    if (role === "Specialist" && isSpecialistTeam(next.route)) return "upcoming";
  }
  return "progress";
}

/** Where the case is, in words a handler would use. */
export function statusLabel(status: CaseStatus, team: string): string {
  switch (status) {
    case "Open": return "With handler";
    case "Returned to handler": return "Back with handler";
    case "Escalated": return "Handler preparing handover";
    case "Awaiting senior co-approval": return "Waiting for a senior";
    case "With specialist": return `With ${team}`;
    case "Returned by specialist": return `Returned by ${team}`;
    case "Approved": return "Approved";
    case "Co-approved": return "Approved by senior";
    case "Accepted by specialist": return `Accepted by ${team}`;
  }
}

/** "Unauthorised transactions and fraud §3.3" rather than "POL-04 §3.3". The ID stays available on hover. */
export function clauseName(id: string, clauses: Record<string, ClauseInfo>): string {
  const clause = clauses[id];
  const section = id.split("§")[1];
  return clause && section ? `${clause.title.replace(/\s*\([^)]*\)/g, "")} §${section}` : id;
}

/** The AI handover pack when there is one; otherwise a pack built from the case notes, labelled as such. */
export function handoverPackFor(c: CaseView): { pack: HandoverPack; fromAi: boolean } {
  const ai = c.result?.draft?.handover;
  if (ai) return { pack: ai, fromAi: true };
  return {
    fromAi: false,
    pack: {
      team: c.result?.route && isSpecialistTeam(c.result.route) ? c.result.route : "Specialist team",
      issue: c.result?.triage?.summary ?? "Not summarised: read the complaint.",
      actionsTaken: c.maskedNotes.map((n) => ({ text: n.text, source: n.id })),
      decisionsRequired: [],
      missingInformation: ["Decision required from the specialist (no AI handover pack for this case)"],
    },
  };
}

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

/** Plain-English time left on the regulatory clock, e.g. "2 business days left" or "Overdue by 12 days". */
export function dueText(d: Deadline | null): string {
  if (!d) return "No deadline set";
  const left = d.total - d.used;
  const unit = (n: number) => (n === 1 ? d.unit.replace(/s$/, "") : d.unit);
  if (left < 0) return `Overdue by ${-left} ${unit(-left)}`;
  if (left === 0) return "Due today";
  return `${left} ${unit(left)} left`;
}

export function deadlineTone(d: Deadline | null): Tone {
  const share = deadlineShare(d);
  return share >= 0.9 ? "bad" : share >= 0.5 ? "warn" : "";
}

export function statusTone(status: CaseState["status"]): Tone {
  if (DONE.includes(status)) return "ok";
  if (status === "Open") return "";
  if (status === "Returned to handler" || status === "Returned by specialist") return "bad";
  return "warn";
}

/* The case table: one flat row per case, then filter, sort and count. */

export type CaseRow = {
  ref: string;
  category: string;
  route: string;
  team: string;
  status: CaseStatus;
  where: string;
  bucket: QueueBucket;
  deadline: Deadline | null;
  daysLeft: number | null;
  late: boolean;
  letterDue: boolean;
  vulnerable: boolean;
  locked: boolean; // a failing check blocks approval
  flags: [string, Tone][];
  c: CaseView;
};

export function toRows(cases: CaseView[], session: Session, role: Role): CaseRow[] {
  return cases.map((c) => {
    const state = session.cases[c.ref] ?? { status: "Open" as const };
    const r = c.result;
    const d = r?.deadline ?? null;
    const daysLeft = d ? d.total - d.used : null;
    const team = handoverPackFor(c).pack.team;
    const route = r?.route ?? "Unassigned";
    const letterDue = isLetterDue(d, state.status) && !state.letterApproved;
    return {
      ref: c.ref,
      category: r?.triage?.category ?? "Unclassified",
      route, team,
      status: state.status,
      where: statusLabel(state.status, team),
      bucket: queueBucket(state.status, role, { needsSenior: Boolean(r?.requiresSeniorCoApproval), route }),
      deadline: d, daysLeft,
      late: daysLeft !== null && daysLeft <= 0,
      letterDue,
      vulnerable: Boolean(r?.triage?.vulnerable),
      locked: effectiveChecks(c, state).some((k) => k.result === "Fail"),
      flags: [...(letterDue ? [["Delay letter due", "bad"] as [string, Tone]] : []), ...flags(c)],
      c,
    };
  });
}

export type RowFilters = {
  view?: QueueBucket | "all";
  category?: string;
  route?: string;
  deadline?: "any" | "overdue" | "today" | "late" | "week"; // late = overdue or due today
  vulnerableOnly?: boolean;
};

const DEADLINE_TEST: Record<Exclude<NonNullable<RowFilters["deadline"]>, "any">, (left: number) => boolean> = {
  overdue: (left) => left < 0,
  today: (left) => left === 0,
  late: (left) => left <= 0,
  week: (left) => left <= 5,
};

export function filterRows(rows: CaseRow[], f: RowFilters): CaseRow[] {
  return rows.filter((r) =>
    (!f.view || f.view === "all" || r.bucket === f.view)
    && (!f.category || r.category === f.category)
    && (!f.route || r.route === f.route)
    && (!f.deadline || f.deadline === "any" || (r.daysLeft !== null && DEADLINE_TEST[f.deadline](r.daysLeft)))
    && (!f.vulnerableOnly || r.vulnerable));
}

export type CaseSortKey = "ref" | "category" | "route" | "status" | "deadline";

export function sortRows(rows: CaseRow[], key: CaseSortKey, dir: "asc" | "desc"): CaseRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (r: CaseRow) => (key === "status" ? r.where : key === "deadline" ? (r.daysLeft ?? Number.MAX_SAFE_INTEGER) : r[key]);
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b);
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return cmp * sign || a.ref.localeCompare(b.ref);
  });
}

export function rowStats(rows: CaseRow[]) {
  const n = (pick: (r: CaseRow) => boolean) => rows.filter(pick).length;
  return {
    total: rows.length,
    mine: n((r) => r.bucket === "mine"),
    upcoming: n((r) => r.bucket === "upcoming"),
    late: n((r) => r.late),
    vulnerable: n((r) => r.vulnerable),
    locked: n((r) => r.locked),
  };
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

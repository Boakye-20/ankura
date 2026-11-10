"use client";
import { useMemo, useState, type KeyboardEvent } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { deadlineShare, deadlineTone, dueShort, flags, queueBucket, statusTone } from "@/lib/case-helpers";
import { isLetterDue } from "@/lib/letter";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { CaseDetail } from "./CaseDetail";
import { Pill } from "./ui";

type Props = {
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  selected: string | null;
  onSelect: (ref: string) => void;
};

const VIEWS = { mine: "Mine", progress: "With others", done: "Done", all: "All" } as const;
type ViewKey = keyof typeof VIEWS;

/** Four cases that show the main controls. Listed for assessors; a live deployment would not have this strip. */
export const GUIDE: { ref: string; title: string; hint: string }[] = [
  {
    ref: "CMP-2026-104712",
    title: "Cited draft and handover",
    hint: "Hover a clause reference to read the policy. Choose Escalate, deal with the missing items, submit, then switch to Specialist to accept or return the pack.",
  },
  {
    ref: "CMP-2026-101003",
    title: "Vulnerable customer",
    hint: "Approve within 20 seconds to see the over-reliance check. The case then waits for a senior: switch to Senior handler to co-approve.",
  },
  {
    ref: "CMP-2026-105103",
    title: "Instruction aimed at the AI",
    hint: "The complaint tells the AI to approve £5,000. Code withholds the draft, so the handler writes the reply.",
  },
  {
    ref: "CMP-2026-104288",
    title: "Uncited statement blocked",
    hint: "One sentence states a fact without a policy clause, so approval is locked. Choose Edit and re-check to fix it, or try citing [POL-99 §1.1].",
  },
];

export function QueueView({ data, role, session, act, selected, onSelect }: Props) {
  const [view, setView] = useState<ViewKey>("mine");
  const [vulnOnly, setVulnOnly] = useState(false);

  const inView = (c: CaseView, v: ViewKey) => v === "all" || queueBucket(caseState(session, c.ref).status, role) === v;

  const rows = useMemo(() => {
    return data.cases
      .filter((c) => inView(c, view) && (!vulnOnly || Boolean(c.result?.triage?.vulnerable)))
      .sort((a, b) => deadlineShare(b.result?.deadline ?? null) - deadlineShare(a.result?.deadline ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.cases, view, vulnOnly, session, role]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const li = e.currentTarget.parentElement;
    const next = e.key === "ArrowDown" ? li?.nextElementSibling : li?.previousElementSibling;
    (next?.querySelector("button") as HTMLElement | null)?.focus();
  };

  const current = data.cases.find((c) => c.ref === selected) ?? null;
  const guided = GUIDE.find((g) => g.ref === selected);

  return (
    <div className="work">
      <div className="guide" aria-label="Suggested cases to test">
        <span>Try these cases</span>
        {GUIDE.map((g) => (
          <button key={g.ref} type="button" aria-pressed={selected === g.ref} onClick={() => onSelect(g.ref)}>{g.title}</button>
        ))}
        {guided && <span className="try">{guided.hint}</span>}
      </div>

      <div className="split">
        <section className="queue" aria-label="Case queue">
          <div className="queue-head">
            <div className="filters" role="group" aria-label="Filter the queue">
              {(Object.keys(VIEWS) as ViewKey[]).map((k) => (
                <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                  {VIEWS[k]}<span className="n">{data.cases.filter((c) => inView(c, k)).length}</span>
                </button>
              ))}
            </div>
            <div className="queue-sub">
              <span>Closest to deadline first</span>
              <label><input type="checkbox" checked={vulnOnly} onChange={(e) => setVulnOnly(e.target.checked)} /> Vulnerable only</label>
            </div>
          </div>

          <ul className="qlist">
            {rows.map((c) => {
              const d = c.result?.deadline ?? null;
              const state = caseState(session, c.ref);
              const tone = deadlineTone(d);
              const letterDue = isLetterDue(d, state.status) && !state.letterApproved;
              const tags = flags(c).filter(([label]) => label !== "Summary resolution").slice(0, letterDue ? 1 : 2);
              return (
                <li key={c.ref}>
                  <button type="button" className="qitem" aria-current={c.ref === selected} onClick={() => onSelect(c.ref)} onKeyDown={onKey}>
                    <span className="r">{c.ref}</span>
                    <span className={`d ${tone === "bad" ? "late" : tone === "warn" ? "soon" : ""}`}>{dueShort(d)}</span>
                    <span className="s">{c.result?.triage?.category ?? "Unclassified"} · {c.result?.route ?? "Unassigned"}</span>
                    <span className="tags">
                      {state.status !== "Open" && <Pill tone={statusTone(state.status)}>{state.status}</Pill>}
                      {letterDue && <Pill tone="bad">Delay letter due</Pill>}
                      {tags.map(([label, t]) => <Pill key={label} tone={t}>{label}</Pill>)}
                    </span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="empty">
                {view === "mine" ? (
                  <>
                    <b>Nothing is waiting for you as {role === "Senior" ? "senior handler" : role.toLowerCase()}.</b>
                    <span className="note">Cases arrive here when a handler approves a vulnerable-customer case or submits a handover pack.</span>
                    <button type="button" className="btn small" onClick={() => setView("all")}>Show all {data.cases.length} cases</button>
                  </>
                ) : "No cases match this filter."}
              </li>
            )}
          </ul>
        </section>

        {current ? (
          <CaseDetail key={current.ref} c={current} data={data} role={role} session={session} act={act} />
        ) : (
          <div className="empty">
            <h2>Select a case</h2>
            <p>Choose a case from the queue, or one of the suggested cases above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

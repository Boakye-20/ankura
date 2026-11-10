"use client";
import { useMemo, useState, type KeyboardEvent } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { deadlineShare, deadlineTone, dueText, flags, queueBucket, statusTone } from "@/lib/case-helpers";
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
  onEscalated?: (ref: string) => void;
};

const VIEWS = {
  mine: "Needs my action",
  progress: "With others",
  done: "Completed",
  all: "All cases",
} as const;
type ViewKey = keyof typeof VIEWS;

const SCENARIOS: { ref: string; title: string; badge: string; tone: "bad" | "warn" | "info"; desc: string }[] = [
  {
    ref: "CMP-2026-105103",
    title: "1. Prompt injection & safety block",
    badge: "Guardrail block",
    tone: "bad",
    desc: "Customer embeds hidden AI instructions to force a £950 payout. INJ-01 detects the injection and withholds the draft.",
  },
  {
    ref: "CMP-2026-104288",
    title: "2. Vulnerable customer co-approval",
    badge: "Senior sign-off",
    tone: "warn",
    desc: "Bereaved customer (FG21/1 indicator). Handler approval routes to Senior Handler; fast approval (<20s) triggers an over-reliance check.",
  },
  {
    ref: "CMP-2026-104712",
    title: "3. Specialist handover & checklist",
    badge: "Handover pack",
    tone: "info",
    desc: "Card fraud dispute routed to Fraud & Disputes. AI builds a structured handover pack and blocks submission until missing items are resolved.",
  },
];

export function QueueView({ data, role, session, act, selected, onSelect, onEscalated }: Props) {
  const [view, setView] = useState<ViewKey>("mine");
  const [vulnOnly, setVulnOnly] = useState(false);

  const inView = (c: CaseView, v: ViewKey) => v === "all" || queueBucket(caseState(session, c.ref).status, role) === v;

  const rows = useMemo(() => {
    return data.cases
      .filter((c) => inView(c, view) && (!vulnOnly || Boolean(c.result?.triage?.vulnerable)))
      .sort((a, b) => -deadlineShare(a.result?.deadline ?? null) - -deadlineShare(b.result?.deadline ?? null));
  }, [data.cases, view, vulnOnly, session, role]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const li = e.currentTarget.parentElement;
    const next = e.key === "ArrowDown" ? li?.nextElementSibling : li?.previousElementSibling;
    (next?.querySelector("button") as HTMLElement | null)?.focus();
  };

  // Auto-select first case if none selected or if selected exists
  const current = data.cases.find((c) => c.ref === selected) ?? null;

  return (
    <div className="workspace-wrap">
      {/* Guided Scenario Strip for Evaluators */}
      <div className="scenario-bar" aria-label="Featured evaluation scenarios">
        <span className="sb-label">Key scenarios to test:</span>
        <div className="sb-cards">
          {SCENARIOS.map((s) => (
            <button
              key={s.ref}
              type="button"
              className={`sb-card ${selected === s.ref ? "active" : ""}`}
              onClick={() => onSelect(s.ref)}
            >
              <div className="sb-top">
                <b>{s.title}</b>
                <Pill tone={s.tone}>{s.badge}</Pill>
              </div>
              <span className="sb-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="split">
        <section className="qpane" aria-label="Case queue">
          <div className="qhead">
            <div className="view-pills" role="group" aria-label="Filter queue by status">
              {(Object.keys(VIEWS) as ViewKey[]).map((k) => {
                const count = data.cases.filter((c) => inView(c, k)).length;
                return (
                  <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                    <span>{VIEWS[k]}</span>
                    <span className="count">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="q-subbar">
              <span className="note">Sorted by regulatory deadline risk</span>
              <button
                type="button"
                className="vuln-toggle"
                aria-pressed={vulnOnly}
                onClick={() => setVulnOnly((v) => !v)}
              >
                Vulnerable only
              </button>
            </div>
          </div>

          <ul className="qlist">
            {rows.map((c) => {
              const d = c.result?.deadline ?? null;
              const state = caseState(session, c.ref);
              const tone = deadlineTone(d);
              const tags = flags(c).filter(([label]) => label !== "Summary resolution").slice(0, 2);
              return (
                <li key={c.ref}>
                  <button
                    type="button"
                    className="qitem"
                    aria-current={c.ref === selected}
                    onClick={() => onSelect(c.ref)}
                    onKeyDown={onKey}
                  >
                    <span className="r">{c.ref}</span>
                    <span className={`d ${tone === "bad" ? "late" : tone === "warn" ? "soon" : ""}`}>{dueText(d)}</span>
                    <span className="s">
                      {c.result?.triage?.category ?? "Unclassified"} · {c.result?.route ?? "Unassigned"}
                    </span>
                    <span className="tags">
                      {state.status !== "Open" && <Pill tone={statusTone(state.status)}>{state.status}</Pill>}
                      {isLetterDue(d, state.status) && !state.letterApproved && <Pill tone="bad">Delay letter due</Pill>}
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
                    <b>No cases waiting for {role.toLowerCase()} action.</b>
                    <span className="note">Switch to &ldquo;All cases&rdquo; above or change your simulated role in the top bar.</span>
                    <button type="button" className="btn small" onClick={() => setView("all")}>Show all {data.cases.length} cases</button>
                  </>
                ) : (
                  "No cases match this filter."
                )}
              </li>
            )}
          </ul>
        </section>

        {current ? (
          <CaseDetail key={current.ref} c={current} data={data} role={role} session={session} act={act} onEscalated={onEscalated} />
        ) : (
          <div className="cpane empty-pane">
            <div className="empty" style={{ margin: "auto", maxWidth: 460 }}>
              <h2>Select a complaint to begin</h2>
              <p>Choose any case from the queue on the left, or click one of the <b>3 key scenarios</b> at the top to test prompt-injection blocking, vulnerable customer co-approval, or specialist handovers.</p>
              <button type="button" className="btn primary" onClick={() => onSelect("CMP-2026-105103")}>
                Start with Scenario 1 (CMP-2026-105103)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { deadlineTone, dueText, effectiveChecks, effectiveDraft, statusTone } from "@/lib/case-helpers";
import { fmtDate, fmtDateTime, gbp } from "@/lib/format";
import { isLetterDue } from "@/lib/letter";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { CheckSummary, ChecksPanel } from "./ChecksPanel";
import { DecisionPanel } from "./DecisionPanel";
import { LetterBox } from "./LetterBox";
import { CitationChip, MaskedText, Pill } from "./ui";

type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  onEscalated?: (ref: string) => void;
};

export function CaseDetail({ c, data, role, session, act, onEscalated }: Props) {
  const [openedAt] = useState(() => Date.now()); // for the over-reliance prompt (approval under 20 seconds)
  const state = caseState(session, c.ref);
  const r = c.result;
  const t = r?.triage ?? null;
  const d = r?.deadline ?? null;
  const draft = effectiveDraft(c, state);
  const checks = effectiveChecks(c, state);
  const dTone = deadlineTone(d);
  const events = [...(r?.audit ?? []), ...session.events.filter((e) => e.ref === c.ref)];

  return (
    <div className="case-workspace">
      {/* 1. Compact Header Bar */}
      <header className="case-banner">
        <div className="cb-main">
          <div className="cb-title">
            <h2>{c.ref}</h2>
            <Pill tone={statusTone(state.status)}>{state.status}</Pill>
            {t?.vulnerable && <Pill tone="bad">Vulnerable customer</Pill>}
            {r?.requiresSeniorCoApproval && <Pill tone="warn">Senior co-approval required</Pill>}
          </div>
          <p className="cb-sub">
            <b>{t?.category ?? "Unclassified"}</b> · {c.product} · Received {fmtDate(c.received)} via {c.channel.toLowerCase()} · Route: <b>{r?.route ?? "Unassigned"}</b>
          </p>
        </div>
        {d && (
          <div className={`cb-sla ${dTone === "bad" ? "late" : dTone === "warn" ? "soon" : ""}`}>
            <span className="sla-due">{dueText(d)}</span>
            <span className="sla-meta">Due {fmtDate(d.due)} ({d.used}/{d.total} {d.unit}) · <CitationChip id={d.basis} clauses={data.clauses} /></span>
          </div>
        )}
      </header>

      <div className="case-body">
        {/* 2. Left Column: Evidence & AI Brief */}
        <section className="evidence-col" aria-label="Customer complaint and case notes">
          {t && (
            <div className="brief-card">
              <div className="card-head">
                <h3>AI Triage &amp; Key Facts</h3>
                <span className="ailabel">Confidence {(t.categoryConfidence * 100).toFixed(0)}% · Verify against source below</span>
              </div>
              <p className="txt"><MaskedText text={t.summary} /></p>
              {t.keyFacts.length > 0 && (
                <ul className="fact-list">
                  {t.keyFacts.map((f, i) => <li key={i}><MaskedText text={f} /></li>)}
                </ul>
              )}
              {t.vulnerable && t.vulnerabilityIndicators.length > 0 && (
                <div className="vuln-alert">
                  <b>Vulnerability indicators (FG21/1 · senior co-approval required):</b>
                  <ul>
                    {t.vulnerabilityIndicators.map((v, i) => (
                      <li key={i}><Pill tone="bad">{v.driver}</Pill> {v.indicator}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="source-card">
            <div className="card-head">
              <h3>Customer Complaint</h3>
              <span className="ailabel">PII masked before AI processing</span>
            </div>
            <p className="txt"><MaskedText text={c.maskedText} /></p>
          </div>

          {c.maskedNotes.length > 0 && (
            <div className="notes-card">
              <h3>Internal Case Notes ({c.maskedNotes.length})</h3>
              <div className="notes-list">
                {c.maskedNotes.map((n) => (
                  <div className="note-item" key={n.id}>
                    <span className="note-meta"><b>{n.id}</b> · {fmtDate(n.date)}</span>
                    <p className="txt"><MaskedText text={n.text} /></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {r && r.retrieved.length > 0 && (
            <details className="drawer">
              <summary>Retrieved Policy Clauses ({r.retrieved.length})</summary>
              <div className="drawer-body">
                <ul className="refs">
                  {r.retrieved.map((ref) => (
                    <li key={ref.id}>
                      <span><CitationChip id={ref.id} clauses={data.clauses} /></span>
                      <span>{data.clauses[ref.id]?.text}</span>
                      <span className="score">{ref.score ? ref.score.toFixed(1) : "rule"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </section>

        {/* 3. Right Column: AI Draft, Verification Guardrails & Human Decision */}
        <section className="action-col" aria-label="Response, guardrails and decision">
          {r && (isLetterDue(d, state.status) || state.letterApproved) && (
            <div className="card">
              <LetterBox c={c} data={data} state={state} act={act} />
            </div>
          )}

          {r ? (
            <div className={`composer ${draft ? "" : "blocked"}`}>
              <div className="ch">
                <h3>{draft ? (state.amended ? "Amended Customer Response" : "AI Drafted Customer Response") : "Draft Response Withheld"}</h3>
                <span className="ailabel">
                  {draft
                    ? (state.amended ? "Edited by handler & re-verified · Not sent" : "Grounded in policy library · Click any citation to inspect")
                    : "Blocked by safety guardrails"}
                </span>
              </div>

              <CheckSummary checks={checks} draftWithheld={!draft} />

              <div className="cb">
                {draft ? (
                  <>
                    <div className="draft-box">
                      {draft.response.map((p, i) => (
                        <p key={i} className="draft-p">
                          <MaskedText text={p.text} />
                          {p.citations.map((id) => <span key={id}> <CitationChip id={id} clauses={data.clauses} /></span>)}
                        </p>
                      ))}
                    </div>
                    <div className="redress-bar">
                      <span>Proposed redress:</span>
                      <b>
                        {draft.proposedRedress
                          ? <>{gbp(draft.proposedRedress.amount)} — {draft.proposedRedress.basis} <CitationChip id={draft.proposedRedress.clause} clauses={data.clauses} /></>
                          : "None (£0)"}
                      </b>
                    </div>
                  </>
                ) : (
                  <p className="txt blocked-reason">{r.draftWithheldReason ?? "No draft was produced."}</p>
                )}
              </div>

              <div className="cf">
                <DecisionPanel c={c} data={data} role={role} state={state} checks={checks} draft={draft} act={act} openedAt={openedAt} onEscalated={onEscalated} />
              </div>
            </div>
          ) : (
            <p className="banner">No stored AI output for this case yet.</p>
          )}

          {r && (
            <div className="card">
              <ChecksPanel checks={checks} basis={data.checkBasis} amended={Boolean(state.amended)} draftWithheld={!draft} />
            </div>
          )}

          <details className="drawer">
            <summary>Case Audit Trail ({events.length} events)</summary>
            <div className="drawer-body">
              <ol className="history">
                {events.map((e, i) => (
                  <li key={i}>
                    <span className="when">{fmtDateTime(e.ts)}</span>
                    <span><b>{e.event}</b> by {e.actor}</span>
                    {e.detail && <span className="note">{e.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

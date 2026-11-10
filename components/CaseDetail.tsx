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
};

export function CaseDetail({ c, data, role, session, act }: Props) {
  const [openedAt] = useState(() => Date.now()); // for the over-reliance check (approval under 20 seconds)
  const state = caseState(session, c.ref);
  const r = c.result;
  const t = r?.triage ?? null;
  const d = r?.deadline ?? null;
  const draft = effectiveDraft(c, state);
  const checks = effectiveChecks(c, state);
  const dTone = deadlineTone(d);
  const events = [...(r?.audit ?? []), ...session.events.filter((e) => e.ref === c.ref)];

  return (
    <article className="case" aria-label={`Case ${c.ref}`}>
      <header className="case-head">
        <div>
          <div className="case-title">
            <h2>{c.ref}</h2>
            <Pill tone={statusTone(state.status)}>{state.status}</Pill>
            {t?.vulnerable && <Pill tone="bad">Vulnerable customer</Pill>}
            {r?.requiresSeniorCoApproval && <Pill tone="warn">Needs senior co-approval</Pill>}
          </div>
          <p className="case-meta">
            <b>{t?.category ?? "Unclassified"}</b> · {c.product} · Received {fmtDate(c.received)} by {c.channel.toLowerCase()} · Routed to <b>{r?.route ?? "nobody yet"}</b>
          </p>
        </div>
        {d && (
          <div className={`due ${dTone === "bad" ? "late" : dTone === "warn" ? "soon" : ""}`}>
            <b>{dueText(d)}</b>
            <span>Due {fmtDate(d.due)} · day {d.used} of {d.total} · <CitationChip id={d.basis} clauses={data.clauses} /></span>
          </div>
        )}
      </header>

      <div className="case-cols">
        <div className="col" aria-label="The complaint and what is known">
          {t && (
            <section className="sec">
              <div className="sec-head">
                <h3>Summary</h3>
                <span className="label">AI-generated · confidence {(t.categoryConfidence * 100).toFixed(0)}% · check against the complaint</span>
              </div>
              <p className="txt"><MaskedText text={t.summary} /></p>
              {t.keyFacts.length > 0 && (
                <ul className="facts">{t.keyFacts.map((f, i) => <li key={i}><MaskedText text={f} /></li>)}</ul>
              )}
              {t.vulnerable && t.vulnerabilityIndicators.length > 0 && (
                <div className="vuln">
                  <span className="sub">Signs of vulnerability</span>
                  <ul>{t.vulnerabilityIndicators.map((v, i) => <li key={i}><b>{v.driver}.</b> {v.indicator}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          <section className="sec">
            <div className="sec-head">
              <h3>Complaint as received</h3>
              <span className="label">Personal data masked before any AI step</span>
            </div>
            <p className="txt"><MaskedText text={c.maskedText} /></p>
          </section>

          {c.maskedNotes.length > 0 && (
            <section className="sec">
              <h3>Case notes</h3>
              <ul className="notes">
                {c.maskedNotes.map((n) => (
                  <li key={n.id}>
                    <span className="when">{n.id} · {fmtDate(n.date)}</span>
                    <span className="txt"><MaskedText text={n.text} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r && r.retrieved.length > 0 && (
            <section className="sec">
              <details>
                <summary>Policy clauses retrieved for this case ({r.retrieved.length})</summary>
                <ul className="rows refs">
                  {r.retrieved.map((ref) => (
                    <li key={ref.id}>
                      <span><CitationChip id={ref.id} clauses={data.clauses} /></span>
                      <span>{data.clauses[ref.id]?.text}</span>
                      <span className="score" title={ref.score ? "Search relevance score" : "Always included by rule"}>{ref.score ? ref.score.toFixed(1) : "rule"}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </div>

        <div className="col" aria-label="Reply, checks and decision">
          {r && (isLetterDue(d, state.status) || state.letterApproved) && (
            <section className="sec"><LetterBox c={c} data={data} state={state} act={act} /></section>
          )}

          {r ? (
            <section className="sec">
              <div className="sec-head">
                <h3>{draft ? (state.amended ? "Amended reply" : "Draft reply") : "No draft reply"}</h3>
                <span className="label">
                  {draft ? (state.amended ? "Edited by the handler and re-checked · not sent" : "AI-generated · not sent · every clause reference opens the policy") : "The handler writes this reply"}
                </span>
              </div>
              <CheckSummary checks={checks} draftWithheld={!draft} />
              {draft ? (
                <>
                  <div className="draft">
                    {draft.response.map((p, i) => (
                      <p key={i}>
                        <MaskedText text={p.text} />
                        {p.citations.map((id) => <span key={id}> <CitationChip id={id} clauses={data.clauses} /></span>)}
                      </p>
                    ))}
                  </div>
                  <dl className="kv">
                    <dt>Proposed redress</dt>
                    <dd>
                      {draft.proposedRedress
                        ? <>{gbp(draft.proposedRedress.amount)} · {draft.proposedRedress.basis} <CitationChip id={draft.proposedRedress.clause} clauses={data.clauses} /></>
                        : "None"}
                    </dd>
                  </dl>
                </>
              ) : (
                <p className="withheld">{r.draftWithheldReason ?? "No draft was produced."}</p>
              )}
            </section>
          ) : (
            <section className="sec"><p className="banner">No stored AI output for this case yet.</p></section>
          )}

          {r && (
            <section className="sec">
              <DecisionPanel c={c} data={data} role={role} state={state} checks={checks} draft={draft} act={act} openedAt={openedAt} />
            </section>
          )}

          {r && (
            <section className="sec">
              <ChecksPanel checks={checks} basis={data.checkBasis} amended={Boolean(state.amended)} draftWithheld={!draft} />
            </section>
          )}

          <section className="sec">
            <details>
              <summary>Audit trail for this case ({events.length} events)</summary>
              <ol className="history">
                {events.map((e, i) => (
                  <li key={i}>
                    <span className="when">{fmtDateTime(e.ts)}</span>
                    <span><b>{e.event}</b> · {e.actor}{e.detail && <span className="note">{e.detail}</span>}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </div>
      </div>
    </article>
  );
}

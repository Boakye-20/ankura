"use client";
import { useState } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { describeEvent } from "@/lib/audit-copy";
import { deadlineTone, dueText, effectiveChecks, effectiveDraft, handoverPackFor, statusLabel, statusTone, type Tone } from "@/lib/case-helpers";
import { fmtDate, fmtDateTime, gbp } from "@/lib/format";
import { isLetterDue } from "@/lib/letter";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { CheckSummary, ChecksTable } from "./ChecksPanel";
import { DecisionPanel } from "./DecisionPanel";
import { LetterBox } from "./LetterBox";
import { CitationChip, MaskedText, Pill } from "./ui";

type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  onBack: () => void;
};

export function CaseDetail({ c, data, role, session, act, onBack }: Props) {
  const [openedAt] = useState(() => Date.now()); // for the over-reliance check (approval under 20 seconds)
  const state = caseState(session, c.ref);
  const r = c.result;
  const t = r?.triage ?? null;
  const d = r?.deadline ?? null;
  const draft = effectiveDraft(c, state);
  const checks = effectiveChecks(c, state);
  const dTone = deadlineTone(d);
  const team = handoverPackFor(c).pack.team;
  const events = [...(r?.audit ?? []), ...session.events.filter((e) => e.ref === c.ref)];
  const letterOwed = Boolean(r) && isLetterDue(d, state.status) && !state.letterApproved;
  const fails = checks.filter((k) => k.result === "Fail").length;
  const refers = checks.filter((k) => k.result === "Refer").length;
  // CIT-02 quotes the first 60 characters of the sentence it flagged, so that sentence can be marked in the draft.
  const flaggedSnippet = checks.find((k) => k.id === "CIT-02" && k.result === "Fail")?.detail.match(/"([^"]+)…"/)?.[1] ?? null;

  const steps: { kind: "Code" | "AI model" | "Person"; title: string; result: string; tone: Tone }[] = r ? [
    { kind: "Code", title: "Personal data masked", result: `${r.tokenCount} items replaced`, tone: checks.some((k) => k.id === "MASK-01" && k.result === "Fail") ? "bad" : "ok" },
    { kind: "AI model", title: "Triaged", result: t ? `${t.category}${t.vulnerable ? " · signs of vulnerability" : ""}` : "No triage", tone: t?.vulnerable ? "warn" : "ok" },
    { kind: "Code", title: "Policy found", result: `${r.retrieved.length} clauses`, tone: "ok" },
    { kind: "AI model", title: "Drafted", result: draft ? `${r.responseType ?? "Reply"}${state.amended ? " · amended by handler" : ""}` : "Withheld", tone: draft ? "ok" : "bad" },
    { kind: "Code", title: "Checked", result: `${checks.length - fails - refers} of ${checks.length} passed`, tone: fails ? "bad" : refers ? "warn" : "ok" },
    { kind: "Person", title: "Your decision", result: statusLabel(state.status, team), tone: statusTone(state.status) || "info" },
  ] : [];

  const draftSection = r && (
    <section className="sec">
      <div className="sec-head">
        <h3>{draft ? (state.amended ? "Amended reply" : "Draft reply") : "No draft reply"}</h3>
        <span className="label">{draft ? (state.amended ? "Edited by the handler and re-checked · not sent" : "AI-generated · not sent") : "The handler writes this reply"}</span>
      </div>
      <CheckSummary checks={checks} draftWithheld={!draft} />
      {draft ? (
        <>
          <div className="draft">
            {draft.response.map((p, i) => {
              const flagged = flaggedSnippet !== null && p.text.startsWith(flaggedSnippet);
              return (
                <p key={i} className={flagged ? "flagged" : undefined} title={flagged ? "This sentence needs a policy reference" : undefined}>
                  <MaskedText text={p.text} />
                  {p.citations.map((id) => <span key={id}> <CitationChip id={id} clauses={data.clauses} /></span>)}
                </p>
              );
            })}
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
        <p className="withheld"><MaskedText text={r.draftWithheldReason ?? "No draft was produced."} /></p>
      )}
      {fails + refers > 0 && (
        <>
          <h4>Needs your attention before approval</h4>
          <ChecksTable checks={checks} basis={data.checkBasis} only="attention" />
        </>
      )}
    </section>
  );

  return (
    <article className="case" aria-label={`Case ${c.ref}`}>
      <div className="case-top">
        <button type="button" className="back" onClick={onBack}>← Back to cases</button>
      </div>
      <header className="case-head">
        <div>
          <div className="case-title">
            <h2>{c.ref}</h2>
            <Pill tone={statusTone(state.status)}>{statusLabel(state.status, team)}</Pill>
            {t?.vulnerable && <Pill tone="bad">Vulnerable customer</Pill>}
            {r?.requiresSeniorCoApproval && <Pill tone="warn">Needs a senior as well</Pill>}
            {fails > 0 && <Pill tone="bad">Approval locked</Pill>}
          </div>
        </div>
        {d && (
          <div className={`due ${dTone === "bad" ? "late" : dTone === "warn" ? "soon" : ""}`}>
            <b>{dueText(d)}</b>
            <span>Due {fmtDate(d.due)} · {d.used > d.total ? `${d.total}-${d.unit.replace(/s$/, "")} deadline` : `${d.used} of ${d.total} ${d.unit} used`}</span>
          </div>
        )}
      </header>

      <dl className="facts">
        <div><dt>Complaint about</dt><dd>{t?.category ?? "Unclassified"}</dd></div>
        <div><dt>Product</dt><dd>{c.product}</dd></div>
        <div><dt>Received</dt><dd>{fmtDate(c.received)} by {c.channel.toLowerCase()}</dd></div>
        <div><dt>Team</dt><dd>{r?.route ?? "Not yet routed"}</dd></div>
        <div><dt>Reply type</dt><dd>{r?.responseType ?? "Not decided"}</dd></div>
        <div><dt>Deadline rule</dt><dd>{d ? <CitationChip id={d.basis} clauses={data.clauses} /> : "No deadline"}</dd></div>
        <div><dt>Clock</dt><dd>{d ? `${d.total} ${d.unit} from receipt` : "—"}</dd></div>
        <div><dt>Approval needed from</dt><dd>{r?.requiresSeniorCoApproval ? "Handler, then a senior" : "Handler"}</dd></div>
      </dl>

      {steps.length > 0 && (
        <ol className="flow" aria-label="How this case moved through the workbench">
          {steps.map((s, i) => (
            <li key={s.title} className={s.tone}>
              <span className="kind">{i + 1} · {s.kind}</span>
              <b>{s.title}</b>
              <span className="res"><span className="dot" aria-hidden="true" />{s.result}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="case-cols">
        <div className="col" aria-label="The complaint and what is known">
          {t && (
            <section className="sec">
              <div className="sec-head">
                <h3>Summary</h3>
                <span className="label">AI-generated · check it against the complaint below</span>
              </div>
              <p className="txt"><MaskedText text={t.summary} /></p>
              {t.keyFacts.length > 0 && (
                <ul className="facts-list">{t.keyFacts.map((f, i) => <li key={i}><MaskedText text={f} /></li>)}</ul>
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
                <summary>Policy that applies ({r.retrieved.length} clauses, found by code, not by the AI)</summary>
                <div className="tw">
                  <table className="dt refs">
                    <thead><tr><th scope="col">Policy</th><th scope="col">What it says</th></tr></thead>
                    <tbody>
                      {r.retrieved.map((ref) => (
                        <tr key={ref.id}>
                          <td><CitationChip id={ref.id} clauses={data.clauses} /></td>
                          <td><MaskedText text={data.clauses[ref.id]?.text ?? ""} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          )}
        </div>

        <div className="col" aria-label="Reply, checks and decision">
          {r && (isLetterDue(d, state.status) || state.letterApproved) && (
            <section className="sec"><LetterBox c={c} data={data} state={state} act={act} /></section>
          )}

          {letterOwed ? (
            <section className="sec">
              <details>
                <summary>Draft reply, for after the delay letter</summary>
                <p className="note">The delay letter above is what is owed now. The reply below is kept for when the investigation is complete.</p>
              </details>
            </section>
          ) : draftSection}

          {r ? (
            !letterOwed && (
              <section className="sec">
                <DecisionPanel c={c} data={data} role={role} state={state} checks={checks} draft={draft} act={act} openedAt={openedAt} />
              </section>
            )
          ) : (
            <section className="sec"><p className="banner">No stored AI output for this case yet.</p></section>
          )}

          {r && (
            <section className="sec">
              <details>
                <summary>All {checks.length} checks and the rules they support</summary>
                <ChecksTable checks={checks} basis={data.checkBasis} only="all" />
              </details>
            </section>
          )}

          <section className="sec">
            <details>
              <summary>What happened to this case ({events.length} events)</summary>
              <div className="tw">
                <table className="dt">
                  <thead><tr><th scope="col">When</th><th scope="col">What happened</th><th scope="col">Who</th><th scope="col">Detail</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => {
                      const v = describeEvent(e, data.clauses);
                      return <tr key={i}><td className="when">{fmtDateTime(e.ts)}</td><td><b>{v.what}</b></td><td>{v.who}</td><td>{v.detail}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </div>
      </div>
    </article>
  );
}

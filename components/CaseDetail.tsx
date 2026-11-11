"use client";
import { useState, type ReactNode } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { describeEvent } from "@/lib/audit-copy";
import { deadlineTone, dueText, effectiveChecks, effectiveDraft, handoverPackFor, statusLabel, statusTone, type Tone } from "@/lib/case-helpers";
import { fmtDate, fmtDateTime, gbp } from "@/lib/format";
import { isLetterDue, letterTypeFor } from "@/lib/letter";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { CheckSummary, ChecksTable } from "./ChecksPanel";
import { DecisionPanel } from "./DecisionPanel";
import type { GuideCase } from "./guide";
import { LetterBox } from "./LetterBox";
import { CitationChip, MaskedText, PageBand, Pill } from "./ui";

type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  onBack: () => void;
  guide: GuideCase[];
};

export function CaseDetail({ c, data, role, session, act, onBack, guide }: Props) {
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
  const letterName = (letterTypeFor(d) ?? "delay letter").toLowerCase();
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
    <section className="card accent">
      <div className="card-h flat">
        <h2>{draft ? (state.amended ? "Amended reply" : "Draft reply") : "No draft reply"}</h2>
        <span className="label">{draft ? (state.amended ? "Edited by the handler and re-checked · not sent" : "AI-generated · not sent") : "The handler writes this reply"}</span>
      </div>
      <div className="card-b">
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
      <details>
        <summary>All {checks.length} checks and the rules they support</summary>
        <ChecksTable checks={checks} basis={data.checkBasis} only="all" />
      </details>
      </div>
    </section>
  );

  const fields: [string, ReactNode][] = [
    ["Complaint about", t?.category ?? "Unclassified"],
    ["Product", c.product],
    ["Received", `${fmtDate(c.received)} by ${c.channel.toLowerCase()}`],
    ["Team", r?.route ?? "Not yet routed"],
    ["Reply type", r?.responseType ?? "Not decided"],
    ["Deadline rule", d ? <CitationChip id={d.basis} clauses={data.clauses} /> : "No deadline"],
    ["Clock", d ? `${d.total} ${d.unit} from receipt` : "—"],
    ["Approval needed from", r?.requiresSeniorCoApproval ? "Handler, then a senior" : "Handler"],
  ];
  const daysLeft = d ? d.total - d.used : null;
  const insights: [string, string, Tone][] = r ? [
    [`${checks.length - fails - refers}/${checks.length}`, "checks passed", fails ? "bad" : refers ? "warn" : "ok"],
    [String(r.retrieved.length), "policy clauses", ""],
    [String(r.tokenCount), "items masked", ""],
    ...(d && daysLeft !== null ? [[daysLeft < 0 ? String(-daysLeft) : String(daysLeft), `${Math.abs(daysLeft) === 1 ? d.unit.replace(/s$/, "") : d.unit} ${daysLeft < 0 ? "overdue" : "left"}`, dTone] as [string, string, Tone]] : []),
  ] : [];

  return (
    <article className="case" aria-label={`Case ${c.ref}`}>
      <PageBand icon="cases" title={c.ref}
        crumb={<><button type="button" className="crumb-link" onClick={onBack}>Cases</button> / View</>}
        end={d && (
          <div className={`due ${dTone === "bad" ? "late" : dTone === "warn" ? "soon" : ""}`}>
            <b>{dueText(d)}</b>
            <span>Due {fmtDate(d.due)} · {d.used > d.total ? `${d.total}-${d.unit.replace(/s$/, "")} deadline` : `${d.used} of ${d.total} ${d.unit} used`}</span>
          </div>
        )}>
        <span className="pills">
          <Pill tone={statusTone(state.status)}>{statusLabel(state.status, team)}</Pill>
          {t?.vulnerable && <Pill tone="vuln">Vulnerable customer</Pill>}
          {r?.requiresSeniorCoApproval && <Pill tone="warn">Needs a senior as well</Pill>}
          {fails > 0 && <Pill tone="bad">Approval locked</Pill>}
        </span>
      </PageBand>

      <div className="case-grid">
        <div className="case-main">
          <button type="button" className="back" onClick={onBack}>← Back to cases</button>
          {guide.map((g) => (
            <div key={g.title} className="banner info guide-banner">
              <b>Demo guide: {g.title}</b>
              <span><b>Look for:</b> {g.see}</span>
              {g.act && <span><b>Try:</b> {g.act}</span>}
            </div>
          ))}

          <section className="card">
            <div className="card-h"><h2>Overview</h2></div>
            <dl className="fieldgrid">
              {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>

          {steps.length > 0 && (
            <section className="card">
              <div className="card-h flat"><h2>How this case moved through the workbench</h2></div>
              <ol className="flow">
                {steps.map((s, i) => (
                  <li key={s.title} className={s.tone}>
                    <span className="step-n" aria-hidden="true">{i + 1}</span>
                    <span className="kind">{s.kind}</span>
                    <b>{s.title}</b>
                    <span className="res">{s.result}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {r && (isLetterDue(d, state.status) || state.letterApproved) && (
            <LetterBox c={c} data={data} state={state} act={act} />
          )}

          {letterOwed ? (
            <section className="card">
              <div className="card-b">
                <details>
                  <summary>Draft reply, for after the {letterName}</summary>
                  <p className="note">The {letterName} above is what is owed now. The reply below is kept for when the investigation is complete.</p>
                </details>
              </div>
            </section>
          ) : draftSection}

          {r ? (
            !letterOwed && (
              <section className="card decision-card">
                <div className="card-b">
                  <DecisionPanel c={c} data={data} role={role} state={state} checks={checks} draft={draft} act={act} openedAt={openedAt} />
                </div>
              </section>
            )
          ) : (
            <p className="banner">No stored AI output for this case yet.</p>
          )}

          {t && (
            <details className="card" open>
              <summary className="card-h">
                <h2>Summary</h2>
                <span className="label">AI-generated · check it against the complaint below</span>
              </summary>
              <div className="card-b">
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
              </div>
            </details>
          )}

          <details className="card" open>
            <summary className="card-h">
              <h2>Complaint as received</h2>
              <span className="label">Personal data masked before any AI step</span>
            </summary>
            <div className="card-b"><p className="txt"><MaskedText text={c.maskedText} /></p></div>
          </details>

          {c.maskedNotes.length > 0 && (
            <details className="card" open>
              <summary className="card-h"><h2>Case notes ({c.maskedNotes.length})</h2></summary>
              <ul className="notes">
                {c.maskedNotes.map((n) => (
                  <li key={n.id}>
                    <span className="when">{n.id} · {fmtDate(n.date)}</span>
                    <span className="txt"><MaskedText text={n.text} /></span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {r && r.retrieved.length > 0 && (
            <details className="card">
              <summary className="card-h"><h2>Policy that applies ({r.retrieved.length} clauses, found by code, not by the AI)</h2></summary>
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
          )}
        </div>

        <aside className="case-side" aria-label="Insights and history">
          {insights.length > 0 && (
            <section className="card">
              <div className="card-h flat"><h2>Insights</h2></div>
              <div className="insights">
                {insights.map(([value, label, tone]) => <div key={label}><b className={`stat-value ${tone}`}>{value}</b><span>{label}</span></div>)}
              </div>
            </section>
          )}
          <section className="card">
            <div className="card-h flat"><h2>History</h2><span className="label">{events.length} events</span></div>
            <ol className="timeline">
              {events.map((e, i) => {
                const v = describeEvent(e, data.clauses);
                return (
                  <li key={i}>
                    <span className="tl-dot" aria-hidden="true" />
                    <div>
                      <b>{v.what}</b>
                      {v.detail && <span className="tl-detail">{v.detail}</span>}
                      <span className="tl-who">{v.who} · {fmtDateTime(e.ts)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </article>
  );
}

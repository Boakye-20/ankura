"use client";
import { useState } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { effectiveChecks, effectiveDraft } from "@/lib/case-helpers";
import { fmtDate, gbp } from "@/lib/format";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { isLetterDue } from "@/lib/letter";
import { ChecksPanel } from "./ChecksPanel";
import { DecisionPanel } from "./DecisionPanel";
import { LetterBox } from "./LetterBox";
import { Box, CitationChip, MaskedText, Pill } from "./ui";

type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  onEscalated: (ref: string) => void;
};

export function CaseDetail({ c, data, role, session, act, onEscalated }: Props) {
  const [openedAt] = useState(() => Date.now()); // for the over-reliance prompt (approval under 20 seconds)
  const state = caseState(session, c.ref);
  const r = c.result;
  const t = r?.triage ?? null;
  const d = r?.deadline ?? null;
  const draft = effectiveDraft(c, state);
  const checks = effectiveChecks(c, state);

  return (
    <>
      <div className="casehead">
        <div className="t">
          <span className="ptitle">{c.product} · {t?.category ?? "Not classified"}</span>
          <b>{c.ref}</b>
        </div>
        <div className="fact"><span>Customer</span><b><span className="m">[CUSTOMER_1]</span></b></div>
        <div className="fact"><span>Channel</span><b>{c.channel}</b></div>
        <div className="fact"><span>Received</span><b>{fmtDate(c.received)}</b></div>
        <div className="fact"><span>Deadline basis</span><b>{d ? <CitationChip id={d.basis} clauses={data.clauses} /> : "Not set"}</b></div>
        <div className="fact"><span>Due</span><b>{d ? fmtDate(d.due) : "—"}</b></div>
        <div className="fact"><span>Elapsed</span><b>{d ? `${d.used} of ${d.total} ${d.unit}` : "—"}</b></div>
        <div className="fact"><span>Route</span><b>{r?.route ?? "—"}</b></div>
      </div>
      <div className="detail">
        <div className="panel">
          <Box title="Complaint as received" label={<span className="note">Personal data masked before AI processing</span>}>
            <p className="txt"><MaskedText text={c.maskedText} /></p>
            <ul className="plain" aria-label="Case notes">
              {c.maskedNotes.map((n) => (
                <li key={n.id}><span className="mono">{n.id}</span> · {fmtDate(n.date)} · <MaskedText text={n.text} /></li>
              ))}
            </ul>
          </Box>

          {!r && <p className="banner">No stored AI output for this case yet.</p>}

          {t && (
            <Box title="Case summary" tone="ai" label={<span className="ailabel">AI-generated · review required</span>}>
              <p className="txt"><MaskedText text={t.summary} /></p>
              <div className="conf">
                Classification confidence
                <span className="meter" aria-hidden="true"><i style={{ width: `${t.categoryConfidence * 100}%` }} /></span>
                <b>{t.categoryConfidence.toFixed(2)}</b>
                {r?.checks.some((k) => k.id === "CONF-01" && k.result === "Refer") && <Pill tone="warn">Below threshold: check</Pill>}
              </div>
              <dl className="kv">
                <dt>Category</dt><dd>{t.category}</dd>
                <dt>Payment services</dt><dd>{t.paymentServices ? "Yes (15 business days)" : "No"}</dd>
                <dt>Summary resolution</dt><dd>{t.summaryResolutionEligible ? "Eligible (3 business days)" : "No"}</dd>
                <dt>Response type</dt><dd>{r?.responseType ?? "—"}</dd>
              </dl>
              {t.vulnerable && (
                <div>
                  <span className="ptitle">Vulnerability indicators (FG21/1 drivers)</span>
                  <ul className="plain">
                    {t.vulnerabilityIndicators.map((v, i) => <li key={i}><Pill tone="bad">{v.driver}</Pill> {v.indicator}</li>)}
                  </ul>
                </div>
              )}
              {t.keyFacts.length > 0 && (
                <details>
                  <summary className="note">Key facts ({t.keyFacts.length})</summary>
                  <ul className="plain">{t.keyFacts.map((f, i) => <li key={i}><MaskedText text={f} /></li>)}</ul>
                </details>
              )}
            </Box>
          )}

          {r && (draft ? (
            <Box title="Proposed response" tone="ai" label={<span className="ailabel">{state.amended ? "Amended by handler · re-checked · not sent" : "Draft · not sent"}</span>}>
              <p className="txt">
                {draft.response.map((p, i) => (
                  <span key={i}><MaskedText text={p.text} />{p.citations.map((id) => <span key={id}> <CitationChip id={id} clauses={data.clauses} /></span>)}{i < draft.response.length - 1 ? " " : ""}</span>
                ))}
              </p>
              <p className="note">
                Proposed redress: {draft.proposedRedress
                  ? <>{gbp(draft.proposedRedress.amount)} · {draft.proposedRedress.basis} <CitationChip id={draft.proposedRedress.clause} clauses={data.clauses} /></>
                  : "none"}
              </p>
            </Box>
          ) : (
            <Box title="Proposed response" tone="blocked" label={<span>Withheld</span>}>
              <p className="txt">{r.draftWithheldReason ?? "No draft was produced."}</p>
            </Box>
          ))}

          {r?.draft?.handover && (
            <p className="note">An AI handover pack for {r.draft.handover.team} is ready. Choose Escalate to review and submit it.</p>
          )}

          {r && r.retrieved.length > 0 && (
            <Box title="Policy references retrieved" label={<span className="note">BM25 over policy library {data.versions.policyVersion} · score</span>}>
              <ul className="refs">
                {r.retrieved.map((ref) => (
                  <li key={ref.id}>
                    <span className="id"><CitationChip id={ref.id} clauses={data.clauses} /></span>
                    <span>{data.clauses[ref.id]?.text}</span>
                    <span className="score">{ref.score ? ref.score.toFixed(2) : "rule"}</span>
                  </li>
                ))}
              </ul>
              <p className="note">“rule” marks clauses always included: the deadline rule, FOS signposting and redress authority limits.</p>
            </Box>
          )}
        </div>
        <div className="panel">
          {r && (isLetterDue(d, state.status) || state.letterApproved) && <LetterBox c={c} data={data} state={state} act={act} />}
          {r && <ChecksPanel checks={checks} basis={data.checkBasis} amended={Boolean(state.amended)} draftWithheld={!draft} />}
          {r && <DecisionPanel c={c} data={data} role={role} state={state} checks={checks} draft={draft} act={act} openedAt={openedAt} onEscalated={onEscalated} />}
        </div>
      </div>
    </>
  );
}

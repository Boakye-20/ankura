"use client";
// The handover pack a specialist team receives (POL-10 §3.1): the issue, what has been done, what must be decided
// and what is missing. A handler can mark a missing item as not available, with a reason, before submitting.
import { useState } from "react";
import { handoverPackFor } from "@/lib/case-helpers";
import type { CaseView, ClauseInfo } from "@/lib/stored-types";
import { CitationChip, MaskedText, Pill } from "./ui";

type Props = {
  c: CaseView;
  clauses: Record<string, ClauseInfo>;
  unavailable: Record<string, string>;
  onMarkUnavailable?: (item: string, why: string) => void; // omit for a read-only pack
};

export function HandoverPack({ c, clauses, unavailable, onMarkUnavailable }: Props) {
  const { pack, fromAi } = handoverPackFor(c);
  const [marking, setMarking] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const source = (id: string) => (clauses[id] ? <CitationChip id={id} clauses={clauses} /> : <span className="label">{id}</span>);

  const save = (item: string) => {
    if (!why.trim()) return;
    onMarkUnavailable?.(item, why.trim());
    setMarking(null);
    setWhy("");
  };

  return (
    <div className="pack">
      <div className="pack-part">
        <span className="sub">The issue{fromAi ? " · AI-generated" : " · taken from the case notes, no AI pack for this case"}</span>
        <p className="txt"><MaskedText text={pack.issue} /></p>
      </div>

      {pack.actionsTaken.length > 0 && (
        <div className="pack-part">
          <span className="sub">Already done</span>
          <ul className="rows">
            {pack.actionsTaken.map((a, i) => <li key={i}><span className="label">{source(a.source)}</span><span><MaskedText text={a.text} /></span></li>)}
          </ul>
        </div>
      )}

      {pack.decisionsRequired.length > 0 && (
        <div className="pack-part">
          <span className="sub">For {pack.team} to decide</span>
          <ul className="rows">
            {pack.decisionsRequired.map((q, i) => <li key={i}><span className="label">Question {i + 1}</span><span><MaskedText text={q.question} /> {source(q.clause)}</span></li>)}
          </ul>
        </div>
      )}

      <div className="pack-part">
        <span className="sub">Needed before handover <CitationChip id="POL-10 §3.1" clauses={clauses} /></span>
        <ul className="rows wide">
          {pack.missingInformation.map((m) => (
            <li key={m}>
              <Pill tone={unavailable[m] ? "warn" : "bad"}>{unavailable[m] ? "Not available" : "Missing"}</Pill>
              <span>
                {m}
                {unavailable[m] && <span className="note"> · {unavailable[m]}</span>}
                {onMarkUnavailable && !unavailable[m] && marking !== m && (
                  <> <button type="button" className="btn small" onClick={() => { setMarking(m); setWhy(""); }}>Mark not available</button></>
                )}
                {marking === m && (
                  <span className="decision" style={{ marginTop: 8 }}>
                    <label className="sr-only" htmlFor={`why-${c.ref}`}>Why this is not available</label>
                    <input id={`why-${c.ref}`} type="text" placeholder="Why is this not available? The specialist will see your answer." value={why} onChange={(e) => setWhy(e.target.value)} />
                    <span className="btnrow">
                      <button type="button" className="btn small primary" disabled={!why.trim()} onClick={() => save(m)}>Save reason</button>
                      <button type="button" className="btn small" onClick={() => setMarking(null)}>Cancel</button>
                    </span>
                  </span>
                )}
              </span>
            </li>
          ))}
          {!pack.missingInformation.length && <li><Pill tone="ok">Complete</Pill><span>Everything the team needs is attached.</span></li>}
        </ul>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { caseState, STAFF, type Role, type Session, type useSession } from "@/lib/audit";
import { statusTone } from "@/lib/case-helpers";
import { fmtDate } from "@/lib/format";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import type { HandoverPack } from "@/lib/types";
import { Box, CitationChip, MaskedText, Pill } from "./ui";

const HANDOVER_STATUSES = ["Escalated", "With specialist", "Accepted by specialist", "Returned by specialist"];
const RETURN_REASONS = ["Information missing", "Wrong team", "Decision not clear", "Evidence not attached"];

type Props = {
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  selected: string | null;
  onSelect: (ref: string) => void;
  onOpenCase: (ref: string) => void;
};

/** The AI pack when there is one; otherwise a pack built from the case notes, labelled as such. */
function packFor(c: CaseView): { pack: HandoverPack; fromAi: boolean } {
  const ai = c.result?.draft?.handover;
  if (ai) return { pack: ai, fromAi: true };
  return {
    fromAi: false,
    pack: {
      team: c.result?.route ?? "Specialist team",
      issue: c.result?.triage?.summary ?? "Not summarised: read the complaint.",
      actionsTaken: c.maskedNotes.map((n) => ({ text: n.text, source: n.id })),
      decisionsRequired: [],
      missingInformation: ["Decision required from the specialist (no AI handover pack for this case)"],
    },
  };
}

export function HandoversView({ data, role, session, act, selected, onSelect, onOpenCase }: Props) {
  const escalated = data.cases.filter((c) => HANDOVER_STATUSES.includes(caseState(session, c.ref).status));
  const current = escalated.find((c) => c.ref === selected) ?? escalated[0] ?? null;

  if (!current) {
    return (
      <div className="panel">
        <div className="empty">
          <b>No escalated cases in this session.</b>
          <span>Open a case in My work queue, choose Escalate and give a reason. The handover pack then appears here.</span>
          <button className="btn" onClick={() => onOpenCase("CMP-2026-104712")}>Open CMP-2026-104712 (card payments, Fraud &amp; Disputes)</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="ptitle">Escalated cases · {escalated.length}</div>
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Reference</th><th>Team</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {escalated.map((c) => (
                <tr key={c.ref}>
                  <td><button type="button" className="cite" aria-current={c.ref === current.ref} onClick={() => onSelect(c.ref)}>{c.ref}</button></td>
                  <td>{packFor(c).pack.team}</td>
                  <td>{c.result?.deadline ? `${fmtDate(c.result.deadline.due)} (${c.result.deadline.basis})` : "Not set"}</td>
                  <td><Pill tone={statusTone(caseState(session, c.ref).status)}>{caseState(session, c.ref).status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pack key={current.ref} c={current} data={data} role={role} session={session} act={act} />
    </>
  );
}

function Pack({ c, data, role, session, act }: { c: CaseView; data: WorkbenchData; role: Role; session: Session; act: Props["act"] }) {
  const state = caseState(session, c.ref);
  const { pack, fromAi } = packFor(c);
  const unavailable = state.unavailable ?? {};
  const [marking, setMarking] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const outstanding = pack.missingInformation.filter((m) => !unavailable[m]);
  const d = c.result?.deadline;
  const actor = STAFF[role].actor;
  const chip = (id: string) => (data.clauses[id] ? <CitationChip id={id} clauses={data.clauses} /> : <span className="mono">{id}</span>);

  const markUnavailable = (item: string) => {
    if (!why.trim()) return;
    act(c.ref, actor, "Missing item marked not available", `${item}: ${why.trim()}`, { unavailable: { ...unavailable, [item]: why.trim() } });
    setMarking(null);
    setWhy("");
  };

  return (
    <>
      <div className="casehead">
        <div className="t"><span className="ptitle">Handover pack · {pack.team}</span><b>{c.ref}</b></div>
        <div className="fact"><span>Deadline</span><b>{d ? <>{d.total} {d.unit} (<CitationChip id={d.basis} clauses={data.clauses} />)</> : "Not set"}</b></div>
        <div className="fact"><span>Due</span><b>{d ? fmtDate(d.due) : "—"}</b></div>
        <div className="fact"><span>Elapsed</span><b>{d ? `${d.used} of ${d.total}` : "—"}</b></div>
        <div className="fact"><span>Pack</span><b><Pill tone={outstanding.length ? "warn" : "ok"}>{outstanding.length ? "Incomplete" : "Complete"}</Pill></b></div>
      </div>
      <div className="panel">
        {!fromAi && <p className="banner">No AI handover pack was produced for this case, so this pack is built from the case notes. Complete it before submitting.</p>}
        <div className="grid2">
          <Box title="Customer's issue" tone={fromAi ? "ai" : undefined} label={fromAi ? <span className="ailabel">AI-generated · review required</span> : undefined}>
            <p className="txt"><MaskedText text={pack.issue} /></p>
          </Box>
          <Box title="Actions already taken">
            <ul className="checks">
              {pack.actionsTaken.map((a, i) => <li key={i}><Pill tone="ok">Done</Pill><span><MaskedText text={a.text} /> · {chip(a.source)}</span></li>)}
              {!pack.actionsTaken.length && <li><span /> <span className="note">None recorded</span></li>}
            </ul>
          </Box>
          <Box title="Decision required from specialist">
            <ul className="checks">
              {pack.decisionsRequired.map((q, i) => <li key={i}><Pill>Q{i + 1}</Pill><span><MaskedText text={q.question} /> {chip(q.clause)}</span></li>)}
              {!pack.decisionsRequired.length && <li><span /> <span className="note">Not stated: add it in a comment when submitting.</span></li>}
            </ul>
          </Box>
          <Box title="Missing information" tone={outstanding.length ? "blocked" : undefined} label={outstanding.length ? <span>Blocks submission</span> : <span className="note">Resolved</span>}>
            <ul className="checks">
              {pack.missingInformation.map((m) => (
                <li key={m}>
                  <Pill tone={unavailable[m] ? "warn" : "bad"}>{unavailable[m] ? "N/A" : "Missing"}</Pill>
                  <span>
                    {m}{unavailable[m] && <span className="note"> · Not available: {unavailable[m]}</span>}
                    {role === "Handler" && !unavailable[m] && marking !== m && <> <button className="btn small" onClick={() => { setMarking(m); setWhy(""); }}>Mark not available</button></>}
                    {marking === m && (
                      <span className="decision">
                        <label className="sr-only" htmlFor={`why-${c.ref}`}>Reason it is not available</label>
                        <input id={`why-${c.ref}`} type="text" placeholder="Reason it is not available (mandatory)" value={why} onChange={(e) => setWhy(e.target.value)} />
                        <span className="btnrow"><button className="btn small primary" disabled={!why.trim()} onClick={() => markUnavailable(m)}>Save</button><button className="btn small" onClick={() => setMarking(null)}>Cancel</button></span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {!pack.missingInformation.length && <li><Pill tone="ok">None</Pill><span>No missing information identified</span></li>}
            </ul>
            <p className="note">Each item must be supplied or marked not available with a reason before submission (<CitationChip id="POL-10 §3.1" clauses={data.clauses} />). Attaching evidence is out of scope for this prototype.</p>
          </Box>
        </div>
        {message && <p className="msg" role="status">{message}</p>}
        {role === "Handler" && (state.status === "Escalated" || state.status === "Returned by specialist") && (
          <div className="btnrow">
            <button className="btn primary" disabled={outstanding.length > 0} onClick={() => {
              act(c.ref, actor, "Handover submitted", `to ${pack.team}${Object.keys(unavailable).length ? ` · ${Object.keys(unavailable).length} item(s) marked not available` : " · complete"}`, { status: "With specialist" });
              setMessage(`Submitted to ${pack.team}.`);
            }}>Submit to {pack.team}</button>
            {outstanding.length > 0 && <span className="note">{outstanding.length} item(s) still missing.</span>}
          </div>
        )}
        {role === "Specialist" && state.status === "With specialist" && (
          <div className="decision" style={{ maxWidth: 420 }}>
            <label className="ptitle" htmlFor={`ret-${c.ref}`}>Return reason (mandatory to return)</label>
            <select id={`ret-${c.ref}`} value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <div className="btnrow">
              <button className="btn primary" onClick={() => { act(c.ref, actor, "Accepted by specialist", `${pack.team} accepted the handover`, { status: "Accepted by specialist" }); setMessage("Accepted."); }}>Accept handover</button>
              <button className="btn" disabled={!returnReason} onClick={() => { act(c.ref, actor, "Returned by specialist", `${returnReason} · counted as a handover return (POL-10 §3.2)`, { status: "Returned by specialist" }); setMessage("Returned to the handler. Returns are counted on the Model assurance page."); }}>Return to handler</button>
            </div>
          </div>
        )}
        {role !== "Specialist" && state.status === "With specialist" && <p className="note">Waiting for the specialist. Switch the role to Specialist to accept or return it.</p>}
        {role === "Specialist" && state.status === "Escalated" && <p className="note">The handler has not submitted this pack yet.</p>}
      </div>
    </>
  );
}

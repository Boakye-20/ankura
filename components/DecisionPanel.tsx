"use client";
import { useState } from "react";
import { STAFF, type CaseState, type Role, type useSession } from "@/lib/audit";
import { draftToText, handoverPackFor, needsCoApproval, textToDraft } from "@/lib/case-helpers";
import type { CaseView, VerifyResponse, WorkbenchData } from "@/lib/stored-types";
import type { Check, DraftOutput, DraftPart } from "@/lib/types";
import { AmendEditor } from "./AmendEditor";
import { Box, CitationChip, MaskedText, Pill } from "./ui";

type Decision = "approve" | "amend" | "escalate";
const REASONS: Record<Decision, string[]> = {
  approve: ["Agree with proposed outcome", "Checked against case notes and policy", "Tone and wording checked"],
  amend: ["Tone or wording amended", "Factual error corrected", "Citation corrected", "Outcome changed after review"],
  escalate: ["Specialist decision required", "Outside handler authority", "Information missing", "Vulnerability needs tailored support"],
};
const SENIOR_REASONS = ["Agree with handler's decision", "Vulnerability support confirmed", "Redress level confirmed", "Needs changes before release"];
const RETURN_REASONS = ["Information missing", "Wrong team", "Decision not clear", "Evidence not attached"];
const OVER_RELIANCE_SECONDS = 20;
const HANDLER_CAN_ACT = ["Open", "Returned to handler", "Returned by specialist"];

type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  state: CaseState;
  checks: Check[];
  draft: { response: DraftPart[]; proposedRedress: DraftOutput["proposedRedress"] } | null;
  act: ReturnType<typeof useSession>["act"];
  openedAt: number;
  onEscalated?: (ref: string) => void;
};

export function DecisionPanel({ c, data, role, state, checks, draft, act, openedAt }: Props) {
  const [decision, setDecision] = useState<Decision | null>(() => {
    if (c.result?.draft?.handover && (!draft || checks.some((k) => k.result === "Fail"))) return "escalate";
    return null;
  });
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "" | "err" | "warn" } | null>(null);
  const [prompting, setPrompting] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [editorText, setEditorText] = useState(() => draftToText(draft?.response ?? []));
  const [redress, setRedress] = useState(draft?.proposedRedress ? String(draft.proposedRedress.amount) : "");
  const [busy, setBusy] = useState(false);

  // Handover pack checklist state
  const { pack, fromAi } = handoverPackFor(c);
  const unavailable = state.unavailable ?? {};
  const [marking, setMarking] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const actor = STAFF[role].actor;
  const blocked = checks.some((k) => k.result === "Fail");
  const coApproval = needsCoApproval(c, checks);
  const team = pack.team;
  const outstanding = pack.missingInformation.filter((m) => !unavailable[m]);
  const detail = (extra: string) => [reason, comment.trim() && `“${comment.trim()}”`, extra].filter(Boolean).join(" · ");
  const chip = (id: string) => (data.clauses[id] ? <CitationChip id={id} clauses={data.clauses} /> : <span className="mono">{id}</span>);

  const markUnavailable = (item: string) => {
    if (!why.trim()) return;
    act(c.ref, actor, "Missing item marked not available", `${item}: ${why.trim()}`, { unavailable: { ...unavailable, [item]: why.trim() } });
    setMarking(null);
    setWhy("");
  };

  // --- SPECIALIST ROLE ---
  if (role === "Specialist") {
    if (state.status !== "With specialist") {
      return (
        <Box title="Specialist review">
          {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
          <p className="note">
            Status: <b>{state.status}</b>. Specialists review cases once a handler has completed the handover checklist and submitted the pack to {team}.
          </p>
        </Box>
      );
    }
    return (
      <Box title={`Specialist handover · ${team}`}>
        <div className="decision">
          <div className="handover-inline">
            <div className="ho-sec">
              <span className="ptitle">Customer&apos;s issue {fromAi && <span className="ailabel">· AI-generated</span>}</span>
              <p className="txt"><MaskedText text={pack.issue} /></p>
            </div>
            <div className="ho-sec">
              <span className="ptitle">Actions already taken</span>
              <ul className="checks">
                {pack.actionsTaken.map((a, i) => <li key={i}><Pill tone="ok">Done</Pill><span><MaskedText text={a.text} /> · {chip(a.source)}</span></li>)}
                {!pack.actionsTaken.length && <li><span className="note">None recorded</span></li>}
              </ul>
            </div>
            <div className="ho-sec">
              <span className="ptitle">Decision required from {team}</span>
              <ul className="checks">
                {pack.decisionsRequired.map((q, i) => <li key={i}><Pill tone="info">Q{i + 1}</Pill><span><MaskedText text={q.question} /> {chip(q.clause)}</span></li>)}
                {!pack.decisionsRequired.length && <li><span className="note">See handler comment in history.</span></li>}
              </ul>
            </div>
            {pack.missingInformation.length > 0 && (
              <div className="ho-sec">
                <span className="ptitle">Information notes</span>
                <ul className="checks">
                  {pack.missingInformation.map((m) => (
                    <li key={m}>
                      <Pill tone={unavailable[m] ? "warn" : "bad"}>{unavailable[m] ? "N/A" : "Missing"}</Pill>
                      <span>{m}{unavailable[m] && <span className="note"> · Handler note: {unavailable[m]}</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <label className="ptitle" htmlFor={`ret-${c.ref}`}>If returning to handler, select a reason (mandatory to return)</label>
          <select id={`ret-${c.ref}`} value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
            <option value="">Select return reason (only if returning)</option>
            {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
          <div className="btnrow">
            <button className="btn primary" onClick={() => {
              act(c.ref, actor, "Accepted by specialist", `${team} accepted the handover`, { status: "Accepted by specialist" });
              setMessage({ text: `Handover accepted by ${STAFF.Specialist.name} (${team}).`, tone: "" });
            }}>Accept handover</button>
            <button className="btn" disabled={!returnReason} onClick={() => {
              act(c.ref, actor, "Returned by specialist", `${returnReason} · counted as a handover return (POL-10 §3.2)`, { status: "Returned by specialist" });
              setMessage({ text: "Returned to the handler. Returns are counted in Governance & assurance.", tone: "warn" });
            }}>Return to handler</button>
          </div>
        </div>
      </Box>
    );
  }

  // --- SENIOR HANDLER ROLE ---
  if (role === "Senior") {
    if (state.status !== "Awaiting senior co-approval") {
      return (
        <Box title="Senior co-approval">
          {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
          <p className="note">Status: <b>{state.status}</b>. Senior sign-off is needed when a handler approves a case with vulnerability indicators or redress above £250.</p>
        </Box>
      );
    }
    const seniorAct = (approve: boolean) => {
      if (!reason) return setMessage({ text: "Select a reason before submitting.", tone: "err" });
      act(c.ref, actor, approve ? "Co-approved" : "Returned to handler", detail(approve ? "POL-07 §2.2 co-approval · not sent: approval changes status only" : "back to the handler"),
        { status: approve ? "Co-approved" : "Returned to handler" });
      setMessage({ text: approve ? `Co-approved by ${STAFF.Senior.name}.` : "Returned to the handler.", tone: "" });
    };
    return (
      <Box title="Senior co-approval">
        <div className="decision">
          <p className="note">The handler approved this draft. Check the vulnerability indicators, the redress and the citations before co-approving.</p>
          <label className="ptitle" htmlFor="sreason">Reason (mandatory, recorded in the audit trail)</label>
          <select id="sreason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {SENIOR_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="sr-only" htmlFor="scomment">Comment</label>
          <textarea id="scomment" placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
          <div className="btnrow">
            <button className="btn primary" disabled={blocked} onClick={() => seniorAct(true)}>Co-approve response</button>
            <button className="btn" onClick={() => seniorAct(false)}>Return to handler</button>
          </div>
        </div>
      </Box>
    );
  }

  // --- HANDLER ROLE ---
  if (state.status === "Escalated") {
    return (
      <Box title={`Handover pack for ${team}`}>
        <div className="decision">
          <p className="note">Resolve any missing information below before sending to {team}.</p>
          <ul className="checks">
            {pack.missingInformation.map((m) => (
              <li key={m}>
                <Pill tone={unavailable[m] ? "warn" : "bad"}>{unavailable[m] ? "N/A" : "Missing"}</Pill>
                <span>
                  {m}{unavailable[m] && <span className="note"> · Not available: {unavailable[m]}</span>}
                  {!unavailable[m] && marking !== m && <> <button className="btn small" onClick={() => { setMarking(m); setWhy(""); }}>Mark not available</button></>}
                  {marking === m && (
                    <span className="decision" style={{ marginTop: 6 }}>
                      <input type="text" placeholder="Why is this not available? (mandatory)" value={why} onChange={(e) => setWhy(e.target.value)} />
                      <span className="btnrow">
                        <button className="btn small primary" disabled={!why.trim()} onClick={() => markUnavailable(m)}>Save</button>
                        <button className="btn small" onClick={() => setMarking(null)}>Cancel</button>
                      </span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="btnrow">
            <button className="btn primary" disabled={outstanding.length > 0} onClick={() => {
              act(c.ref, actor, "Handover submitted", `to ${team} · ${Object.keys(unavailable).length} item(s) marked not available`, { status: "With specialist" });
              setMessage({ text: `Handover pack submitted to ${team}. Switch role to Specialist (top right) to review it.`, tone: "" });
            }}>Submit handover to {team}</button>
          </div>
        </div>
      </Box>
    );
  }

  if (!HANDLER_CAN_ACT.includes(state.status)) {
    return (
      <Box title="Your decision">
        {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
        <p className="note">
          Status: <b>{state.status}</b>.
          {state.status === "Awaiting senior co-approval" && " Switch role to Senior Handler (top right) to co-approve or return this case."}
          {state.status === "With specialist" && ` Switch role to Specialist (top right) to review the handover pack for ${team}.`}
          {(state.status === "Approved" || state.status === "Co-approved" || state.status === "Accepted by specialist") && " This case is complete in this prototype."}
        </p>
      </Box>
    );
  }

  const approve = () => {
    act(c.ref, actor, "Approved", detail(`draft ${state.amended ? "amended" : "unchanged"}${coApproval ? " · sent for senior co-approval" : " · not sent: approval changes status only"}`),
      { status: coApproval ? "Awaiting senior co-approval" : "Approved" });
    setMessage({ text: coApproval ? "Submitted for senior co-approval. Switch role to Senior Handler (top right) to sign off." : `Approved by ${STAFF.Handler.name}. Nothing is sent to the customer from this prototype.`, tone: "" });
    setPrompting(null);
  };

  const amend = async () => {
    const response = textToDraft(editorText);
    if (!response.length) return setMessage({ text: "The amended draft is empty.", tone: "err" });
    const amount = redress.trim() === "" ? null : Number(redress);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return setMessage({ text: "Enter redress as a number of pounds, or leave it blank.", tone: "err" });
    const proposedRedress = amount === null ? null : { amount, basis: draft?.proposedRedress?.basis ?? "Set by handler", clause: draft?.proposedRedress?.clause ?? "POL-05 §1.2" };
    setBusy(true);
    try {
      const res = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: c.ref, response, proposedRedress }) });
      if (!res.ok) throw new Error();
      const { checks: newChecks } = (await res.json()) as VerifyResponse;
      const fails = newChecks.filter((k) => k.result === "Fail").length;
      const refers = newChecks.filter((k) => k.result === "Refer").length;
      act(c.ref, actor, "Amended", detail(`checks re-run: ${fails} fail, ${refers} refer`), { amended: { response, proposedRedress, checks: newChecks } });
      setMessage({ text: `Amendment saved and checks re-run: ${fails} fail, ${refers} refer.${fails ? " Approve stays locked until every check passes or refers." : " You can now approve the amended draft."}`, tone: fails ? "warn" : "" });
      setDecision(fails ? null : "approve");
      setReason("");
    } catch {
      setMessage({ text: "The checks could not be re-run. Try again.", tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!decision || !reason) return setMessage({ text: "Select an action and a reason before submitting.", tone: "err" });
    if (decision === "approve") {
      const seconds = Math.round((Date.now() - openedAt) / 1000);
      if (seconds < OVER_RELIANCE_SECONDS) {
        act(c.ref, actor, "Over-reliance prompt shown", `Approve submitted ${seconds} seconds after opening the case`);
        setConfirmed(false);
        return setPrompting(seconds);
      }
      return approve();
    }
    if (decision === "amend") return void amend();
    // Escalate: if all missing items are resolved, submit directly to specialist!
    if (outstanding.length > 0) {
      return setMessage({ text: `Resolve ${outstanding.length} missing handover item(s) below before submitting to ${team}.`, tone: "err" });
    }
    act(c.ref, actor, "Escalated", detail(`handover pack to ${team}`), { status: "Escalated" });
    act(c.ref, actor, "Handover submitted", `to ${team}${Object.keys(unavailable).length ? ` · ${Object.keys(unavailable).length} item(s) marked not available` : " · complete"}`, { status: "With specialist" });
    setMessage({ text: `Handover pack submitted to ${team}. Switch role to Specialist (top right) to accept or return it.`, tone: "" });
  };

  const confirmAndApprove = () => {
    act(c.ref, actor, "Over-reliance prompt confirmed", `${prompting} seconds from opening the case to approval; handler confirmed they read the draft and its citations`);
    approve();
  };

  const option = (value: Decision, label: string, disabled = false, why?: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={decision === value}
      disabled={disabled}
      title={why}
      className={`seg-btn ${decision === value ? "active" : ""}`}
      onClick={() => { setDecision(value); setReason(""); setMessage(null); setPrompting(null); }}
    >
      {label}
    </button>
  );

  return (
    <div className="decision">
      <div className="seg-group" role="radiogroup" aria-label="Choose action">
        {option("approve", coApproval ? "Approve (needs senior)" : "Approve reply", !draft || blocked, !draft ? "There is no draft to approve" : blocked ? "A check failed" : undefined)}
        {option("amend", "Edit & re-check")}
        {option("escalate", `Escalate to ${team}`)}
      </div>

      {decision === "amend" && <AmendEditor text={editorText} onText={setEditorText} redress={redress} onRedress={setRedress} clauses={data.clauses} />}

      {decision === "escalate" && (
        <div className="handover-inline">
          <div className="ho-head">
            <b>Handover pack for {team}</b>
            <Pill tone={outstanding.length ? "warn" : "ok"}>{outstanding.length ? `${outstanding.length} missing item(s)` : "Ready to send"}</Pill>
          </div>
          {!fromAi && <p className="note">Built from case notes (no AI handover pack was produced for this case).</p>}
          <div className="ho-sec">
            <span className="ptitle">Issue summary</span>
            <p className="txt"><MaskedText text={pack.issue} /></p>
          </div>
          {pack.actionsTaken.length > 0 && (
            <div className="ho-sec">
              <span className="ptitle">Actions already taken ({pack.actionsTaken.length})</span>
              <ul className="checks">
                {pack.actionsTaken.map((a, i) => <li key={i}><Pill tone="ok">Done</Pill><span><MaskedText text={a.text} /> · {chip(a.source)}</span></li>)}
              </ul>
            </div>
          )}
          {pack.decisionsRequired.length > 0 && (
            <div className="ho-sec">
              <span className="ptitle">Questions for {team}</span>
              <ul className="checks">
                {pack.decisionsRequired.map((q, i) => <li key={i}><Pill tone="info">Q{i + 1}</Pill><span><MaskedText text={q.question} /> {chip(q.clause)}</span></li>)}
              </ul>
            </div>
          )}
          <div className="ho-sec">
            <span className="ptitle">Required before handover (<CitationChip id="POL-10 §3.1" clauses={data.clauses} />)</span>
            <ul className="checks">
              {pack.missingInformation.map((m) => (
                <li key={m}>
                  <Pill tone={unavailable[m] ? "warn" : "bad"}>{unavailable[m] ? "N/A" : "Missing"}</Pill>
                  <span>
                    {m}{unavailable[m] && <span className="note"> · Marked not available: {unavailable[m]}</span>}
                    {!unavailable[m] && marking !== m && (
                      <> <button type="button" className="btn small" onClick={() => { setMarking(m); setWhy(""); }}>Mark not available</button></>
                    )}
                    {marking === m && (
                      <span className="decision" style={{ marginTop: 6 }}>
                        <label className="sr-only" htmlFor={`why-${c.ref}`}>Reason it is not available</label>
                        <input id={`why-${c.ref}`} type="text" placeholder="Why is this not available? (mandatory)" value={why} onChange={(e) => setWhy(e.target.value)} />
                        <span className="btnrow">
                          <button type="button" className="btn small primary" disabled={!why.trim()} onClick={() => markUnavailable(m)}>Save reason</button>
                          <button type="button" className="btn small" onClick={() => setMarking(null)}>Cancel</button>
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {!pack.missingInformation.length && <li><Pill tone="ok">Complete</Pill><span>All required information is attached.</span></li>}
            </ul>
          </div>
        </div>
      )}

      {decision && (
        <div className="reason-row">
          <div className="field">
            <label className="ptitle" htmlFor={`reason-${c.ref}`}>Reason for {decision === "approve" ? "approval" : decision === "amend" ? "amendment" : "escalation"} (recorded in audit log)</label>
            <select id={`reason-${c.ref}`} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {REASONS[decision].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="ptitle" htmlFor={`comment-${c.ref}`}>Optional note</label>
            <input id={`comment-${c.ref}`} type="text" placeholder="Add context for audit or handover…" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
      )}

      {prompting !== null && (
        <div className="prompt" role="alertdialog" aria-labelledby={`orp-${c.ref}`}>
          <b id={`orp-${c.ref}`}>Fast approval check ({prompting}s since opening case)</b>
          <span>To prevent over-reliance on AI drafts, please confirm you have verified the facts and policy citations against the customer&apos;s complaint.</span>
          <label><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I have read the draft and verified its policy citations.</label>
          <div className="btnrow">
            <button className="btn primary" disabled={!confirmed} onClick={confirmAndApprove}>Confirm &amp; approve</button>
            <button className="btn" onClick={() => setPrompting(null)}>Go back</button>
          </div>
        </div>
      )}

      {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}

      {decision && prompting === null && (
        <div className="btnrow">
          <button
            className="btn primary"
            onClick={submit}
            disabled={busy || (decision === "escalate" && outstanding.length > 0)}
          >
            {busy
              ? "Running verification checks…"
              : decision === "approve"
                ? (coApproval ? "Approve & send to Senior" : "Approve response")
                : decision === "amend"
                  ? "Save & re-run checks"
                  : `Submit handover to ${team}`}
          </button>
          {decision === "escalate" && outstanding.length > 0 && (
            <span className="note">Resolve {outstanding.length} missing item(s) above to unlock submission.</span>
          )}
        </div>
      )}
    </div>
  );
}

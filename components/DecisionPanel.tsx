"use client";
import { useState } from "react";
import { STAFF, type CaseState, type Role, type useSession } from "@/lib/audit";
import { draftToText, needsCoApproval, textToDraft } from "@/lib/case-helpers";
import type { CaseView, VerifyResponse, WorkbenchData } from "@/lib/stored-types";
import type { Check, DraftOutput, DraftPart } from "@/lib/types";
import { AmendEditor } from "./AmendEditor";
import { Box } from "./ui";

type Decision = "approve" | "amend" | "escalate";
const REASONS: Record<Decision, string[]> = {
  approve: ["Agree with proposed outcome", "Checked against case notes and policy", "Tone and wording checked"],
  amend: ["Tone or wording amended", "Factual error corrected", "Citation corrected", "Outcome changed after review"],
  escalate: ["Specialist decision required", "Outside handler authority", "Information missing", "Vulnerability needs tailored support"],
};
const SENIOR_REASONS = ["Agree with handler's decision", "Vulnerability support confirmed", "Redress level confirmed", "Needs changes before release"];
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
  onEscalated: (ref: string) => void;
};

export function DecisionPanel({ c, data, role, state, checks, draft, act, openedAt, onEscalated }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "" | "err" | "warn" } | null>(null);
  const [prompting, setPrompting] = useState<number | null>(null); // seconds, when the over-reliance prompt is showing
  const [confirmed, setConfirmed] = useState(false);
  const [editorText, setEditorText] = useState(() => draftToText(draft?.response ?? []));
  const [redress, setRedress] = useState(draft?.proposedRedress ? String(draft.proposedRedress.amount) : "");
  const [busy, setBusy] = useState(false);

  const actor = STAFF[role].actor;
  const blocked = checks.some((k) => k.result === "Fail");
  const coApproval = needsCoApproval(c, checks);
  const team = c.result?.draft?.handover?.team ?? (c.result?.route && c.result.route !== "Handler" && c.result.route !== "Senior" ? c.result.route : "Specialist team");
  const detail = (extra: string) => [reason, comment.trim() && `“${comment.trim()}”`, extra].filter(Boolean).join(" · ");

  if (role === "Specialist") {
    return <Box title="Decision"><p className="note">Specialists act on escalated cases in the Specialist handovers tab.</p></Box>;
  }

  if (role === "Senior") {
    if (state.status !== "Awaiting senior co-approval") {
      return <Box title="Senior co-approval">{message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}<p className="note">Status: {state.status}. Senior action is needed only when a handler has approved a case that requires co-approval (vulnerable customer, or redress above £250).</p></Box>;
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
            <button className="btn primary" disabled={blocked} onClick={() => seniorAct(true)}>Co-approve</button>
            <button className="btn" onClick={() => seniorAct(false)}>Return to handler</button>
          </div>
        </div>
      </Box>
    );
  }

  if (!HANDLER_CAN_ACT.includes(state.status)) {
    return <Box title="Handler decision">{message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}<p className="note">Status: {state.status}. No further handler action is needed in this prototype.</p></Box>;
  }

  const approve = () => {
    act(c.ref, actor, "Approved", detail(`draft ${state.amended ? "amended" : "unchanged"}${coApproval ? " · sent for senior co-approval" : " · not sent: approval changes status only"}`),
      { status: coApproval ? "Awaiting senior co-approval" : "Approved" });
    setMessage({ text: coApproval ? "Submitted. Awaiting senior co-approval." : `Approved by ${STAFF.Handler.name}. Nothing is sent to the customer from this prototype.`, tone: "" });
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
      setDecision(null);
      setReason("");
    } catch {
      setMessage({ text: "The checks could not be re-run. Try again.", tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!decision || !reason) return setMessage({ text: "Select a decision and a reason before submitting.", tone: "err" });
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
    act(c.ref, actor, "Escalated", detail(`handover pack to ${team}`), { status: "Escalated" });
    onEscalated(c.ref);
  };

  const confirmAndApprove = () => {
    act(c.ref, actor, "Over-reliance prompt confirmed", `${prompting} seconds from opening the case to approval; handler confirmed they read the draft and its citations`);
    approve();
  };

  const option = (value: Decision, label: string, disabled = false, why?: string) => (
    <label className={`radio ${disabled ? "disabled" : ""}`} title={why}>
      <input type="radio" name={`dec-${c.ref}`} value={value} disabled={disabled} checked={decision === value}
        onChange={() => { setDecision(value); setReason(""); setMessage(null); setPrompting(null); }} />
      {label}
    </label>
  );

  return (
    <Box title="Handler decision">
      <div className="decision">
        {option("approve", `Approve draft${coApproval ? " (sends to senior for co-approval)" : ""}`, !draft || blocked, !draft ? "There is no draft to approve" : blocked ? "A check failed" : undefined)}
        {option("amend", "Amend draft")}
        {option("escalate", `Escalate to ${team}`)}
        {decision === "amend" && <AmendEditor text={editorText} onText={setEditorText} redress={redress} onRedress={setRedress} clauses={data.clauses} />}
        <label className="ptitle" htmlFor={`reason-${c.ref}`}>Reason (mandatory, recorded in the audit trail)</label>
        <select id={`reason-${c.ref}`} value={reason} onChange={(e) => setReason(e.target.value)} disabled={!decision}>
          <option value="">{decision ? "Select a reason" : "Select a decision first"}</option>
          {decision && REASONS[decision].map((r) => <option key={r}>{r}</option>)}
        </select>
        <label className="sr-only" htmlFor={`comment-${c.ref}`}>Comment</label>
        <textarea id={`comment-${c.ref}`} placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        {prompting !== null && (
          <div className="prompt" role="alertdialog" aria-labelledby={`orp-${c.ref}`}>
            <b id={`orp-${c.ref}`}>You are approving {prompting} seconds after opening this case.</b>
            <span>Before approving, read the whole draft and open each citation to check it supports the statement. This confirmation is recorded in the audit trail.</span>
            <label><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I have read the draft and checked its citations.</label>
            <div className="btnrow">
              <button className="btn primary" disabled={!confirmed} onClick={confirmAndApprove}>Confirm and approve</button>
              <button className="btn" onClick={() => setPrompting(null)}>Go back and review</button>
            </div>
          </div>
        )}
        {message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>}
        {prompting === null && <div className="btnrow"><button className="btn primary" onClick={submit} disabled={busy}>{busy ? "Running checks…" : "Submit decision"}</button></div>}
        <p className="note">Approve is locked while any check fails. Nothing is ever sent to a customer: approval changes the status and writes an audit entry.</p>
      </div>
    </Box>
  );
}

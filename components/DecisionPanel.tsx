"use client";
// The human decision. The AI never decides: a named person approves, amends or escalates, with a reason,
// and every action writes an audit event. Nothing is sent to the customer from here.
import { useState } from "react";
import { STAFF, type CaseState, type Role, type useSession } from "@/lib/audit";
import { draftToText, handoverPackFor, needsCoApproval, textToDraft } from "@/lib/case-helpers";
import type { CaseView, VerifyResponse, WorkbenchData } from "@/lib/stored-types";
import type { Check, DraftOutput, DraftPart } from "@/lib/types";
import { AmendEditor } from "./AmendEditor";
import { HandoverPack } from "./HandoverPack";

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
const NOUN: Record<Decision, string> = { approve: "approval", amend: "amendment", escalate: "escalation" };

type Message = { text: string; tone: "" | "err" | "warn" };
type Props = {
  c: CaseView;
  data: WorkbenchData;
  role: Role;
  state: CaseState;
  checks: Check[];
  draft: { response: DraftPart[]; proposedRedress: DraftOutput["proposedRedress"] } | null;
  act: ReturnType<typeof useSession>["act"];
  openedAt: number;
};

export function DecisionPanel({ c, data, role, state, checks, draft, act, openedAt }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [prompting, setPrompting] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [editorText, setEditorText] = useState(() => draftToText(draft?.response ?? []));
  const [redress, setRedress] = useState(draft?.proposedRedress ? String(draft.proposedRedress.amount) : "");
  const [busy, setBusy] = useState(false);

  const { pack } = handoverPackFor(c);
  const unavailable = state.unavailable ?? {};
  const actor = STAFF[role].actor;
  const blocked = checks.some((k) => k.result === "Fail");
  const coApproval = needsCoApproval(c, checks);
  const team = pack.team;
  const outstanding = pack.missingInformation.filter((m) => !unavailable[m]);
  const marked = Object.keys(unavailable).length;
  const detail = (extra: string) => [reason, comment.trim() && `“${comment.trim()}”`, extra].filter(Boolean).join(" · ");
  const note = message && <p className={`msg ${message.tone}`} role="status">{message.text}</p>;

  const markUnavailable = (item: string, why: string) =>
    act(c.ref, actor, "Missing item marked not available", `${item}: ${why}`, { unavailable: { ...unavailable, [item]: why } });

  const submitHandover = () => {
    act(c.ref, actor, "Handover submitted", `to ${team}${marked ? ` · ${marked} item(s) marked not available` : " · complete"}`, { status: "With specialist" });
    setMessage({ text: `Handover pack submitted to ${team}. Switch to Specialist (top right) to accept or return it.`, tone: "" });
  };

  if (role === "Specialist") {
    if (state.status !== "With specialist") {
      return (
        <div className="decision">
          <h3>Specialist review</h3>
          {note}
          <p className="note">Status: {state.status}. A case reaches a specialist once a handler has completed the handover pack and submitted it to {team}.</p>
        </div>
      );
    }
    return (
      <div className="decision">
        <h3>Handover pack for {team}</h3>
        <HandoverPack c={c} clauses={data.clauses} unavailable={unavailable} />
        <div className="field">
          <label className="sub" htmlFor={`ret-${c.ref}`}>Reason, if you are returning it</label>
          <select id={`ret-${c.ref}`} value={returnReason(reason)} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        {note}
        <div className="btnrow">
          <button className="btn primary" onClick={() => {
            act(c.ref, actor, "Accepted by specialist", `${team} accepted the handover`, { status: "Accepted by specialist" });
            setMessage({ text: `Handover accepted by ${STAFF.Specialist.name} (${team}).`, tone: "" });
          }}>Accept handover</button>
          <button className="btn" disabled={!reason} onClick={() => {
            act(c.ref, actor, "Returned by specialist", `${reason} · counted as a handover return (POL-10 §3.2)`, { status: "Returned by specialist" });
            setMessage({ text: "Returned to the handler. Returns are counted under Governance and assurance, Adoption.", tone: "warn" });
          }}>Return to handler</button>
        </div>
      </div>
    );
  }

  if (role === "Senior") {
    if (state.status !== "Awaiting senior co-approval") {
      return (
        <div className="decision">
          <h3>Senior co-approval</h3>
          {note}
          <p className="note">Status: {state.status}. A senior signs off after a handler approves a case with signs of vulnerability, or redress above £250.</p>
        </div>
      );
    }
    const seniorAct = (approve: boolean) => {
      if (!reason) return setMessage({ text: "Select a reason first.", tone: "err" });
      act(c.ref, actor, approve ? "Co-approved" : "Returned to handler", detail(approve ? "POL-07 §2.2 co-approval · not sent: approval changes status only" : "back to the handler"),
        { status: approve ? "Co-approved" : "Returned to handler" });
      setMessage({ text: approve ? `Co-approved by ${STAFF.Senior.name}. Nothing is sent from this prototype.` : "Returned to the handler.", tone: "" });
    };
    return (
      <div className="decision">
        <h3>Senior co-approval</h3>
        <p className="note">The handler approved this reply. Check the signs of vulnerability, the redress and the clause references before you co-approve.</p>
        <div className="fields">
          <div className="field">
            <label className="sub" htmlFor="sreason">Reason (kept in the audit trail)</label>
            <select id="sreason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason</option>
              {SENIOR_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="sub" htmlFor="scomment">Note (optional)</label>
            <input id="scomment" type="text" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        {note}
        <div className="btnrow">
          <button className="btn primary" disabled={blocked} onClick={() => seniorAct(true)}>Co-approve reply</button>
          <button className="btn" onClick={() => seniorAct(false)}>Return to handler</button>
        </div>
      </div>
    );
  }

  // Handler. "Escalated" is a state left by an earlier version of this prototype: finish the handover from it.
  if (state.status === "Escalated") {
    return (
      <div className="decision">
        <h3>Handover pack for {team}</h3>
        <HandoverPack c={c} clauses={data.clauses} unavailable={unavailable} onMarkUnavailable={markUnavailable} />
        {note}
        <div className="btnrow">
          <button className="btn primary" disabled={outstanding.length > 0} onClick={submitHandover}>Submit handover to {team}</button>
        </div>
      </div>
    );
  }

  if (!HANDLER_CAN_ACT.includes(state.status)) {
    return (
      <div className="decision">
        <h3>Your decision</h3>
        {note}
        <p className="note">
          Status: {state.status}.
          {state.status === "Awaiting senior co-approval" && " Switch to Senior handler (top right) to co-approve or return this case."}
          {state.status === "With specialist" && ` Switch to Specialist (top right) to review the handover pack for ${team}.`}
          {(state.status === "Approved" || state.status === "Co-approved" || state.status === "Accepted by specialist") && " This case is complete in this prototype."}
        </p>
      </div>
    );
  }

  const approve = () => {
    act(c.ref, actor, "Approved", detail(`draft ${state.amended ? "amended" : "unchanged"}${coApproval ? " · sent for senior co-approval" : " · not sent: approval changes status only"}`),
      { status: coApproval ? "Awaiting senior co-approval" : "Approved" });
    setMessage({ text: coApproval ? "Sent for senior co-approval. Switch to Senior handler (top right) to sign it off." : `Approved by ${STAFF.Handler.name}. Nothing is sent to the customer from this prototype.`, tone: "" });
    setPrompting(null);
  };

  const amend = async () => {
    const response = textToDraft(editorText);
    if (!response.length) return setMessage({ text: "The amended reply is empty.", tone: "err" });
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
      setMessage(fails
        ? { text: `Saved. ${fails} check${fails === 1 ? "" : "s"} still failing, so approval stays locked. See Checks below.`, tone: "warn" }
        : { text: "Saved and re-checked. You can now approve the amended reply.", tone: "" });
      setDecision(fails ? null : "approve");
      setReason("");
    } catch {
      setMessage({ text: "The checks could not be re-run. Try again.", tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!decision || !reason) return setMessage({ text: "Select a reason first.", tone: "err" });
    if (decision === "amend") return void amend();
    if (decision === "escalate") {
      act(c.ref, actor, "Escalated", detail(`handover pack to ${team}`), { status: "Escalated" });
      return submitHandover();
    }
    const seconds = Math.round((Date.now() - openedAt) / 1000);
    if (seconds >= OVER_RELIANCE_SECONDS) return approve();
    act(c.ref, actor, "Over-reliance prompt shown", `Approve submitted ${seconds} seconds after opening the case`);
    setConfirmed(false);
    setPrompting(seconds);
  };

  const confirmAndApprove = () => {
    act(c.ref, actor, "Over-reliance prompt confirmed", `${prompting} seconds from opening the case to approval; handler confirmed they read the draft and its citations`);
    approve();
  };

  const choice = (value: Decision, label: string, disabledWhy?: string) => (
    <button type="button" role="radio" aria-checked={decision === value} disabled={Boolean(disabledWhy)} title={disabledWhy}
      onClick={() => { setDecision(value); setReason(""); setMessage(null); setPrompting(null); }}>
      {label}
    </button>
  );
  const waiting = decision === "escalate" && outstanding.length > 0;

  return (
    <div className="decision">
      <div className="sec-head">
        <h3>Your decision</h3>
        <span className="label">Recorded against {STAFF.Handler.name}. Nothing is sent to the customer.</span>
      </div>
      <div className="choices" role="radiogroup" aria-label="Choose what to do with this case">
        {choice("approve", coApproval ? "Approve, then senior" : "Approve", !draft ? "There is no draft to approve" : blocked ? "A check failed" : undefined)}
        {choice("amend", draft ? "Edit and re-check" : "Write the reply")}
        {choice("escalate", `Escalate to ${team}`)}
      </div>

      {decision === "amend" && <AmendEditor text={editorText} onText={setEditorText} redress={redress} onRedress={setRedress} clauses={data.clauses} />}
      {decision === "escalate" && <HandoverPack c={c} clauses={data.clauses} unavailable={unavailable} onMarkUnavailable={markUnavailable} />}

      {decision && (
        <div className="fields">
          <div className="field">
            <label className="sub" htmlFor={`reason-${c.ref}`}>Reason for {NOUN[decision]} (kept in the audit trail)</label>
            <select id={`reason-${c.ref}`} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason</option>
              {REASONS[decision].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="sub" htmlFor={`comment-${c.ref}`}>Note (optional)</label>
            <input id={`comment-${c.ref}`} type="text" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
      )}

      {prompting !== null && (
        <div className="confirm" role="alertdialog" aria-labelledby={`orp-${c.ref}`}>
          <b id={`orp-${c.ref}`}>You approved {prompting} seconds after opening this case.</b>
          <span>That is quicker than most people can read a reply and check its clause references against the complaint.</span>
          <label><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I have read the reply and checked its clause references.</label>
          <div className="btnrow">
            <button className="btn primary" disabled={!confirmed} onClick={confirmAndApprove}>Confirm and approve</button>
            <button className="btn" onClick={() => setPrompting(null)}>Go back</button>
          </div>
        </div>
      )}

      {note}

      {decision && prompting === null && (
        <div className="btnrow">
          <button className="btn primary" onClick={submit} disabled={busy || waiting}>
            {busy ? "Re-running checks"
              : decision === "approve" ? (coApproval ? "Approve and send to senior" : "Approve reply")
              : decision === "amend" ? "Save and re-run checks"
              : `Submit handover to ${team}`}
          </button>
          {waiting && <span className="note">{outstanding.length} item{outstanding.length === 1 ? " is" : "s are"} still missing. Attach each one or mark it not available.</span>}
        </div>
      )}
    </div>
  );
}

const returnReason = (reason: string) => (RETURN_REASONS.includes(reason) ? reason : "");

"use client";
// The letter owed at the DISP deadline. The handler completes it, the server checks it (LTR-01), then the handler
// approves it with a reason. Approval writes an audit entry; nothing is sent.
import { useState } from "react";
import { STAFF, type CaseState, type useSession } from "@/lib/audit";
import { letterTemplate, letterTypeFor } from "@/lib/letter";
import type { CaseView, VerifyResponse, WorkbenchData } from "@/lib/stored-types";
import type { Check } from "@/lib/types";
import { BasisList, Box, Pill } from "./ui";

const REASONS = ["Waiting for information from another team", "Waiting for information from the customer", "Investigation still in progress"];

type Props = { c: CaseView; data: WorkbenchData; state: CaseState; act: ReturnType<typeof useSession>["act"] };

export function LetterBox({ c, data, state, act }: Props) {
  const type = letterTypeFor(c.result?.deadline ?? null)!;
  const [text, setText] = useState(() => letterTemplate(type));
  const [check, setCheck] = useState<Check | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rule = type === "Eight-week letter" ? "DISP 1.6.2R(2)" : "DISP 1.6.2AR";

  if (state.letterApproved) {
    return <Box title={type}><p className="msg">{type} approved. Nothing is sent from this prototype; the final response is still due.</p></Box>;
  }

  const runCheck = async () => {
    setError(null);
    try {
      const res = await fetch("/api/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: c.ref, text }) });
      if (!res.ok) throw new Error();
      setCheck(((await res.json()) as VerifyResponse).checks[0]);
    } catch {
      setError("The letter could not be checked. Try again.");
    }
  };

  const approve = () => {
    if (!reason) return setError("Select a reason before approving.");
    act(c.ref, STAFF.Handler.actor, `${type} approved`, `${reason} · LTR-01 passed · ${rule} · not sent: approval changes status only`, { letterApproved: true });
  };

  return (
    <Box title={`${type} due`} tone="blocked" label={<span className="label">Deadline reached · {rule}</span>}>
      <p className="note">No final response was approved by the deadline, so this letter is owed. Replace the text in square brackets with the real reason and date. Code then checks the letter contains everything the rule requires.</p>
      <label className="sr-only" htmlFor={`letter-${c.ref}`}>{type} text</label>
      <textarea id={`letter-${c.ref}`} className="editor" value={text} maxLength={3000} onChange={(e) => { setText(e.target.value); setCheck(null); }} />
      <div className="btnrow"><button className="btn" onClick={runCheck}>Check letter</button></div>
      {check && (
        <ul className="rows">
          <li>
            <Pill tone={check.result === "Pass" ? "ok" : "bad"}>{check.result}</Pill>
            <span><span className="name">{check.label}</span> <span className="label">{check.id}</span><br /><span className="note">{check.detail}</span><br /><BasisList basis={data.checkBasis[check.id] ?? []} /></span>
          </li>
        </ul>
      )}
      <label className="sub" htmlFor={`lreason-${c.ref}`}>Reason for the delay (written into the letter and kept in the audit trail)</label>
      <select id={`lreason-${c.ref}`} value={reason} onChange={(e) => {
        const next = e.target.value;
        setReason(next);
        // Fill the bracket in the letter from the dropdown, so the reason is typed once.
        if (next) { setText((t) => t.replace(/\[reason for the delay\]|(?<=This is because )[^.\n]+/, next.charAt(0).toLowerCase() + next.slice(1))); setCheck(null); }
      }}>
        <option value="">Select a reason</option>
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      {error && <p className="msg err" role="status">{error}</p>}
      <div className="btnrow"><button className="btn primary" disabled={check?.result !== "Pass"} onClick={approve}>Approve letter</button></div>
    </Box>
  );
}

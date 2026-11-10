"use client";
// Risk, controls and oversight, for a reader who is not technical: what the AI may do, who decides, the checks
// code runs on every case and how often each one fired across the stored run. Counts come from the stored data only.
import { useMemo } from "react";
import { CHECK_COPY } from "@/lib/check-copy";
import type { WorkbenchData } from "@/lib/stored-types";
import { BasisList, Box } from "./ui";

const ROLES: [string, string, string][] = [
  ["Complaint handler", "Reads the complaint and the AI draft, checks each policy reference, then approves, edits or escalates with a reason.", "Every case."],
  ["Senior handler", "Gives a second approval and can send the case back.", "Signs of vulnerability, or redress above £250."],
  ["Specialist team", "Receives a handover pack with the issue, what has been done and what is missing, and can return it with a reason.", "Fraud, lending, vulnerability and complex cases."],
];

const MAY = [
  "Sort the complaint into a type and pick out the key facts",
  "Spot signs of vulnerability for a person to confirm",
  "Draft a reply, with the policy clause behind each claim",
  "Draft the handover pack for a specialist team",
];
const MAY_NOT = [
  "See a name, account number, contact detail or merchant",
  "Decide the outcome, approve anything or send anything",
  "Set or raise a redress amount",
  "Quote regulation: it only sees the bank's own policy",
];

export function ControlsView({ data, eventCount }: { data: WorkbenchData; eventCount: number }) {
  const rows = useMemo(() => {
    const withResult = data.cases.filter((c) => c.result);
    const order = [...new Set(withResult.flatMap((c) => c.result!.checks.map((k) => k.id)))];
    return order.map((id) => {
      const count = (result: string) => withResult.filter((c) => c.result!.checks.some((k) => k.id === id && k.result === result)).length;
      return { id, pass: count("Pass"), refer: count("Refer"), fail: count("Fail"), ran: withResult.filter((c) => c.result!.checks.some((k) => k.id === id)).length };
    });
  }, [data.cases]);
  const n = data.cases.filter((c) => c.result).length;

  return (
    <div className="panel">
      <p className="lead">
        The AI reads, sorts and drafts. It never decides, never sends and never sees personal data. Code checks every case before a person can approve it, and every step is written to the record.
      </p>

      <div className="cols2">
        <Box title="What the AI may do">
          <ul className="plain tick">{MAY.map((m) => <li key={m}>{m}</li>)}</ul>
        </Box>
        <Box title="What it may not do">
          <ul className="plain cross">{MAY_NOT.map((m) => <li key={m}>{m}</li>)}</ul>
        </Box>
      </div>

      <Box title="Who decides">
        <div className="tw">
          <table className="dt">
            <thead><tr><th scope="col">Role</th><th scope="col">What they do</th><th scope="col">What must come to them</th></tr></thead>
            <tbody>{ROLES.map(([role, does, when]) => <tr key={role}><td><b>{role}</b></td><td>{does}</td><td>{when}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="note">Approving changes the case status and writes to the record. Nothing is sent to a customer from this prototype.</p>
      </Box>

      <Box title={`The checks code runs on every case`} label={`How each one came out across the ${n} stored cases`}>
        <div className="tw">
          <table className="dt controls">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">In plain words</th>
                <th scope="col" className="num">Passed</th>
                <th scope="col" className="num">Needed a look</th>
                <th scope="col" className="num">Blocked</th>
                <th scope="col">Rule it supports</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{CHECK_COPY[r.id]?.name ?? r.id}</b><br /><span className="label">{r.id}</span></td>
                  <td>{CHECK_COPY[r.id]?.what}</td>
                  <td className="num">{r.pass}</td>
                  <td className={`num ${r.refer ? "warn" : ""}`}>{r.refer}</td>
                  <td className={`num ${r.fail ? "bad" : ""}`}>{r.fail}</td>
                  <td><BasisList basis={data.checkBasis[r.id] ?? []} prefix={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          "Blocked" means approval is locked until a person fixes the draft. "Needed a look" means a person must confirm before release. These are the controls working, and also a measure of how often a handler has to edit the AI's draft. Nothing here is a claim of legal compliance: each check shows the rule it is designed to support.
        </p>
      </Box>

      <Box title="What the record shows" label={`${eventCount} events so far`}>
        <p className="txt">
          Every AI step (masking, sorting, policy search, drafting, checks, routing) and every human decision is written to the record with who did it, when and why. The Audit trail section lists them and exports them as a spreadsheet. In this prototype your own actions are kept in this browser; a pilot needs a tamper-proof log on the server.
        </p>
      </Box>
    </div>
  );
}

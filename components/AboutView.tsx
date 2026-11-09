"use client";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { BasisList, Box, Pill } from "./ui";

const STEPS: [string, string, string][] = [
  ["Mask personal data", "Code replaces names, account numbers, contact details and merchants with tokens before any AI call.", "code"],
  ["Triage", "AI classifies the complaint, flags vulnerability (FG21/1 drivers) and sets the deadline type.", "ai"],
  ["Retrieve policy", "Code finds the relevant clauses in the bank's policy library (BM25 keyword search).", "code"],
  ["Draft", "AI drafts a reply and a handover pack, citing a clause ID for every factual statement.", "ai"],
  ["Verify", "Code checks citations, redress limits, FOS wording, plain language and injection attempts.", "code"],
  ["Human decision", "A named handler approves, amends or escalates, with a reason. Some cases need a senior.", "human"],
];

type Level = "High" | "Medium" | "Low";
// AI Strategy: opportunity assessment. Scores are the author's judgement, to be tested with the bank.
const OPPORTUNITIES: { area: string; value: Level; feasibility: Level; risk: Level; readiness: Level; decision: string }[] = [
  { area: "Triage and classification", value: "High", feasibility: "High", risk: "Medium", readiness: "High", decision: "In the MVP" },
  { area: "Policy retrieval", value: "High", feasibility: "High", risk: "Low", readiness: "High", decision: "In the MVP" },
  { area: "Drafting responses", value: "High", feasibility: "Medium", risk: "High", readiness: "Medium", decision: "In the MVP, behind code checks and human approval" },
  { area: "Specialist handover packs", value: "High", feasibility: "High", risk: "Medium", readiness: "Medium", decision: "In the MVP" },
  { area: "Root-cause analytics", value: "Medium", feasibility: "Medium", risk: "Low", readiness: "Low", decision: "Later: needs case history at volume" },
];
const tone = (l: Level, invert = false) => ((l === "High") !== invert ? "ok" : l === "Medium" ? "warn" : "bad");

const CONTROLS: [string, string][] = [
  ["MASK-01", "Personal data is masked, and a leak check stops processing if anything slips through"],
  ["INJ-01", "Instructions aimed at the AI are detected; no draft is produced and the case goes to a person"],
  ["CIT-01", "Every cited clause must exist in the policy library"],
  ["CIT-02", "Every factual statement must cite a clause"],
  ["RED-01", "Redress over £250 needs a senior; over £1,000 is blocked (enforced in code)"],
  ["FOS-01", "Final and summary responses must tell the customer about the Financial Ombudsman Service"],
  ["VUL-01", "Vulnerable customers always need senior co-approval"],
  ["CLEAR-01", "Long or complex wording is referred for a plain-language check"],
  ["LTR-01", "At the deadline with no final response, a delay letter is due; code checks it has the reason, a date and the FOS signposting"],
];

export function AboutView({ data, onOpenCase }: { data: WorkbenchData; onOpenCase: (ref: string) => void }) {
  const caseLink = (ref: string) => <button type="button" className="cite" onClick={() => onOpenCase(ref)}>{ref}</button>;
  return (
    <div className="panel">
      <div className="prose">
        <h2>About this prototype</h2>
        <p>
          An AI-assisted workbench for complaint handlers at <b>Meadowlane Bank plc, a fictional UK bank</b>. It finds the relevant policy, drafts a response that cites it, and builds a complete handover pack for specialist teams.
          The AI assists; a named person makes every decision. Built as a human-centred MVP for the Ankura AI by Design practical build task (Scenario 1: complaint handling).
        </p>
        <p className="banner">
          <b>All data is synthetic.</b> Every customer, account, merchant and policy is invented. {data.run
            ? <>The AI outputs shown come from a real model run on <b>{fmtDate(data.run.runDate)}</b> (triage {data.run.models.triage}, drafting {data.run.models.draft}), stored and served as they were produced.</>
            : <>AI outputs have not been generated yet.</>} The app itself never calls a model and never sends anything to a customer.
        </p>

        <h2>Test it in 60 seconds</h2>
        <ol>
          <li>In <b>My work queue</b>, open {caseLink("CMP-2026-105103")}. The complaint hides an instruction to the AI: the draft is withheld and INJ-01 fails.</li>
          <li>Open {caseLink("CMP-2026-104288")}. The customer is bereaved. Approve the draft: it goes to senior co-approval. Approve within 20 seconds of opening and you will be asked to confirm you read it. Switch the role (top right) to Senior to co-approve.</li>
          <li>Open {caseLink("CMP-2026-104712")}. Choose <b>Escalate</b> with a reason: the handover pack blocks submission until missing information is resolved.</li>
          <li>On any draft, choose <b>Amend</b> and add a made-up clause such as <code>[POL-11 §9.9]</code>, or set redress to £1,500: the checks re-run and approval locks.</li>
          <li>Open <b>Model assurance</b> for the measured test results, and <b>Audit trail</b> for every AI step and human decision.</li>
        </ol>

        <h2>How it works</h2>
      </div>
      <div className="pipe" aria-label="The six steps">
        {STEPS.map(([title, text, kind], i) => (
          <div key={title} className={`step ${kind}`}>
            <span className="n">Step {i + 1} · {kind === "ai" ? "AI model" : kind === "human" ? "Person" : "Code"}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <Box title="Controls designed into the workflow" label={<span className="note">Each control produces its own evidence in the checks panel and audit trail</span>}>
        <ul className="checks">
          {CONTROLS.map(([id, text]) => (
            <li key={id}><span className="cid">{id}</span><span>{text}<br /><BasisList basis={data.checkBasis[id] ?? []} /></span></li>
          ))}
        </ul>
      </Box>

      <Box title="Opportunity assessment" label={<span className="note">AI Strategy · where AI should support, and where it should not yet</span>}>
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Opportunity</th><th>Value</th><th>Feasibility</th><th>Risk</th><th>Readiness</th><th>Decision</th></tr></thead>
            <tbody>
              {OPPORTUNITIES.map((o) => (
                <tr key={o.area}>
                  <td>{o.area}</td>
                  <td><Pill tone={tone(o.value)}>{o.value}</Pill></td>
                  <td><Pill tone={tone(o.feasibility)}>{o.feasibility}</Pill></td>
                  <td><Pill tone={tone(o.risk, true)}>{o.risk}</Pill></td>
                  <td><Pill tone={tone(o.readiness)}>{o.readiness}</Pill></td>
                  <td>{o.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Scores are a judgement to be tested with the bank, not measured values. Outcome decisions (uphold, refund, authorisation) stay with people throughout.</p>
      </Box>

      <Box title="Regulatory basis" label={<span className="note">Verified against primary sources on {fmtDate(data.regulatory.asOf)}</span>}>
        <p className="note">The controls are designed to support these rules. The AI never cites regulation: drafts cite only the bank's (synthetic) policy clauses, and code attaches the regulatory basis. Nothing here claims legal compliance or is legal advice.</p>
        <ul className="plain">
          {data.regulatory.sources.map((s) => (
            <li key={s.ref}><b>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.ref}</a> : s.ref}</b> · {s.title}</li>
          ))}
        </ul>
      </Box>

      <Box title="Limitations">
        <ul className="plain">
          <li>Synthetic data: 60 complaints and their labels were written by one person and not independently reviewed. Each case is about 1.7 percentage points of any metric.</li>
          <li>Stored outputs: the app shows one model run. Results vary between runs; see Model assurance.</li>
          <li>Roles, decisions and the audit trail live in this browser's storage, so they are a simulation. A pilot needs real sign-in, server-side authorisation of approvals and an append-only audit log.</li>
          <li>No integration with case-management, CRM or core banking systems; no attachments; nothing is ever sent to a customer.</li>
          <li>Masking uses rules and name lists. It catches the patterns tested here, not every way personal data can be written.</li>
          <li>Self-reported AI confidence may be poorly calibrated; see the calibration result.</li>
          <li>Policies are synthetic and loosely modelled on UK rules. This is a prototype, not a product.</li>
        </ul>
        <p className="note">Supporting deck: submitted with this prototype. The code is available on request (the repository is private).</p>
      </Box>
    </div>
  );
}

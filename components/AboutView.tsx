"use client";
// The assessor's guide: what this is, how to test it in a minute, and what it cannot do. There is no public README.
import { fmtDate, gbp } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { GUIDE } from "./QueueView";
import { BasisList, Box } from "./ui";

const STEPS: [string, string, "code" | "ai" | "human"][] = [
  ["Mask personal data", "Names, account numbers, contact details and merchants become tokens before any AI step.", "code"],
  ["Triage", "The model classifies the complaint, lists the key facts, flags signs of vulnerability and identifies which deadline applies.", "ai"],
  ["Retrieve policy", "A keyword search finds the relevant policy clauses. Deadline, ombudsman and redress clauses are always included.", "code"],
  ["Draft", "The model drafts a reply that cites clauses, and a handover pack if a specialist team is needed.", "ai"],
  ["Check", "Code confirms every citation exists, redress is within limits, the ombudsman wording is present and no instruction was aimed at the AI.", "code"],
  ["Decide", "A named handler approves, edits or escalates, with a reason. Vulnerable customers and higher redress need a senior as well.", "human"],
];
const KIND = { code: "Code", ai: "AI model", human: "Person" } as const;

const CONTROLS: [string, string][] = [
  ["MASK-01", "Personal data is masked before every model call. If anything slips through, the case gets no AI processing."],
  ["INJ-01", "If a complaint contains an instruction aimed at the AI, the draft is withheld and a person writes the reply."],
  ["CIT-01", "Every clause a draft cites must exist in the policy library, and every statement of fact must cite one (CIT-02)."],
  ["RED-01", "Redress above £250 needs a senior. Redress above £1,000 is blocked. Text in a complaint cannot set an amount."],
  ["VUL-01", "A case with signs of vulnerability always needs senior co-approval."],
  ["FOS-01", "Final and summary responses must tell the customer about the Financial Ombudsman Service. Delay letters are checked too (LTR-01)."],
];

export function AboutView({ data, onOpenCase }: { data: WorkbenchData; onOpenCase: (ref: string) => void }) {
  const run = data.run;
  const evalRun = data.evalResults?.runs.at(-1) ?? null;
  const open = (ref: string) => <button type="button" className="linkish" onClick={() => onOpenCase(ref)}>{ref}</button>;

  return (
    <div className="page">
      <div className="page-head">
        <h2>About this prototype</h2>
        <p className="lead">
          Meadowlane Bank is a fictional UK retail bank with a growing complaints backlog. Handlers lose time searching case notes and policy documents, and specialist teams receive incomplete handovers. This workbench finds the relevant policy, drafts a reply that cites it and builds a complete handover pack. The AI assists. A named person makes every decision.
        </p>
        <p className="lead">
          Every complaint, person and policy here is synthetic. {run
            ? `The AI outputs are real: they were produced by ${run.models.triage} (triage) and ${run.models.draft} (drafting) on ${fmtDate(run.runDate)} and stored. The app does not call a model, so it works without a key and shows the same results to everyone.`
            : "The AI outputs have not been generated yet."}
        </p>
      </div>

      <Box title="Test it in a minute">
        <ol className="steps">
          {GUIDE.map((g) => <li key={g.ref}><b>{g.title}.</b> Open {open(g.ref)}. {g.hint}</li>)}
          <li><b>See the evidence.</b> Governance and assurance shows the measured results, including what the system got wrong, and the audit trail of every step you just took.</li>
        </ol>
      </Box>

      <Box title="How a complaint moves through it">
        <ol className="pipe" aria-label="Six steps">
          {STEPS.map(([title, text, kind], i) => (
            <li key={title} className={kind}>
              <span className="kind">{i + 1} · {KIND[kind]}</span>
              <h4>{title}</h4>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </Box>

      <div className="cols2">
        <Box title="Expected value">
          <ul className="plain">
            <li><b>Less searching.</b> The key facts, the relevant clauses and a cited draft are ready when the handler opens the case, instead of being pieced together from notes and {new Set(Object.values(data.clauses).map((c) => c.doc)).size} policy documents.</li>
            <li><b>Fewer handovers sent back.</b> A pack cannot go to a specialist team until each required item is attached or marked not available with a reason.</li>
            <li><b>Deadlines kept in view.</b> The queue is ordered by the regulatory clock (15 business days for payment complaints, 8 weeks otherwise), and the letter owed at the deadline is checked by code.</li>
            <li><b>Low running cost.</b> {evalRun ? `${gbp(evalRun.cost.meanGbp, 4)} per complaint at list prices in the latest evaluation run.` : "Cost per complaint is reported once the evaluation has run."}</li>
            <li className="note">Time saved is an expectation, not a measurement: a pilot would time handlers with and without the tool.</li>
          </ul>
        </Box>

        <Box title="How roles change">
          <ul className="plain">
            <li><b>Complaint handlers</b> spend less time finding clauses and typing routine paragraphs, and more time checking facts, adjusting tone and completing handovers.</li>
            <li><b>Senior handlers</b> review the cases that carry most risk: signs of vulnerability, or redress between £250 and £1,000.</li>
            <li><b>Specialist teams</b> receive the same structured pack every time and can return an incomplete one with a reason, which is counted.</li>
            <li><b>Over-reliance is watched.</b> Approving within 20 seconds asks the handler to confirm they read the reply, and the share of drafts approved unchanged is tracked.</li>
          </ul>
        </Box>

        <Box title="Controls and human review" label="Each control shows the rule it is designed to support">
          <ul className="rows">
            {CONTROLS.map(([id, text]) => (
              <li key={id}>
                <span className="label">{id}</span>
                <span>{text}{data.checkBasis[id] && <><br /><BasisList basis={data.checkBasis[id]} /></>}</span>
              </li>
            ))}
          </ul>
          <p className="note">These controls are designed to support the rules shown. Nothing here is a claim of legal compliance. Sources checked {fmtDate(data.regulatory.asOf)}.</p>
        </Box>

        <Box title="Limitations">
          <ul className="plain">
            <li>The 60 complaints and their labels were written by one person and not independently reviewed. Each case is about 1.7 percentage points, so small differences mean little.</li>
            <li>The second prompt version was written after seeing the first one’s errors on the same 60 cases. There is no held-out set, so results on new complaints would probably be lower.</li>
            <li>Masking uses rules and name lists. It catches the patterns tested, not every way of writing personal data.</li>
            <li>The model’s own confidence score does not reliably separate right from wrong answers, so the code checks carry the assurance.</li>
            <li>Roles, decisions and your part of the audit trail are held in this browser. A pilot needs real sign-in, approvals authorised on the server and an append-only log.</li>
            <li>No real handler has used this. Effects on handling time and staff behaviour are untested.</li>
          </ul>
          <p className="note">Built with Claude Code. The source code is private and available on request.</p>
        </Box>
      </div>
    </div>
  );
}

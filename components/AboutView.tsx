"use client";
// The assessor's guide: what this is, how to test it in a minute, how it maps to Ankura's three solution sets,
// and what it cannot do. There is no public README.
import { fmtDate, gbp } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { GUIDE } from "./QueueView";
import { Box, PageBand } from "./ui";

export function AboutView({ data, onOpenCase }: { data: WorkbenchData; onOpenCase: (ref: string) => void }) {
  const run = data.run;
  const evalRun = data.evalResults?.runs.at(-1) ?? null;
  const withResult = data.cases.filter((c) => c.result);
  const locked = withResult.filter((c) => c.result!.checks.some((k) => k.result === "Fail")).length;
  const docs = new Set(Object.values(data.clauses).map((c) => c.doc)).size;
  const open = (ref: string) => <button type="button" className="linkish" onClick={() => onOpenCase(ref)}>{ref}</button>;

  return (
    <>
    <PageBand icon="info" title="About this prototype" />
    <div className="page about">
      <div className="about-intro">
        <Box title="Meadowlane Bank plc">
          <p className="txt">
            Meadowlane Bank plc is a fictional UK high-street retail bank: current accounts, debit and credit cards, overdrafts, personal loans and mortgages, served through branches, phone, app and web, and regulated by the FCA. Its complaints team has a growing backlog. This workbench finds the policy that applies, drafts a reply that cites it, and builds the handover pack a specialist team needs. The AI assists; a named person makes every decision.
          </p>
          <p className="txt">
            Everything here is synthetic. {run
              ? `The AI outputs are real, produced on ${fmtDate(run.runDate)} and stored, so the app needs no key and shows the same results to everyone.`
              : "The AI outputs have not been generated yet."}
          </p>
        </Box>
      </div>

      <div className="about-test">
        <Box title={`Test it in a minute (${GUIDE.length + 1})`}>
          <ol className="steps">
            {GUIDE.map((g) => <li key={g.ref}><b>{g.title}.</b> Open {open(g.ref)}. {g.hint}</li>)}
            <li><b>See the evidence.</b> <a href="#governance">Risk, controls and oversight</a> shows every check, the measured results and the record of what you just did.</li>
          </ol>
        </Box>
      </div>

      <div className="cols3 about-sets">
        <Box title="AI Strategy" label="Where AI helps most">
          <ul className="plain">
            <li>Five places AI could help with complaints were scored on value, feasibility, risk and readiness. Policy search, drafting and handovers won; deciding outcomes was ruled out.</li>
            <li>Built as a human-centred working prototype, not a product: handlers keep every decision.</li>
            <li>Expected value: less time searching {docs} policy documents, fewer handovers sent back, deadlines kept in view{evalRun ? `, ${gbp(evalRun.cost.meanGbp, 2)} per complaint in AI cost` : ""}.</li>
          </ul>
        </Box>
        <Box title="AI Governance Engineering" label="Governance inside the screen, not in a document">
          <ul className="plain">
            <li>Personal data is masked before any AI step. Every claim in a draft must point to a policy clause. Redress limits are enforced by code.</li>
            <li>Approval locks when a check fails. Every decision needs a reason. Every step is written to the record.</li>
            <li>The controls produce their own evidence: see <a href="#governance">Risk, controls and oversight</a>.</li>
          </ul>
        </Box>
        <Box title="AI Workforce Transformation" label="Roles redesigned, adoption measured">
          <ul className="plain">
            <li>Handlers move from searching and typing to checking and deciding. Seniors see only the cases that carry risk. Specialists get a complete pack every time.</li>
            <li>Approving within 20 seconds asks the handler to confirm they read the reply. The share of drafts approved unchanged is tracked.</li>
            <li>A pilot would measure handling time and returns with a control team before scaling.</li>
          </ul>
        </Box>
      </div>

      <div className="about-limits">
      <Box title="What it cannot do yet">
        <ul className="plain">
          <li>The code checks lock approval on {locked} of the {withResult.length} stored drafts, each for a real reason. That is the controls working, and a measure of how often a handler must edit the AI's draft.</li>
          <li>The 60 complaints and their labels were written by one person. The second prompt was tuned after seeing the first one's errors on these same cases, so results on new complaints would probably be lower.</li>
          <li>Masking uses rules and name lists, which catch the patterns tested, not every way of writing personal data.</li>
          <li>Roles, decisions and your part of the record live in this browser. A pilot needs real sign-in, approvals checked on the server and a tamper-proof log.</li>
          <li>No real handler has used it. Effects on handling time and behaviour are untested.</li>
          <li>The approval limits (£250 handler, £1,000 senior) are Meadowlane's own and illustrative; banks do not publish theirs. They cover goodwill and redress. In a real bank, refunds the law requires (unauthorised payments, APP scam reimbursement up to £85,000) would be paid through the fraud team's own process, not through these limits.</li>
        </ul>
        <p className="note">Built with Claude Code. The source code is private and available on request.</p>
      </Box>
      </div>
    </div>
    </>
  );
}

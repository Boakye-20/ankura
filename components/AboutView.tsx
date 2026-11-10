"use client";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { BasisList, Box, Pill } from "./ui";

const STEPS: [string, string, string][] = [
  ["1. Mask PII", "Deterministic code replaces customer names, accounts, contacts and merchants with tokens before any AI call.", "code"],
  ["2. Triage", "Claude Haiku classifies the complaint, extracts key facts, flags FG21/1 vulnerability drivers and sets the DISP deadline.", "ai"],
  ["3. Retrieve Policy", "BM25 search retrieves the top policy clauses plus mandatory DISP deadline, ombudsman and redress rules.", "code"],
  ["4. Draft & Handover", "Claude Sonnet drafts a customer response citing policy clauses and prepares a structured specialist handover pack.", "ai"],
  ["5. Verify Guardrails", "Code checks every citation exists, blocks redress >£1,000, verifies FOS signposting, and blocks prompt injections.", "code"],
  ["6. Human Sign-off", "Named handlers approve, edit or escalate with mandatory reason codes. Vulnerable/high-redress cases require a Senior.", "human"],
];

const CONTROLS: [string, string][] = [
  ["MASK-01", "PII is masked before model calls; a post-check blocks processing if any unmasked personal data leaks through"],
  ["INJ-01", "Prompt injection attempts in customer text are detected; the draft is withheld and routed to a human"],
  ["CIT-01 / 02", "Every factual statement must cite a policy clause ID, and code verifies that every cited clause exists in the library"],
  ["RED-01", "Redress >£250 requires Senior Handler co-approval; redress >£1,000 is blocked in code"],
  ["VUL-01", "Cases with FG21/1 vulnerability indicators always require Senior Handler co-approval"],
  ["FOS-01 / LTR-01", "Final, summary, and statutory delay letters are checked in code for mandatory Financial Ombudsman Service rights"],
];

export function AboutView({ data, onOpenCase }: { data: WorkbenchData; onOpenCase: (ref: string) => void }) {
  const caseLink = (ref: string, label?: string) => (
    <button type="button" className="cite" onClick={() => onOpenCase(ref)}>
      {label ?? ref}
    </button>
  );

  return (
    <div className="about-page">
      <div className="about-hero">
        <div>
          <Pill tone="info">Scenario 1 · Banking Complaint Handling</Pill>
          <h2>Executive Brief &amp; Prototype Guide</h2>
          <p className="lead">
            Built for <b>Meadowlane Bank plc</b> (fictional UK retail bank) to address a growing backlog of customer complaints, slow policy look-ups across case notes, and incomplete handovers to specialist teams.
          </p>
        </div>
        <div className="quick-test-box">
          <h3>Interactive Walkthrough (60 seconds)</h3>
          <ol>
            <li>
              <b>Prompt Injection Guardrail:</b> Open {caseLink("CMP-2026-105103")} — hidden instructions attempt to force a £950 refund; <code>INJ-01</code> blocks the AI draft.
            </li>
            <li>
              <b>Vulnerability &amp; Over-reliance Control:</b> Open {caseLink("CMP-2026-104288")} — approve within 20s to trigger the fast-approval check, then switch role (top right) to <b>Senior Handler</b> to co-approve.
            </li>
            <li>
              <b>Specialist Handover Gate:</b> Open {caseLink("CMP-2026-104712")} — choose <b>Escalate to Fraud &amp; Disputes</b>, resolve the missing item, then switch role to <b>Specialist</b> to accept or return.
            </li>
            <li>
              <b>Live Guardrail Re-verification:</b> On any case, click <b>Edit &amp; re-check</b> and enter an invalid citation like <code>[POL-99 §1.1]</code> or redress of <code>1500</code> — approval immediately locks.
            </li>
          </ol>
        </div>
      </div>

      <section className="section-block">
        <h3>End-to-End Architecture: Where AI Assists vs. Where Code &amp; Humans Govern</h3>
        <div className="pipe" aria-label="Six-step complaint handling pipeline">
          {STEPS.map(([title, text, kind]) => (
            <div key={title} className={`step ${kind}`}>
              <span className="n">{kind === "ai" ? "AI Model" : kind === "human" ? "Human Review" : "Deterministic Code"}</span>
              <h4>{title}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid2">
        <Box title="1. Potential Business Value" label={<Pill tone="ok">AI Strategy</Pill>}>
          <ul className="plain">
            <li><b>Faster handling &amp; backlog reduction:</b> Eliminates manual searching across 11 policy documents and multi-note case histories by pre-assembling cited drafts and key facts at intake.</li>
            <li><b>Lower specialist return rate:</b> Structured handover packs enforce a mandatory completeness checklist (<code>POL-10 §3.1</code>) before escalation, preventing incomplete handoffs to Fraud, Bereavement, and Executive teams.</li>
            <li><b>Protected regulatory SLAs:</b> Automatic classification of PSD2 payment-service complaints (15 business days) vs. standard DISP complaints (56 calendar days), with built-in statutory delay letters.</li>
            <li><b>Negligible marginal cost:</b> Pre-computed / batched triage and drafting costs ~£0.006 per complaint across the 60-case evaluation suite.</li>
          </ul>
        </Box>

        <Box title="2. Workforce &amp; Role Transformation" label={<Pill tone="info">Workforce Transformation</Pill>}>
          <ul className="plain">
            <li><b>Complaint Handlers:</b> Shift from locating clauses and typing routine paragraphs to verifying facts, tailoring tone, and resolving missing handover evidence.</li>
            <li><b>Senior Handlers:</b> Focus exclusively on high-risk sign-offs — co-approving cases with FG21/1 vulnerability indicators or redress between £250 and £1,000.</li>
            <li><b>Specialist Teams:</b> Receive standardised handover packs (issue summary, actions already taken with note citations, specific questions required) and can formally return incomplete packs with tracked reason codes.</li>
            <li><b>Over-reliance mitigation:</b> Approvals submitted in under 20 seconds trigger an explicit confirmation prompt, and session adoption metrics track unchanged-approval rates.</li>
          </ul>
        </Box>

        <Box title="3. Risks, Controls &amp; Human Oversight" label={<Pill tone="warn">Governance Engineering</Pill>}>
          <ul className="checks">
            {CONTROLS.map(([id, text]) => (
              <li key={id}>
                <span className="cid">{id}</span>
                <span>
                  {text}
                  {data.checkBasis[id.split(" ")[0]] && <><br /><BasisList basis={data.checkBasis[id.split(" ")[0]]} /></>}
                </span>
              </li>
            ))}
          </ul>
        </Box>

        <Box title="4. AI Tools Used, Assumptions &amp; Limitations" label={<Pill>Transparency</Pill>}>
          <ul className="plain">
            <li><b>AI Models Assessed:</b> Anthropic <code>claude-haiku-4-5</code> for fast structured triage and <code>claude-sonnet-4-5</code> for policy-grounded response drafting, paired with deterministic BM25 policy retrieval.</li>
            <li><b>Why stored outputs in the UI:</b> The prototype serves real model outputs generated on {data.run ? fmtDate(data.run.runDate) : "precompute"} so reviewers can test instantaneously without API keys, while live server routes (<code>/api/verify</code>, <code>/api/letter</code>) re-run deterministic guardrails on edits.</li>
            <li><b>Explicit Limitations:</b>
              <ul>
                <li>60 synthetic cases and labels were authored by one person (~1.7% per case); prompt v2 was tuned after inspecting v1 errors on the same set.</li>
                <li>Self-reported model confidence is poorly calibrated (see Governance tab), so deterministic rule checks carry the real assurance burden.</li>
                <li>Regex/list PII masking and browser-local RBAC/audit logs are prototype simulations; production requires enterprise IAM, append-only server logs, and NER-backed redaction.</li>
              </ul>
            </li>
          </ul>
        </Box>
      </div>
    </div>
  );
}

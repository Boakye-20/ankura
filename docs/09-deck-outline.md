# 09 · Supporting deck (five pages maximum)

Write it as an Ankura AI by Design team would present to Meadowlane Bank's Head of Customer Resolution and Chief Risk Officer. One message per page. Every number comes from the eval results or is labelled as an assumption.

## Page 1 · The problem and why this approach (AI Strategy)
- Headline: Complaints are delayed by searching and weak handovers, not by decisions, so AI should assist handlers rather than replace them.
- The problem: backlog against DISP deadlines; manual search across notes and policy; incomplete specialist handovers.
- **Opportunity assessment** (small table): triage, policy retrieval, drafting, handover packs, root-cause analytics, scored High/Medium/Low on value, feasibility, risk and readiness. The MVP covers the first four; root-cause analytics comes later on the roadmap.
- Why not automate decisions: Consumer Duty, FOS reviewability, and the risk of "doing broken work faster". We redesigned the handover rather than just speeding up drafting.
- Scope in and out, and key assumptions.

## Page 2 · How it was built and the AI tools (AI Factory thinking)
- The six-step pipeline diagram, with the two model steps marked and the four code steps marked.
- Design choices and trade-offs: BM25 over embeddings (explainable, deterministic); structured outputs validated by code; models set by configuration (technology-agnostic); demo mode for assessors.
- **AI tools assessment** table:
  | Tool | Used for | Strengths found | Limits found | When I'd recommend it to a bank |
  |---|---|---|---|---|
  | Claude Code | Building the app, tests, synthetic data | [from experience] | [from experience] | Rapid prototyping with an engineer reviewing every change |
  | Claude API | Triage and drafting | [from eval] | [from eval, e.g. confidence calibration, cost] | Behind code controls, with evaluation |
  | Microsoft Copilot Studio (Oakbrook) | Regulatory knowledge agent for 80+ staff | Fast to deploy inside Microsoft 365; familiar to staff | Harder to add custom verification and evaluation | Internal knowledge Q&A where M365 governance already exists |
- One honest line on what PK did versus what the tools did.

## Page 3 · Testing, results and limitations
- Target vs result table from `eval-results.json` (both runs).
- Adversarial results: 12 attacks, what was stopped and what was not.
- The three most instructive failures and what would change.
- Limitations: synthetic data, single labeller, n = 60, no real handler behaviour, confidence calibration, pricing assumptions.
- What a pilot must prove that this prototype cannot ("a pilot designed to succeed will not scale"): real data quality, integration, calibration, staff behaviour, cost at volume.

## Page 4 · Controls and human review (Governance Engineering)
- Headline: Governance is designed into the handler's screen, so controls produce their own evidence.
- Control matrix: risk, control, owner, evidence (masking; citation verifier; redress limits in code; injection detection; vulnerability co-approval; over-reliance).
- Human review tiers: Tier 1 handler; Tier 2 senior co-approval (vulnerable, low confidence, redress over £250); Tier 3 specialist (authorisation, fraud, high value, legal).
- Regulatory alignment (stated carefully as design intent, not legal advice): DISP timescales and FOS signposting; Consumer Duty outcomes; FG21/1 vulnerability; UK GDPR data minimisation.
- Monitoring in production: drift in category mix, citation failures, override rates, monthly QA sample.

## Page 5 · People, value and roadmap (Workforce AI Transformation)
- Roles before and after (handler, senior, specialist, QA).
- New skills and training: AI literacy, judging AI output, citation checking, recording reasons. Co-design the workflow with handlers in the pilot.
- Adoption measures to catch "quiet reversion": share of drafts approved unchanged or amended, reason codes, handover return rate, time to decision.
- **Value case**, every input labelled as an assumption to test: complaints per year × minutes saved per case × loaded cost per hour, plus fewer handover returns and missed deadlines. Frame savings as capacity to clear the backlog, not headcount cuts.
- **Roadmap**: 3-month pilot in one team with a control team → go/no-go on agreed thresholds → scale → next use cases (root-cause analytics, QA sampling).

## Style
- Navy, white and one blue accent, matching the app. IBM Plex Sans and Source Serif.
- No more than about 90 words of body text per page.
- Footer on each page: "Paul Kwarteng · Ankura AI by Design practical build · November 2026 · n / 5".

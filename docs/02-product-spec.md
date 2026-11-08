# 02 · Product specification

## Problem statement (assumed for the fictional client)
Meadowlane Bank's complaint resolution team has a growing backlog. Handlers spend a large share of each case searching case notes and policy documents, and writing responses from scratch. Specialist teams (Fraud & Disputes, Lending Support, Vulnerability Team) return incomplete handovers, which adds days to cases with regulatory deadlines.

## Goal
Reduce the time handlers spend on searching, summarising, drafting and packaging, **without** moving any outcome decision away from people, and while protecting customer data.

## Users
| User | Need | What they do in the app |
|---|---|---|
| Complaint handler (J. Okafor) | Find the right policy fast; draft a fair, cited response; hand over complete cases | Works the queue; approves, amends or escalates |
| Senior complaint handler (R. Patel) | Oversight of vulnerable and low-confidence cases | Co-approves flagged cases |
| Specialist (Fraud & Disputes) | Complete, accurate handovers | Reviews the handover pack; accepts or returns it |
| Complaints QA / Risk | Evidence that controls work | Reads the Model assurance page and the Audit trail |

## In scope
1. Work queue of synthetic complaints, ordered by deadline risk
2. Case view: masked complaint, AI summary, classification, regulatory deadline, retrieved policy clauses, cited draft response
3. Pre-release checks panel showing every verifier result
4. Handler decision: approve, amend (edit the draft), or escalate, with a mandatory reason
5. Specialist handover pack, generated and checked for missing information
6. Audit trail of every AI step and human action
7. Model assurance page showing real evaluation results
8. Demo mode (no key) and live mode (key on the server); a "Run AI on this case" button in live mode
9. A "Try your own complaint" box in live mode, so assessors can type a new complaint and watch the pipeline run

## Out of scope (state this in the README)
- Automatic sending to customers or any automated outcome decision
- Integration with real case-management, CRM or core banking systems
- Authentication and role-based access (roles are simulated with a role switcher)
- Persistent server-side storage (actions are kept in the browser for the session)
- Voice, attachments or images

## Screens
### 1. My work queue (default view)
- Environment banner: "TEST ENVIRONMENT · SYNTHETIC DATA ONLY · NOT FOR CUSTOMER USE"
- Header: Meadowlane Bank wordmark, "Complaints Workbench", current user and role (role switcher: Handler / Senior / Specialist)
- Tabs: My work queue · Specialist handovers · Model assurance · Audit trail · About this prototype
- Queue table columns: Reference, Received, Product, Issue, Flags, Regulatory deadline (bar + "9 / 15 business days"), Route, Status
- Default sort: least time remaining as a share of the deadline first
- Selecting a row opens the case below the table (as in `reference/mockup.html`)

### 2. Case view
Left column:
- **Complaint as received**: masked text with tokens shown as chips. A "Reveal personal data" toggle shows the unmasked text to the handler only (the model never sees it). Revealing writes an audit event.
- **Case summary** (labelled "AI-generated · review required") with classification confidence
- **Proposed response** (labelled "Draft · not sent"), with inline citation chips. Hovering or tapping a chip shows the clause text.
- **Policy references retrieved**: clause ID + clause text + relevance score

Right column:
- **Pre-release checks**: each check with Pass / Fail / Refer and a one-line reason
- **Handler decision**: radio buttons (Approve / Amend / Escalate), reason dropdown (mandatory), comment, Submit
  - Approve is disabled when any check is Fail
  - If the case needs senior co-approval, Approve changes status to "Awaiting senior co-approval"
  - Amend opens the draft in an editable text area; on save, the verifier runs again on the edited text
  - Escalate opens the handover pack for that case

### 3. Specialist handovers
- List of escalated cases; selecting one shows the pack:
  customer's issue (summary), actions already taken (from case notes, each with its note ID), decision required (with clause IDs), deadline, missing information
- Submit is disabled while any required item is missing, unless the handler marks it "Not available" with a reason
- Specialist role can Accept or Return (with a reason). Returns are counted on the Model assurance page.

### 4. Model assurance
- Banner stating the date and version of the evaluation run
- KPI tiles from `data/eval-results.json` with target and result, pass or miss
- Confusion matrix for complaint category
- Adversarial test table: test, input summary, expected, actual, pass or fail
- "Known failures" list: every case the system got wrong, with a short explanation
- Cost and latency: average tokens and cost per case, average seconds per case (live run)
- **Adoption** (from session actions, Workforce AI Transformation): share of AI drafts approved unchanged, amended or rejected; reason codes; handover return rate; median time to decision; a warning count for approvals made in under 20 seconds (possible over-reliance)

### 5. Audit trail
- Table: timestamp, case, actor, event, detail
- Seeded with events from the demo run, plus every action taken in the browser session
- Export to CSV button

### 6. About this prototype
- Short plain-English explanation, the six steps, demo vs live mode, limitations, link to the deck (the code is available on request; the repo is private)
- **Opportunity assessment** table (AI Strategy): triage, policy retrieval, drafting, handover packs and root-cause analytics, each scored High/Medium/Low on value, feasibility, risk and readiness, showing why the MVP covers the first four

## Acceptance criteria (test these before submission)
1. Opening the hosted link with no key shows the populated queue within 3 seconds
2. Every one of the 60 complaints opens and shows summary, checks and either a draft or a "draft withheld" reason
3. No request to the model contains any unmasked personal data (unit test plus a logged check)
4. A draft containing a non-existent clause ID is blocked
5. A draft offering more than the handler's authority limit is blocked
6. The injection example never produces a draft and is flagged
7. Vulnerable cases cannot be approved without senior co-approval
8. Every decision requires a reason and appears in the Audit trail
9. Model assurance shows only numbers from `data/eval-results.json`
10. The app works on a laptop screen and is usable on a phone

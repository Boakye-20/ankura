# Meadowlane Complaints Workbench

> Private repository for PK's own reference. Not submitted to Ankura. Assessors see only the hosted demo and the PDF deck, so the test route lives on the in-app About page.

An AI-assisted workbench for complaint handlers at **Meadowlane Bank plc, a fictional UK bank.** Built for the Ankura AI by Design practical build task (Scenario 1: complaint handling).

> **All data is synthetic.** Every customer, account, merchant and policy is invented. This is a prototype, not a product.

**Hosted demo:** [hosted link] · **Supporting deck:** attached to submission

## Test it in 60 seconds
1. Open the hosted link. It shows stored outputs from a real model run, so no login or key is needed.
2. In **My work queue**, open `CMP-2026-105103`. The complaint contains a hidden instruction to the AI. See the draft withheld and the failed check.
3. Open `CMP-2026-104288`. The customer is bereaved. Approve: it goes to senior co-approval (switch role to Senior to co-approve).
4. Open `CMP-2026-104712`. Choose **Escalate** and see the handover pack block submission until missing information is resolved.
5. Open **Model assurance** for the measured test results, and **Audit trail** for every AI step and human decision.

## What it does
Handlers lose time searching case notes and policy, and specialists receive incomplete handovers. The workbench masks personal data, classifies the complaint, retrieves the relevant policy clauses, drafts a cited response and handover pack, and checks every output in code. A named person approves, amends or escalates every case, with a reason; nothing is ever sent to a customer.

## How it works
`Mask (code) → Triage (AI) → Retrieve (code, BM25) → Draft (AI) → Verify (code) → Human decision`

Steps run offline in `npm run precompute`, which writes `data/demo-outputs.json`. The hosted app only serves those stored results and never calls a model.

## Controls
| Risk | Control | Evidence |
|---|---|---|
| Personal data reaches the model | Masking before every call; leak check stops processing (MASK-01, MASK-02) | `tests/no-pii-leak.test.ts`; eval masking metric |
| Prompt injection | Rule patterns plus triage flag; draft withheld (INJ-01) | Adversarial cases A1 to A3 |
| Invented or unsupported statements | Citations must exist, be retrieved and cover every factual part (CIT-01 to CIT-03) | Checks panel; citation metrics |
| Redress set by the customer or beyond authority | Limits in code: >£250 senior, >£1,000 blocked; amounts need a basis (RED-01, RED-02) | Adversarial cases A5 to A7 |
| Missed FOS signposting | FOS-01 on final and summary responses | FOS metric |
| Vulnerable customers | Senior co-approval always (VUL-01) | Vulnerability recall |
| Rubber-stamping | Mandatory reasons; over-reliance prompt for approvals under 20 seconds; adoption counts | Audit trail; Model assurance |

## Results
[Run `npm run eval` twice. Copy the table from `data/eval-results.json`, both runs, with date and commit.]

### Known failures
[Three failures with case refs and what would change.]

## Limitations
- Synthetic data and labels written by one person, not independently reviewed; n = 60, so each case is about 1.7 percentage points.
- No measurement of real handler behaviour; costs depend on current model pricing and an assumed USD to GBP rate (`lib/anthropic.ts`).
- Roles, decisions and the audit trail live in the browser's `localStorage`. A pilot needs real sign-in, server-side authorisation of approvals and an append-only audit log.
- Masking is rule- and list-based. It catches the tested patterns, not every possible way of writing personal data.

## Security notes
- Only masked text, retrieved clauses and structured triage go to the model; the token map never leaves the pipeline and is never saved.
- `/api/cases` returns masked text and stored results only, never raw text, customer fields or labels. `/api/verify` validates its body with zod and caps its size.
- The API key lives only in `.env.local`. Vercel gets no environment variables. The client bundle contains no prompts, verifier code or secrets (checked by grepping `.next/static`).

## How AI tools were used
[Claude Code for building; Claude API in the pipeline; comparison with Copilot Studio. What PK decided, reviewed and tested.]

## Run locally
```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY is only needed for precompute and eval
npm run dev                  # http://localhost:3000
npm test                     # unit tests, including the no-PII-leak test
npm run precompute           # writes data/demo-outputs.json (needs a key)
npm run eval                 # appends a run to data/eval-results.json (needs a key); run it twice
npm run build
```

## Project structure
```
app/            page, layout, styles, API routes (cases, verify, eval, status)
components/     workbench views: queue, case, decision, handovers, assurance, audit, about
lib/            pipeline steps (mask, triage, retrieve, draft, verify, route, deadlines), eval scoring
lib/prompts/    triage.v1.md, draft.v1.md
scripts/        precompute.ts, eval.ts, check-data.ts
data/           policies, synthetic complaints, generated outputs
tests/          vitest unit tests
```

## Author
Paul Kwarteng · [LinkedIn] · github.com/Boakye-20

# Meadowlane Complaints Workbench

> Private repository for PK's own reference. Not submitted to Ankura. Assessors see only the hosted demo and the PDF deck, so the test route lives on the in-app About page.

An AI-assisted workbench for complaint handlers at **Meadowlane Bank plc, a fictional UK bank.** Built for the Ankura AI by Design practical build task (Scenario 1: complaint handling).

> **All data is synthetic.** Every customer, account, merchant and policy is invented. This is a prototype, not a product.

**Live demo:** [hosted link] · **Supporting deck:** [link or "attached to submission"]

## Test it in 60 seconds
1. Open the live demo. It runs in demonstration mode, so no login or key is needed.
2. In **My work queue**, open `CMP-2026-105103`. The complaint contains a hidden instruction to the AI. See the draft withheld and the failed check.
3. Open `CMP-2026-104288`. The customer is bereaved. Try to approve: it goes to senior co-approval.
4. Open `CMP-2026-104712`. Choose **Escalate** and see the handover pack block submission until missing information is resolved.
5. Open **Model assurance** for the measured test results, and **Audit trail** for every AI step and human decision.

## What it does
[Three sentences: the problem, the six steps, the human decision.]

## How it works
[Six-step diagram: Mask → Triage → Retrieve → Draft → Verify → Human decision]

## Controls
| Risk | Control | Evidence |
|---|---|---|
| [from deck page 4] | | |

## Results
[Table from data/eval-results.json, both runs, with date and commit]

### Known failures
[Three failures with case refs and what would change]

## Limitations
[From docs/06]

## How AI tools were used
[Claude Code for building; Claude API in the product; comparison with Copilot Studio. What PK decided, reviewed and tested.]

## Run locally
```bash
git clone [repo]
cd ankura
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for live mode; leave blank for demo mode
npm run dev                  # http://localhost:3000
npm test                     # unit tests, including the no-PII-leak test
npm run eval                 # re-runs the evaluation (needs a key)
```

## Project structure
[Short tree]

## Author
Paul Kwarteng · [LinkedIn] · github.com/Boakye-20

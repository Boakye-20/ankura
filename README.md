# Meadowlane Complaints Workbench

> Private repository for PK's own reference. Not submitted to Ankura. Assessors see only the hosted demo and the PDF deck, so the test route lives on the in-app About page.

An AI-assisted workbench for complaint handlers at **Meadowlane Bank plc, a fictional UK bank.** Built for the Ankura AI by Design practical build task (Scenario 1: complaint handling).

> **All data is synthetic.** Every customer, account, merchant and policy is invented. This is a prototype, not a product.

**Hosted demo:** https://ankura-five.vercel.app · **Supporting deck:** attached to submission

## Test it
The full guide is on the in-app **About this prototype** page (source: `components/guide.ts`). It also opens from **Demo guide** on Cases, and each guided case shows what to look for in a banner.

**Start here (about two minutes):**
1. `CMP-2026-104712`: a clean cited draft. Hover a policy reference to read the clause; all 13 checks pass.
2. `CMP-2026-105103`: the complaint tells the AI to approve £5,000. Code withholds the draft.
3. `CMP-2026-101003`: vulnerable customer. Approve within 20 seconds to see the quick-approval prompt, then switch to Senior handler (name menu, top right) to co-approve.
4. **Risk, controls and oversight**: the controls, the measured results and the record of what you just did.

**By area:** uncited statement `100607` · masking `100304` · redress over £1,000 `100601`, over £250 `100507`, no basis `100606` · handover to a specialist `104712` (Escalate) · eight-week letter `100501` · payment services holding response `100402` · summary resolution `100702`.

Direct links: `#case/CMP-2026-104712`, `#governance`, `#about`.

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
Every run is in `data/eval-results.json` and appears on the Model assurance page. Two prompt versions were evaluated, each twice, on the same 60 labelled synthetic cases.

**Prompt v1** (09/11/2026, commit `d705270`, full detail in `docs/13-eval-v1-results.md`):

| Metric | Target | Run 1 | Run 2 |
|---|---|---|---|
| Category accuracy | ≥ 90% | 81.7% | 81.7% |
| Vulnerability recall | ≥ 95% | 14/14 | 14/14 |
| Deadline type accuracy | ≥ 95% | 86.7% | 85.0% |
| Routing accuracy | ≥ 90% | 88.3% | 86.7% |
| Masking: no personal data sent | 100% | 60/60 | 60/60 |
| Citation validity | 100% | 99.6% (one blocked by CIT-01) | 100% |
| Redress over limit, not blocked | 0 | 0 | 0 |
| Adversarial tests | 12/12 | 12/12 | 12/12 |
| Calibration (accuracy ≥ 0.75 vs < 0.75) | report | 96% vs 36% | 96% vs 36% |

**Prompt v2** (written after reading v1's failures; see `docs/CHANGELOG.md`): V2_RESULTS_PENDING

### Known failures
V2_FAILURES_PENDING

## Limitations
- Synthetic data and labels written by one person, not independently reviewed; n = 60, so each case is about 1.7 percentage points.
- No measurement of real handler behaviour; costs depend on current model pricing and an assumed USD to GBP rate (`lib/anthropic.ts`).
- Roles, decisions and the audit trail live in the browser's `localStorage`. A pilot needs real sign-in, server-side authorisation of approvals and an append-only audit log.
- Masking is rule- and list-based. It catches the tested patterns, not every possible way of writing personal data.
- Prompt v2 was written after seeing v1's failures on the same 60 cases, and there is no held-out set, so v2's gain overstates how it would do on new cases.
- Some labels contradict each other (for example CMP-2026-100503 and 100804 are both "fee applied in error" but carry different categories). A pilot needs two independent labellers and an agreement check before trusting any accuracy figure.
- Before the first eval, case notes that revealed the expected answer were rewritten (`docs/CHANGELOG.md`). The same person wrote the notes and the labels.
- The approval limits (£250 handler, £1,000 senior) are Meadowlane's own and illustrative; banks do not publish theirs. They cover goodwill and redress. In a real bank, refunds the law requires (unauthorised payments, APP scam reimbursement up to £85,000) would go through the fraud team's own process, not these limits. RED-01 currently blocks any offer above £1,000, including such a refund.

## Security notes
- Only masked text, retrieved clauses and structured triage go to the model; the token map never leaves the pipeline and is never saved.
- `/api/cases` returns masked text and stored results only, never raw text, customer fields or labels. `/api/verify` and `/api/letter` validate their bodies with zod, cap the size and return a generic 400.
- The API key lives only in `.env.local`. Vercel gets no environment variables. The client bundle contains no prompts, verifier code, batch code, customer data, labels or secrets, and no source maps (checked by searching `.next/static` and the prerendered HTML).
- A pre-launch slopsec audit on 09/11/2026 found no high-severity issues. Security headers include HSTS, `frame-ancestors 'none'`, nosniff and no-referrer. `npm audit` reports 0 vulnerabilities, and there are no secrets in git history.

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
npm run recheck              # re-runs the code checks on stored outputs after a verifier change (no key)
npm run eval -- --batch      # same, through the Message Batches API at half price (minutes to hours); also works for precompute
npm run build
```

## Project structure
```
app/            page, layout, styles, API routes (cases, verify, eval, status)
components/     workbench views: queue, case, decision, handover pack, governance (assurance, adoption, audit), about
lib/            pipeline steps (mask, triage, retrieve, draft, verify, route, deadlines), eval scoring
lib/prompts/    triage.v1.md, draft.v1.md
scripts/        precompute.ts, eval.ts, recheck.ts, check-data.ts
data/           policies, synthetic complaints, generated outputs
tests/          vitest unit tests
```

## Author
Paul Kwarteng · [LinkedIn] · github.com/Boakye-20

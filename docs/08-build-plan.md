# 08 · Build plan and prompts for Claude Code

Time left: Sunday 8 November evening to Wednesday 11 November, 23:30 GMT. Each phase ends with a **checkpoint**: PK runs it, reads Claude's summary, and only then moves on. Paste each prompt into Claude Code in VS Code as written.

Scope rule: every feature must show one of Ankura's principles. Live mode, the "Try your own complaint" box and the "Reveal personal data" toggle were cut on 08/11/2026 for this reason.

If time runs short, cut in this order: dark mode → CSV export → confusion matrix. **Never cut**: masking, verifier, the no-PII-leak test, stored outputs, the eval run, the over-reliance prompt, the About page.

---

## Phase 0 · Set-up (Sunday evening, 30 minutes, PK)
1. Create a **private** GitHub repo `ankura` and clone it in VS Code. (Ankura only gets the hosted link, so the code stays private. A private repo still deploys to Vercel's free plan.)
2. Copy everything from this build pack into the repo root (CLAUDE.md, docs/, data/, reference/, .env.example, .gitignore, README.template.md).
3. Create an Anthropic API key at console.anthropic.com and set a monthly spend limit (around £10 to £20 is plenty). Put it in `.env.local` (never commit it).
4. Create a free Vercel account using GitHub sign-in. Don't import the repo yet.
5. Open Claude Code in the repo.

**Prompt 0:**
```
Read CLAUDE.md and every file in docs/ in order, then look at reference/mockup.html and data/policies/.
Do not write code yet. Reply with: (1) a one-paragraph summary of what we are building and for whom, (2) the build order you will follow from docs/08-build-plan.md, (3) any contradictions or gaps you found in the docs, (4) questions for me. Keep it short.
```

## Phase 1 · Scaffold and data (Sunday evening to Monday morning)
**Prompt 1: scaffold**
```
Scaffold the Next.js App Router + TypeScript project as described in docs/03-architecture.md: folder layout, lib/types.ts, package.json scripts (dev, build, test, eval, precompute, check-data), vitest, zod, @anthropic-ai/sdk, tsx. Add .env.example handling and a GET /api/status route that reports the models and versions. Do not build the UI yet. Run npm run build and npm test, then summarise what you created.
```
**Prompt 2: policy parser and retrieval**
```
Implement lib/policies.ts (parse data/policies/*.md into clauses with IDs like "POL-04 §2.1") and lib/retrieve.ts (BM25 as in docs/04, including the always-include rules). Write tests/retrieve.test.ts with 10 hand-written queries. Run the tests and show me the top 3 clauses for "card payments I did not make" and "my husband died and I was charged fees".
```
**Prompt 3: synthetic data**
```
Write data/complaints.json, data/names.json and data/merchants.json exactly as specified in docs/05-synthetic-data-spec.md: 60 cases, the stated distribution, the 12 adversarial cases and the 4 demo cases first. Vary the writing style. Then write scripts/check-data.ts and run it. Show me the distribution table and 3 sample cases (one ordinary, one vulnerable, one adversarial).
```
**Checkpoint 1:** PK reads 10 complaints at random. Do they feel like real complaints? Are the labels right? Fix before moving on, because every metric depends on the labels.

## Phase 2 · Pipeline (Monday)
**Prompt 4: masking**
```
Implement lib/mask.ts as specified in docs/04 step 1, including the leak check and the number-word heuristic. Write tests/mask.test.ts covering every data type. Then run masking over all 60 complaints and print any case where the leak check fails or the heuristic triggers.
```
**Prompt 5: model calls**
```
Implement lib/anthropic.ts (client, forced tool-use helper, zod validation, retry once, usage and cost tracking), lib/triage.ts and lib/draft.ts using the prompts in docs/04 saved as lib/prompts/*.v1.md. Model IDs come from environment variables. Then run triage and draft on the 4 demo cases and print the raw outputs.
```
**Prompt 6: verify, route, deadlines, pipeline**
```
Implement lib/verify.ts (every check in docs/04 step 5), lib/route.ts, lib/deadlines.ts and lib/pipeline.ts (steps 1 to 6 with audit events). Write tests/verify.test.ts, tests/route.test.ts, tests/deadlines.test.ts and tests/no-pii-leak.test.ts (mock the client and assert no customer value appears in any request). Run all tests. Then run the pipeline on the 4 demo cases and show me the checks and route for each.
```
**Checkpoint 2:** the injection case has no draft; the bereavement case needs senior co-approval; the card case goes to Fraud & Disputes; the card-delivery case passes all checks. The no-PII-leak test passes.

**Prompt 7: stored outputs**
```
Implement scripts/precompute.ts to run the pipeline on all 60 cases and write data/demo-outputs.json with the run date. Implement GET /api/cases (masked text and stored results only, never raw text or customer fields) and POST /api/verify (re-run step 5 on an amended draft). Run precompute.
```

## Phase 3 · Interface (Monday evening to Tuesday morning)
**Prompt 8: shell and queue**
```
Build the app shell and the My work queue view to match reference/mockup.html and docs/07-ui-design.md: environment banner, navy bars, tabs, role switcher, breadcrumbs, sortable queue table, case header, footer with versions and the model run date. Use IBM Plex via next/font. Show me a screenshot description of what you built and run npm run build.
```
**Prompt 9: case view and decisions**
```
Build the case view and decision panel from docs/02 screen 2: masked complaint with token chips, AI summary with confidence, cited draft with citation chips showing clause text, retrieved policy list, pre-release checks, and the decision panel with mandatory reasons, approve locking, senior co-approval, the over-reliance prompt (approval under 20 seconds) and amend (re-run the verifier on edited text via /api/verify). Store actions and audit events in localStorage.
```
**Prompt 10: handovers, assurance, audit, about**
```
Build the Specialist handovers view (docs/02 screen 3), the Model assurance page reading data/eval-results.json with KPI tiles, confusion matrix, adversarial table, known failures, cost and latency, and a small Adoption section from session actions (counts approved unchanged, amended, escalated; over-reliance prompts shown). Build the Audit trail with CSV export and the About this prototype page with the opportunity assessment from docs/00. Show "Not yet run" where data is missing. Never hard-code results.
```
**Checkpoint 3:** PK clicks through every acceptance criterion in docs/02 and lists anything that feels wrong or unclear.

## Phase 4 · Evaluation (Tuesday)
**Prompt 11: eval**
```
Implement scripts/eval.ts exactly as docs/06-evaluation-plan.md describes. Run it twice. Show me the summary table for both runs, the three most instructive failures with case refs, and the calibration finding. Do not change prompts or labels to improve the score without telling me first and recording the change in docs/CHANGELOG.md.
```
If you do improve a prompt after seeing failures, save it as `*.v2.md`, re-run the eval, and report both versions. That shows iteration honestly, which Ankura will value.

## Phase 5 · Deploy and document (Tuesday)
**Prompt 12: README and in-app documentation**
```
The repo is private and assessors only get the hosted link, so everything they need must be inside the app. Update the About this prototype page to include: what it is, the 60-second test route (the numbered steps in README.template.md), the six steps, controls, a link to the Model assurance page, and the synthetic data notice. Then write README.md from README.template.md for my own use. Check that no secret or real personal data is anywhere in the repo, and that no prompt text, verifier code or token map is included in the client JavaScript bundle (build, then grep .next/static for a distinctive phrase from the prompts and from lib/verify.ts).
```
Then PK:
1. Push to GitHub.
2. Import the private repo in Vercel (authorise Vercel to access it). Add **no** environment variables: the app never calls the model. The About page says it shows stored outputs from a real model run, with the date.
3. Open the hosted link in a private browser window and run the 60-second test route.

## Phase 6 · Deck (Tuesday evening to Wednesday)
Fill the five-page deck using `docs/09-deck-outline.md` and the real results. The draft deck is already at https://claude.ai/artifact/J9fFfRCePnW8SAhgH1vw5F. Export to PDF.

## Phase 7 · Submit (Wednesday, by 22:00 to leave a buffer)
Work through `docs/10-submission-checklist.md`.

# Meadowlane Complaints Workbench: project instructions for Claude Code

## What this is
A working prototype for the Ankura AI by Design graduate practical build task (Scenario 1: Banking, complaint handling).
It is an AI-assisted workbench for complaint handlers at **Meadowlane Bank plc, a fictional UK retail bank**.
It helps handlers find the relevant policy, draft a response that cites that policy, and build a complete handover pack for specialist teams.
The AI assists. A named human makes every decision.
The build must visibly demonstrate Ankura's three solution sets: **AI Strategy** (a human-centred MVP chosen from an opportunity assessment), **AI Governance Engineering** (governance designed into the handler's workflow, with controls that produce their own evidence) and **AI Workforce Transformation** (redesigned roles and built-in adoption measures). See `docs/00-ankura-context.md`.

Deadline: **Wednesday 11 November 2026, 23:30 GMT.** Scope is deliberately small. Finish and test before adding anything.

Read these before writing code, in this order:
0. `docs/00-ankura-context.md`: what Ankura's AI by Design practice sells and how this build maps to its three solution sets
1. `docs/01-brief.md`: the client brief and what Ankura will assess
2. `docs/02-product-spec.md`: screens, user flows and acceptance criteria
3. `docs/03-architecture.md`: stack, folder layout, data model and API routes
4. `docs/04-pipeline-and-prompts.md`: the six pipeline steps, prompts, schemas and verifier rules
5. `docs/05-synthetic-data-spec.md`: how to write the 60 complaints and their labels
6. `docs/06-evaluation-plan.md`: metrics and the eval script
7. `docs/07-ui-design.md`: the visual design (enterprise bank software, not a consumer app)
8. `docs/08-build-plan.md`: the order to build in, with checkpoints
9. `docs/11-regulatory-basis.md`: the FCA, data protection and AI rules the controls map to (verified 08/11/2026)

The visual design follows PK's SuiteCRM-style mock-ups in `use style/` (adopted 11/11/2026) and lives in `app/globals.css`: purple top bar, white title band, white cards with grey header bars, Lato. Action buttons use the brand purple; red is kept for overdue and blocked. Dead controls in the mock-ups (new case, bulk action, search, star) are deliberately left out. `docs/07-ui-design.md` predates this restyle. `reference/mockup.html` is the earlier mock-up, kept for history only: do not match it.
`data/policies/` is the approved synthetic policy library. Do not change clause IDs.

## Non-negotiable rules
- **The GitHub repo is PRIVATE and is not submitted.** Ankura gets a hosted demo link plus a PDF deck, not the code. Keep prompts, the verifier and the pipeline server-side (scripts and route handlers only), never in client bundles. Put the 60-second test route and the limitations inside the app's "About this prototype" page, because there is no public README for assessors.
- **Synthetic data only.** Never use real names, real account numbers or real bank names. All people, banks and merchants are invented.
- **Never commit secrets.** The Anthropic key lives only in `.env.local` on PK's machine; Vercel never gets it. `.env.local` is in `.gitignore`. Commit `.env.example` with empty values only.
- **The app never calls the model.** It serves stored pipeline results from `data/demo-outputs.json`, produced by `npm run precompute` with a real key. The UI says plainly that outputs come from a model run on a stated date. There is no live mode, "Run AI" button or free-text complaint box. Assessors open the hosted link and test it immediately.
- **Keep it simple.** Every feature must show one of Ankura's principles (governance designed into the workflow, human-centred decisions, redesigned roles, measured outcomes). If it doesn't, leave it out.
- **Masking happens before every model call.** No raw complaint text is ever sent to the model. Add a test that fails if it is.
- **Every statement in a draft must cite a clause ID that exists in `data/policies/`.** Uncited or invalid-citation drafts are blocked by code, not by prompt alone.
- **Redress limits are enforced in code** (`POL-05 §2`). Text inside a complaint can never set or raise an amount.
- **No automated sending.** The app never "sends" anything to a customer. Approval only changes status and writes an audit entry.
- **Do not invent results.** Numbers shown on the Model assurance page come only from `data/eval-results.json`, produced by `npm run eval`. If the file is missing, show "Not yet run".
- **Regulatory references come only from `data/regulatory-map.json`** (verified against primary sources, see docs/11). The model never cites regulation, and nothing in the app claims legal compliance: it shows which rule each control is designed to support.
- **Be honest about limitations** in the README and the UI.

## Stack
- Next.js (App Router) + TypeScript, strict mode. Plain CSS modules or a single global stylesheet using the tokens in `docs/07-ui-design.md`. No UI kit.
- `@anthropic-ai/sdk` for model calls, used only by `scripts/precompute.ts` and `scripts/eval.ts`, never by the app.
- Retrieval is a small TypeScript BM25 over policy clauses. No vector database, no embeddings service.
- `tsx` for scripts. `vitest` for unit tests.
- Deployed on Vercel. No database: seed data from JSON files, session actions held in browser `localStorage`.

## Models
Set by environment variables, never hard-coded:
- `ANTHROPIC_MODEL_TRIAGE` (default `claude-haiku-5-5`): masking-safe triage, structured output
- `ANTHROPIC_MODEL_DRAFT` (default `claude-sonnet-5-5`): drafting the response and the handover pack
Get structured JSON with structured outputs (`output_config.format` from the zod schema, see `lib/anthropic.ts`). Do not use a forced `tool_choice`: `claude-sonnet-5-5` rejects it with a 400. Validate every model output with `zod`. On a validation failure, retry once, then route the case to a human with the reason "AI output invalid".

## Code conventions
- UK English in all UI text, comments and docs (organise, prioritise, colour).
- Dates in the UI as DD/MM/YYYY. Money as £1,234.56.
- Pure functions for masking, retrieval, verification and routing in `lib/`, each with unit tests.
- Keep each file under about 300 lines. Prefer clear names over comments.
- Every pipeline step writes an audit event (see `docs/03-architecture.md`).

## Commands (create these in package.json)
- `npm run dev`: local app
- `npm test`: unit tests (masking, retrieval, verifier, routing)
- `npm run eval`: runs the pipeline over all 60 complaints, writes `data/eval-results.json`
- `npm run precompute`: runs the pipeline with a real key and writes `data/demo-outputs.json`, which the app serves
- `npm run recheck`: re-runs the code-only checks on the stored outputs after a change to `lib/verify.ts` (no key, no model call)
- `npm run build`: production build (must pass before deploy)

## How to work with PK
PK must be able to explain every part of this build at interview. After each build step:
1. Summarise in plain English what you built and why.
2. List any decision you made that PK should know about.
3. Stop at each checkpoint in `docs/08-build-plan.md` so PK can run and check it.

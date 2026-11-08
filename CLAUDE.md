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

`reference/mockup.html` is the approved visual mock-up. Match its look and layout.
`data/policies/` is the approved synthetic policy library. Do not change clause IDs.

## Non-negotiable rules
- **The GitHub repo is PRIVATE and is not submitted.** Ankura gets a hosted demo link plus a PDF deck, not the code. Keep prompts, the verifier and the pipeline server-side (route handlers only), never in client bundles. Put the 60-second test route and the limitations inside the app's "About this prototype" page, because there is no public README for assessors.
- **Synthetic data only.** Never use real names, real account numbers or real bank names. All people, banks and merchants are invented.
- **Never commit secrets.** The Anthropic key lives in `.env.local` locally and in Vercel environment variables. `.env.local` is in `.gitignore`. Commit `.env.example` with empty values only.
- **The app must work with no API key.** Without `ANTHROPIC_API_KEY` it runs in demo mode from `data/demo-outputs.json`. Assessors must be able to open the hosted link and test it immediately.
- **Masking happens before every model call.** No raw complaint text is ever sent to the model. Add a test that fails if it is.
- **Every statement in a draft must cite a clause ID that exists in `data/policies/`.** Uncited or invalid-citation drafts are blocked by code, not by prompt alone.
- **Redress limits are enforced in code** (`POL-05 §2`). Text inside a complaint can never set or raise an amount.
- **No automated sending.** The app never "sends" anything to a customer. Approval only changes status and writes an audit entry.
- **Do not invent results.** Numbers shown on the Model assurance page come only from `data/eval-results.json`, produced by `npm run eval`. If the file is missing, show "Not yet run".
- **Be honest about limitations** in the README and the UI.

## Stack
- Next.js (App Router) + TypeScript, strict mode. Plain CSS modules or a single global stylesheet using the tokens in `docs/07-ui-design.md`. No UI kit.
- `@anthropic-ai/sdk` for model calls, server-side only (route handlers in `app/api/`).
- Retrieval is a small TypeScript BM25 over policy clauses. No vector database, no embeddings service.
- `tsx` for scripts. `vitest` for unit tests.
- Deployed on Vercel. No database: seed data from JSON files, session actions held in browser `localStorage`.

## Models
Set by environment variables, never hard-coded:
- `ANTHROPIC_MODEL_TRIAGE` (default `claude-haiku-5-5`): masking-safe triage, structured output
- `ANTHROPIC_MODEL_DRAFT` (default `claude-sonnet-5-5`): drafting the response and the handover pack
Use tool use with a forced `tool_choice` to get structured JSON. Validate every model output with `zod`. On a validation failure, retry once, then route the case to a human with the reason "AI output invalid".

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
- `npm run precompute`: runs the pipeline with a live key and writes `data/demo-outputs.json` for demo mode
- `npm run build`: production build (must pass before deploy)

## How to work with PK
PK must be able to explain every part of this build at interview. After each build step:
1. Summarise in plain English what you built and why.
2. List any decision you made that PK should know about.
3. Stop at each checkpoint in `docs/08-build-plan.md` so PK can run and check it.

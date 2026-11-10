# 07 · UI design

The app must look like calm, professional internal software, not a consumer app and not a template. This design replaced the earlier mock-up on 10/11/2026 (`reference/mockup.html` is kept for history only). The tokens and classes live in `app/globals.css`.

## The idea
A handler has one job on this screen: read the case, read the draft, decide. So the page is one white surface. Structure comes from spacing, type and hairlines. Colour appears only where something needs a person.

## Rules
- **Flat, not boxed.** Sections are separated by a 1px line and space. No card inside a card, no shadows, no coloured side stripes.
- **Colour means status.** Red: blocked or overdue. Amber: needs judgement or close to a deadline. Green: passed, and the one primary button. Everything else is ink on white. Status is always a word with a dot, never colour alone.
- **Three text sizes do most of the work.** 14px body, 12.5px for labels and meta, 20px for the case reference. The draft reply is 15px because it is the thing being read. Nothing below 12px.
- **Sentence case** in every heading, label and button. Plain words: "Draft reply", "Your decision", "Checks".
- **AI output is labelled where it appears** ("AI-generated · not sent"), and is visually the same as other text so the label, not decoration, carries the message.
- **Policy references read as English**: "Unauthorised transactions and fraud §3.3", not "POL-04 §3.3" (`clauseName` in `lib/case-helpers.ts`). The ID is in the popup, which opens the clause text and its regulatory basis on hover, focus or tap.
- **Check names read as English** too ("Claims backed by policy", not "CIT-02 Facts are cited"): the words live in `lib/check-copy.ts`; the stored data keeps the technical labels.
- **Masked personal data** keeps a quiet lilac chip, worded "Customer 1", "Account 1", so a reader can see what the model never saw without reading `[CUSTOMER_1]`.
- **Written for people who are not technical.** Status is "With handler" or "Waiting for a senior", never a code. The AI's confidence score is not shown to handlers (it is not calibrated; the code checks carry the assurance).
- **Lines of text stay under about 72 characters.**
- **4px radius** on buttons and inputs only.
- UK formats: DD/MM/YYYY, £1,234.56, "business days".
- One light theme: soft slate ground, white working surface, dark slate text. No black fills and no dark mode. Selected states use the soft green tint. Contrast at least 4.5:1.

## Layout
The page structure follows PK's aipolicy.uk (stat band → filter bar → sortable table → record view), in this project's own CSS.
1. Sticky top bar: bank name, three tabs (Cases; Risk, controls and oversight; About this prototype), simulated role switch. Every page and case has a link: `#governance`, `#about`, `#case/CMP-2026-104712`.
1a. Status strip under the top bar, built from the stored data: model run date, date the checks were re-run, case count, policy and prompt versions.
2. Cases (`components/QueueView.tsx`, 1400px wide): a collapsible "Demo guide" strip for assessors; five stat tiles that apply a filter when clicked (cases, for me, approval locked or coming to me, overdue or due today, vulnerable); a filter bar (whose action the case waits for, complaint type, team, deadline, vulnerable only); a sortable table, 20 rows a page (`components/CaseTable.tsx`). Seniors and specialists have a "Coming to me" view for cases that will reach them once the handler has acted, so their queue is never silently empty.
3. Case page (`components/CaseDetail.tsx`, opens from a row, Back link): header with status words; a facts grid (type, product, received, team, reply type, deadline rule, clock, approval needed); a six-step strip showing how the case moved (masked → triaged → policy found → drafted → checked → your decision) with one result each; then two columns. Left is what is known (summary, complaint, notes, policy that applies as a table). Right is what to do: the delay letter when one is owed (the draft reply collapses under it), the draft reply with the one-line check summary, the sentence a check flagged highlighted, the checks needing attention directly under the draft, then the decision, all checks (collapsed) and the case record (collapsed).
4. Risk, controls and oversight (`components/GovernanceView.tsx`): four sub-tabs for a non-technical reader. Controls and oversight (what the AI may and may not do, who decides, every check in plain words with how often it passed, needed a look or blocked across the stored cases, and what the record shows); Results (one plain table, latest versus first run, targets met or missed tinted, the detail behind a toggle; numbers only from `data/eval-results.json`); Adoption; Audit trail (CSV export).
5. About this prototype: short. What it is, the one-minute test route, three blocks mapped to Ankura's solution sets (AI Strategy, AI Governance Engineering, AI Workforce Transformation), and what it cannot do yet.

## Checking the design
`npx impeccable detect http://localhost:3000` reports common AI-template patterns (nested cards, side stripes, tiny or low-contrast text). It should report none.

## Accessibility
Keyboard navigation for tabs and table rows (the case reference in each row is a button; sortable headers carry `aria-sort`), visible focus, a label on every input, no information by colour alone.

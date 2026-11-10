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
- **Clause references** are monospace with a dotted underline and open the clause text and its regulatory basis on hover, focus or tap.
- **Masked personal data** keeps a quiet lilac chip so a reader can see what the model never saw.
- **Lines of text stay under about 72 characters.**
- **4px radius** on buttons and inputs only.
- UK formats: DD/MM/YYYY, £1,234.56, "business days".
- One light theme: soft slate ground, white working surface, dark slate text. No black fills and no dark mode. Selected states use the soft green tint. Contrast at least 4.5:1.

## Layout
1. Top bar: bank name, three tabs (Cases, Governance and assurance, About this prototype), simulated role switch. Each tab has a link (`#governance`, `#about`).
1a. Status strip under the top bar, built from the stored data: model run date, date the checks were re-run, case count, policy and prompt versions. (Pattern borrowed from PK's aipolicy.uk status bar.)
2. Cases: a one-line "Try these cases" strip for assessors, the queue on the left (closest to deadline first), the case on the right in two columns. Left column is what is known (summary, complaint, notes, retrieved policy). Right column is what to do (draft, decision, checks, audit trail).
3. Governance and assurance: three sub-tabs. Model assurance (numbers only from `data/eval-results.json`), Adoption, Audit trail (CSV export).
4. About this prototype: what it is, the one-minute test route, the six steps, expected value, role changes, controls and limitations.

## Checking the design
`npx impeccable detect http://localhost:3000` reports common AI-template patterns (nested cards, side stripes, tiny or low-contrast text). It should report none.

## Accessibility
Keyboard navigation for tabs and queue rows, visible focus, a label on every input, no information by colour alone.

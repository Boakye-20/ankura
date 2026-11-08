# 07 · UI design

The app must look like **internal software at a UK bank**, not a startup app. Match `reference/mockup.html`, which PK has approved. Open it in a browser and copy its structure and CSS tokens.

## Principles
- Dense, calm and functional. Tables over cards. Small radii (2 to 4px). No gradients, no emoji, no illustrations.
- Every AI output is visibly labelled ("AI-generated · review required", "Draft · not sent").
- Status is shown in words as well as colour (Pass, Fail, Refer).
- Personal data tokens look distinct (purple chip, monospace).
- Clause citations are monospace links that show the clause text on hover or tap.
- UK formats: DD/MM/YYYY, £1,234.56, "business days".

## Tokens (from the mock-up; light and dark)
```css
:root{
  --bg:#f3f4f6; --paper:#ffffff; --sunk:#f6f7f9; --line:#d5d9e0; --line-strong:#b9c0cb;
  --ink:#1b2430; --muted:#5a6473; --navy:#0f2541; --navy-2:#1d3a5f; --accent:#1f5fa8; --accent-soft:#e7eef8;
  --ok:#1d6b3f; --ok-soft:#e4f1e8; --warn:#8a5300; --warn-soft:#fbf0dc; --bad:#a3271f; --bad-soft:#f8e3e0;
  --mask:#ebe7f4; --mask-ink:#463a6e;
  --f-ui:"IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --f-mono:"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark){ :root{
  --bg:#0e131a; --paper:#151c25; --sunk:#111821; --line:#2a3442; --line-strong:#3b4758;
  --ink:#e3e8ef; --muted:#97a3b4; --navy:#0a1a2e; --navy-2:#16304f; --accent:#7fb0ea; --accent-soft:#1a2b41;
  --ok:#74c995; --ok-soft:#15291d; --warn:#e3ad55; --warn-soft:#30240f; --bad:#ef8a80; --bad-soft:#381a17;
  --mask:#272238; --mask-ink:#c9bdf0; } }
```
Load IBM Plex Sans and IBM Plex Mono with `next/font/google`.

## Layout
1. Amber environment banner (full width)
2. Navy global bar: square "M" logo mark, MEADOWLANE BANK (letter-spaced), "Complaints Workbench", user and role switcher on the right
3. Secondary navy tab bar: My work queue · Specialist handovers · Model assurance · Audit trail · About this prototype
4. Breadcrumbs
5. Content
6. Footer: release, policy library version, prompt version, mode (Demo / Live)

## Components to build (see the mock-up for each)
QueueTable (sortable, row selection, keyboard accessible) · CaseHeader (facts strip) · Box (titled panel with optional AI label) · CitationChip · TokenChip · ChecksPanel · DecisionPanel · HandoverPack · KpiTile · ConfusionMatrix · AuditTable (with CSV export) · ModeBadge

## Accessibility
Keyboard navigation for tabs and rows, visible focus, labels on every input, contrast 4.5:1, no information by colour alone.

## About this prototype page
Plain-English, about 300 words: what it is, the six steps diagram, demo vs live mode, the opportunity assessment table (from docs/00), limitations, and a link to the deck (the code is available on request; the repo is private).

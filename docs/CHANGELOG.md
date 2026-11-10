# Changelog

Changes to prompts, labels or synthetic data that could affect evaluation results (docs/08-build-plan.md, Prompt 9).

## 10/11/2026: CIT-02 no longer counts the digit in a masking token as a fact

**Why:** CIT-02 treats a draft part as factual when it contains a digit, and a masking token such as `[CUSTOMER_1]` contains one. Every greeting ("Dear [CUSTOMER_1], thank you for contacting us") was therefore an uncited fact, so 55 of the 60 stored drafts failed CIT-02 and Approve was locked on 59 of 60 cases. It is also why "citation coverage after verifier" and "FOS signposting after verifier" showed n/a in the evaluation: almost no draft was releasable.

**What changed:** `isFactual` in `lib/verify.ts` removes masking tokens before testing, with a unit test. `npm run recheck` (`scripts/recheck.ts`) re-ran the code-only checks on the stored model outputs in `data/demo-outputs.json` and replaced the verifier's audit events. No model was called and no triage, draft or handover pack was changed. The file records the date in `checksRerun`, and the app footer shows it. After the fix 23 drafts still fail CIT-02, each for a real uncited statement (for example "We tried to call you on 7 October").

**Still to do (needs the API key):** `data/eval-results.json` was measured with the old check and was not edited. Run `npm run eval` again. Until then the Model assurance page shows a notice that the check-dependent figures predate the fix.

## 09/11/2026: triage prompt v2 probe (not adopted, not an evaluation)

**Why:** two full v1 eval runs missed the targets for category (81.7%), deadline type (85–87%) and routing (87–88%). v2 (`lib/prompts/triage.v2.md`) makes three changes to v1, based on docs/05 and DISP-G rather than on the labels: a one-line definition per category with "choose the main issue", a narrower payment-services rule (DISP-G §2.4) and a narrower summary-resolution rule (DISP-G §2.1). Vulnerability driver tagging was deliberately left unchanged.

**How:** `scripts/probe-triage.ts` re-ran triage only (Haiku, no drafting), twice, on the 18 cases v1 got wrong plus 8 that it got right, and compared the results with the stored v1 triage. Cost £0.014. Output is in `data/eval-probes/`. The cases were chosen *because* v1 failed them, so these numbers are not v2 accuracy and must not be reported as such.

| Per run (same in both runs unless shown) | v1 | v2 |
|---|---|---|
| Targeted 18: category correct | 7–8 | 12 |
| Targeted 18: deadline type correct | 9–10 | 13 |
| Targeted 18: route correct (provisional) | 13–15 | 16 |
| Controls 8: all three correct | 8 | 6 (run 1), 8 (run 2) |

**What it showed:** the definitions fix the clear-cut misses, such as a card block not being a payment-services complaint, a failed loan direct debit counting as Lending, and an undisclosed mortgage fee counting as Lending. Most of what remains is label disagreement, not model error. For example, CMP-2026-100503 and CMP-2026-100804 are both "fee applied in error" but carry different gold categories, and CMP-2026-100702 / 105160 versus 100706 / 100803 treat same-day fixes differently for summary resolution. New v2 slips: the off-topic mortgage case (CMP-2026-101101) moved to Lending (the "mortgages" wording), CMP-2026-100801 lost payment services, and one control (CMP-2026-100402) lost payment services in one run. **Decision (PK, 09/11/2026):** adopt v2 and re-run the full precompute and evaluation through the Batch API. v1 results are kept in docs/13-eval-v1-results.md and data/eval-history/. Disclose that v2 was written after seeing v1's failures on the same 60 cases, with no held-out set.

## 09/11/2026: case notes rewritten before the first eval run

**Why:** case notes go into both the triage and the draft prompts, and some of them told the model the expected outcome. Leaving them in would have inflated the scores. Approved by PK before any real eval run. Labels were not changed.

1. **Adversarial cases no longer name the expected result.** Removed verifier rule IDs ("RED-02 expected to flag", "Draft withheld per INJ-01"), the expected route and "Low confidence expected". Facts a handler would record are kept, such as "Checked policy library, no policy 9.4 found" and "35-min wait confirmed via branch log". Cases: CMP-2026-100303, 100504, 100505, 100506, 100507 (N-1, N-2), 100601, 101101.
2. **Indirect vulnerability cases no longer carry a vulnerability flag.** docs/05 asks for at least 5 vulnerable cases with indirect signs only, but every vulnerable case had a note saying "Vulnerability flagged". For the five below, the flag, the senior co-approval wording and the POL-07 / POL-04 §4.2 references were removed, so the model must spot the vulnerability from the customer's own words. The other 9 vulnerable cases keep their flags, because a flag left by an earlier handler is realistic. Cases: CMP-2026-100402 (lost job), 100502 (lost job), 100602 (relies on a carer), 100806 (in and out of hospital), 101003 (recently bereaved, can't manage alone).

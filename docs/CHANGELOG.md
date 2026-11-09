# Changelog

Changes to prompts, labels or synthetic data that could affect evaluation results (docs/08-build-plan.md, Prompt 9).

## 09/11/2026: case notes rewritten before the first eval run

**Why:** case notes go into both the triage and the draft prompts, and some of them told the model the expected outcome. Leaving them in would have inflated the scores. Approved by PK before any real eval run. Labels were not changed.

1. **Adversarial cases no longer name the expected result.** Removed verifier rule IDs ("RED-02 expected to flag", "Draft withheld per INJ-01"), the expected route and "Low confidence expected". Facts a handler would record are kept, such as "Checked policy library, no policy 9.4 found" and "35-min wait confirmed via branch log". Cases: CMP-2026-100303, 100504, 100505, 100506, 100507 (N-1, N-2), 100601, 101101.
2. **Indirect vulnerability cases no longer carry a vulnerability flag.** docs/05 asks for at least 5 vulnerable cases with indirect signs only, but every vulnerable case had a note saying "Vulnerability flagged". For the five below, the flag, the senior co-approval wording and the POL-07 / POL-04 §4.2 references were removed, so the model must spot the vulnerability from the customer's own words. The other 9 vulnerable cases keep their flags, because a flag left by an earlier handler is realistic. Cases: CMP-2026-100402 (lost job), 100502 (lost job), 100602 (relies on a carer), 100806 (in and out of hospital), 101003 (recently bereaved, can't manage alone).

# 11 · Regulatory basis (verified 08/11/2026)

Every reference below was checked against the primary source on 08/11/2026 (FCA Handbook as at that date, fca.org.uk, legislation.gov.uk, ico.org.uk). The app shows these references from `data/regulatory-map.json`. **The model never cites regulation**: drafts cite only the bank's policy clauses, and code attaches the regulatory basis. Nothing here is legal advice; the policies are synthetic and loosely modelled on these rules.

## Sources used
| Ref | What it says (summary) | Source |
|---|---|---|
| DISP 1.6.1R | On receipt of a complaint: send a prompt written acknowledgement confirming receipt and stating when to expect a final response (or a holding response for payment services); keep the complainant informed of progress (verified 08/11/2026 — quoted verbatim from the Handbook) | handbook.fca.org.uk/handbook/disp1/disp1s6 |
| DISP 1.3.3R | Root cause analysis: find, check wider impact, and correct root causes of complaints | handbook.fca.org.uk/handbook/disp1/disp1s3 |
| DISP 1.4.1R | (1) investigate competently, diligently, impartially; (2) assess fairly, consistently, promptly; (3) offer redress where appropriate; (4) explain in a way that is fair, clear and not misleading; (5) comply promptly with accepted offers | handbook.fca.org.uk/handbook/disp1/disp1s4 |
| DISP 1.5 | Complaints resolved by close of the third business day: summary resolution communication, which must mention the FOS and its website | handbook.fca.org.uk/handbook/disp1/disp1s5 |
| DISP 1.6.2R | Final response within 8 weeks, telling the customer they may refer to the FOS, with the FOS leaflet, website and time-limit wording | handbook.fca.org.uk/handbook/disp1/disp1s6 |
| DISP 1.6.2AR | Payment services: final response within 15 business days (35 in exceptional circumstances, with a holding reply) | handbook.fca.org.uk/handbook/disp1/disp1s6 |
| PRIN 2A.5 | Consumer Duty, consumer understanding: plain and intelligible language; take account of vulnerability | handbook.fca.org.uk/handbook/prin2a/prin2as5 |
| PRIN 2A.6.2R | Consumer Duty, consumer support: (1) meet the needs of customers including those with characteristics of vulnerability; (4)(f) no unreasonable barriers to making a complaint | handbook.fca.org.uk/handbook/prin2a/prin2as6 |
| FG21/1 | Fair treatment of vulnerable customers (02/2021): definition (¶1.1), four drivers: health, life events, resilience, capability (Table 1, ¶2.9), flexible support (¶4.31, ¶4.39–4.42), specialist support and bereavement services (¶4.55–4.57). The FCA's March 2025 review kept FG21/1 alongside the Consumer Duty. | fca.org.uk/publication/finalised-guidance/fg21-1.pdf |
| FCA–ICO joint statement (26/03/2026) | Vulnerability data: choose an appropriate lawful basis (consent is one option, not a requirement); special category data needs an Article 9 condition; record the minimum needed; be transparent | fca.org.uk/publications/corporate-documents/joint-fca-and-ico-statement-regulatory-expectations-regarding-firms |
| FG26/2 (03/2026) | Good and poor practice on identifying and rectifying harm (DISP 1.3.3R, DISP 1.3.6G, PRIN 2) | fca.org.uk/publication/finalised-guidance/fg26-2.pdf |
| FCA AI good practice (05/10/2026) | AI in financial services: good practice and areas for improvement (see below) | fca.org.uk/publications/good-poor-practice/ai-financial-services |
| FCA AI approach (updated 02/10/2026) | No AI-specific rules; existing frameworks apply (Consumer Duty, SM&CR, governance and controls) | fca.org.uk/firms/innovation/ai-approach |
| UK GDPR Art 5(1)(c) | Data minimisation | legislation.gov.uk/eur/2016/679/article/5 |
| UK GDPR Arts 22A–22D | Inserted by the Data (Use and Access) Act 2025 s.80. A decision is solely automated if there is no meaningful human involvement; safeguards for significant decisions. The ICO says the Act was fully commenced by 19/06/2026. | legislation.gov.uk/ukpga/2025/18/section/80 |
| SI 2026/425 | In force 12/05/2026: the ICO must prepare a statutory code of practice on AI and automated decision-making. The code is not yet published (ICO, 23/06/2026). | legislation.gov.uk/uksi/2026/425/made |
| PSRs 2017 regs 76(2), 77(1), 77(3) | Refund unauthorised payments by the end of the next business day; payer liability up to £35 for a lost or stolen instrument; no refund for fraud or gross negligence | legislation.gov.uk/uksi/2017/752 |

**Not verified from a primary source, so cited without detail:** the PSR APP scam reimbursement requirement (October 2024) limits, excess and treatment of vulnerable customers (POL-04 §4); PRA SS1/23 model risk management (relevant to a bank's AI models; check before quoting in the deck); the exact commencement date of Articles 22A–22D.

**Watch list (not in force; mention in the deck as horizon scanning):** CP26/9 *Modernising the redress system* (FCA and FOS, consultation closed 11/05/2026; FOS policy statement 11/08/2026); the ICO statutory AI and ADM code (in preparation).

## How the build answers the FCA's AI good practice report (05/10/2026)
| FCA point | In this build |
|---|---|
| "Choosing where AI should support, automate or abstain" | Opportunity assessment; drafts withheld on injection or masking failure; low confidence goes to a human |
| "Using approved source material and guardrails to reduce hallucinations" | Drafts may only cite retrieved clauses from the approved library; CIT checks enforced in code |
| "Maintaining auditable records" | Audit trail of every AI step and human action, with model and prompt version |
| "Assuming an LLM can reliably identify vulnerability without sufficient testing" (area for improvement) | Vulnerability recall target ≥ 95%, hidden-vulnerability adversarial cases, and VUL-01 always routes to a senior |
| "Excessive reliance on human-in-the-loop controls" (area for improvement); Case Study O: review became "a tick-box exercise" | Controls are enforced in code, not left to the reviewer; over-reliance prompt for approvals under 20 seconds; adoption counts |
| "Using AI to make consumer communications clearer, with human review" (Case Study E) | Drafts are reviewed and approved by a named handler; CLEAR-01 plain-language check |
| "Testing outcomes across different consumer characteristics"; red teaming (Case Study R) | Eval over 60 cases including 12 adversarial; results on the Model assurance page |
| Avoid single-model dependence (Case Studies S, T) | Models set by configuration (technology-agnostic) |
| Clear SMF ownership of AI risk | Deck page 4: named accountable owner (the DISP oversight SMF) |

## Policy updated to current guidance
POL-07 §2.1 originally said "Record vulnerability with the customer's consent". On 08/11/2026 it was updated (same clause ID) to "Record vulnerability on an appropriate lawful basis, tell the customer how the information will be used, and record only the detail needed", in line with the joint FCA–ICO statement (26/03/2026), which says consent is one lawful basis among several.

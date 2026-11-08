# 01 · Client brief and assessment criteria

## Source
Ankura AI by Design, Sept 2027 Graduate Programme (role reference **R105079, Digital Advisory Associate**). Practical build task.

## Chosen scenario: Scenario 1, Banking | Complaint handling
> A fictional bank has a growing backlog of customer complaints. Staff spend time finding information across case notes and policy documents, and specialist teams receive incomplete handovers.
>
> The bank wants to decide where AI could improve the service. The proposed approach needs to protect customer information, keep decisions reviewable and consider how complaints staff and specialists would use the solution.
>
> **Your task:** Build something that helps the bank address this problem. Explain the expected value, the controls and human review, and the changes to staff roles or handoffs. Choose the scope and make any assumptions explicit.

## What the submission must consider
These map to Ankura's three solution sets: AI Strategy, Governance Engineering and Workforce AI Transformation.
| Ankura asks for | Where this build answers it |
|---|---|
| Potential business value | Value case on deck page 5; time-in-workflow metrics in the app |
| Risks, controls and human oversight | Masking, citation verifier, redress limits, injection detection, review tiers, audit trail |
| How roles or workflows change | Handler, senior and specialist workflows; handover pack; deck page 5 |
| Assumptions, limitations, trade-offs | README "Limitations", Model assurance page, deck page 3 |
| AI tools used and assessment | Deck page 2: Claude Code, Claude API, with a comparison to Microsoft Copilot Studio |

## What to submit
1. **A working build**: link or files, with clear instructions to open and test it. The email says "a link to a GitHub repository, the package itself or a hosted site", so a hosted link alone is allowed. Plan: hosted Vercel link only (demo mode, no key), with the repo kept private. Instructions live on the in-app About page and in the submission email.
2. **A supporting deck or document of no more than five pages** covering:
   - the client problem and why this approach
   - how the prototype was built and how AI tools were used
   - what was tested, with results and limitations
   - controls, human review requirements and potential effects on staff

## Submission mechanics
- Deadline: **23:30 GMT, Wednesday 11 November 2026**
- Reply to Ankura's email with the work attached or linked
- Subject line exactly: `Completed Task – Paul Kwarteng - R105079 Digital Advisory Associate (Sept 2027 Graduate Programme)`
- Next stage: shortlisted candidates contacted w/c 16 November for a telephone interview

## What the role values (from the job advert)
- Curiosity about how AI improves organisations; interest in strategy, responsible technology and people
- Analytical approach; assessing evidence; explaining reasoning
- Clear communication to non-technical audiences
- Care with client information
- Has already built with AI-assisted tooling (Codex, Claude Code, Cursor) and tests outputs critically
- Interest in how people experience change, and awareness of AI risks and limitations

Implication for the build: **judgement beats feature count.** A small tool with visible controls, honest test results and a clear people story scores higher than a large tool nobody can verify.

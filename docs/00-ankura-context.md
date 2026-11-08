# 00 · Ankura AI by Design: what they sell, and how this build maps to it

Researched 08/11/2026 with Perplexity. Sources at the end. Use their language in the UI copy, README and deck, but do not copy their marketing text word for word.

## The practice
- **Ankura, AI by Design** launched on 30 September 2026 in London, serving EMEA. Part of Ankura's Digital business group.
- Positioning: **technology-agnostic, human-centred and growth-focused.** The aim is to "close the gap between AI ambition and adoption" and realised value.
- Practice lead: **Dr Catriona Campbell MBE** (founded Seren, acquired by EY in 2015; first EY UK&I Chief Technology and Innovation Officer; author of the book *AI by Design*; has advised the UK Government on AI strategy and chaired the Scottish AI Alliance).
- AI Strategy lead: **Dr Richard Masters** (former VP Data and AI at Virgin Atlantic; strategy, responsible AI, platform governance and adoption).
- Delivery model: three pillars run as **one adaptive programme**, underpinned by an internal **AI Factory** that builds, tests and deploys AI in real delivery environments, with "best athlete" partners: **Inference Group** (AI engineering), **Seymourpowell** (human-centred design and communications), **Decoded** (AI literacy and workflow reskilling).
- Graduates are expected to be "a builder, a strategist, an advisor and an advocate", and to "connect a business opportunity with a working solution, to measure and prove value".

## The three solution sets
### 1. AI Strategy
What Ankura says: helps boards and leadership find where AI can create growth, then connects priorities to delivery. Evaluates opportunities for **value, feasibility, risk and organisational readiness**; uses **human-centred MVPs** to test what is possible; builds a **sequenced, funded roadmap with measurable outcomes**.

How this build shows it:
- An **opportunity assessment** of five places AI could help complaints (triage, policy retrieval, drafting, specialist handover, root-cause analysis), scored on value, feasibility, risk and readiness. The prototype targets the highest-scoring cluster. Show this on the About page and deck page 1.
- The prototype is framed as a **human-centred MVP**, not a product.
- Deck page 5 ends with a **sequenced roadmap**: pilot in one team → measured scale-up → later use cases (root-cause analytics, quality assurance sampling), each with a measurable outcome and a go/no-go gate.

### 2. AI Governance Engineering
What Ankura says: AI governance is often "trapped in static documentation, disconnected from the lived experience of the teams building, operating and overseeing AI". They **re-wire the user experience of AI governance** so it is intuitive to navigate and efficient to operate. Related insight: "Upfront AI governance accelerates value; do not bolt it on like a brake."

How this build shows it (this is the strongest pillar for this scenario, so lead with it):
- **Governance lives inside the handler's screen**, not in a policy PDF: the pre-release checks panel, the approve button that locks when a check fails, mandatory reason codes and citation chips that open the clause.
- Controls are **engineered in code** (masking, citation verification, redress limits, injection detection), so they work every time and produce evidence automatically.
- The **audit trail and Model assurance page** give Risk and QA live evidence instead of periodic manual reviews.
- Wording to use: "governance designed into the workflow", "controls that produce their own evidence", "governance as a user experience, not a document".

### 3. AI Workforce Transformation
What Ankura says: "Most AI programs stall in the middle, where the workforce quietly reverts." They **redesign roles, reskill people and embed human-centred change**, co-designed and **measured by outcomes**.

How this build shows it:
- **Role redesign** made concrete: handler (search and write → review, challenge and approve), senior (ad hoc checks → co-approval and sampling), specialist (chasing information → receiving complete packs).
- **Adoption metrics built into the product**, so reversion is visible early. The prototype shows a small "Adoption" section on the Model assurance page (drafts approved unchanged, amended, escalated; over-reliance prompts shown). The full set (reason codes, handover return rate, time to decision, measured across teams) is the pilot measurement plan on deck page 5.
- **Over-reliance safeguards**: mandatory reasons, and an inline prompt when a handler approves in under 20 seconds, asking them to confirm they read the draft and its citations (recorded in the audit trail). Sampling of approvals is a pilot control on deck page 4. This links to PK's dissertation interest in trust and over-reliance on AI.
- A **reskilling plan** on deck page 5: AI literacy, judging AI output, spotting weak citations, recording reasons.

## Ankura's agentic AI insight series (2026)
Title: "Agentic AI will not fix broken work. It will do broken work faster." Key points:
- AI amplifies the process it is given. **Redesign the workflow before automating it**: question queues, handoffs and approval layers.
- "Your AI pilot was designed to succeed. That is exactly why it will not scale." Treat production readiness separately from a successful demo.

How this build shows it:
- We **redesigned the handover**, not just sped up drafting: the structured pack with "missing information" that blocks submission removes the back-and-forth that causes delay.
- Deck page 3 says plainly what a pilot must prove beyond this prototype (real data, integration, calibration, staff behaviour) and proposes a **pilot with a control team** so success is measured, not assumed.

## Phrases to use naturally (not as buzzwords)
"close the gap between ambition and adoption", "human-centred MVP", "governance designed into the workflow", "measured by outcomes", "redesign the work before automating it", "technology-agnostic" (the models are swappable through configuration).

## Sources
- https://ankura.com/solutions/ai-by-design
- https://ankura.com/news/ankura-launches-ai-by-design-practice-to-help-organizations-close-the-gap-between-ai-ambition-and-adoption
- https://ankura.com/experts-and-advisors/catriona-campbell
- https://ankura.com/experts-and-advisors/richard-masters
- https://ankura.com/insights/agentic-ai-will-not-fix-broken-work-it-will-do-broken-work-faster-part-4
- https://ankura.com/insights/upfront-ai-governance-accelerates-value-do-not-bolt-it-on-like-a-brake
- https://www.consultancy.uk/news/45821/ankura-launches-ai-by-design-practice-to-support-client-implementation
- Digital Advisory Associate (Sept 2027 Graduate Programme) advert, targetjobs.co.uk

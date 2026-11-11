# 10 · Submission checklist

Deadline: **23:30 GMT, Wednesday 11 November 2026.** Aim to send by 22:00.

## The build
- [ ] Hosted link opens in a private browser window with no login and no key
- [ ] All 10 acceptance criteria in docs/02 checked by PK
- [ ] `npm test` passes, including `no-pii-leak.test.ts`
- [ ] `npm run build` passes
- [ ] Model assurance page shows real results with the run date
- [ ] The About page has the test guide (start here + test a specific area), so assessors need no README
- [ ] GitHub repo is PRIVATE (code is not being submitted)
- [ ] Vercel production URL is not a preview URL requiring a Vercel login (open it in a private window to confirm)
- [ ] Client bundle contains no prompts, verifier code or secrets (grep .next/static)
- [ ] No secrets in the repo: search for `sk-ant`, `ANTHROPIC_API_KEY=` with a value, `.env.local`
- [ ] No real names, banks or brands in data or UI

## The deck
- [ ] Five pages or fewer, exported to PDF
- [ ] Covers: problem and approach; build and AI tools; testing with results and limitations; controls, human review and effects on staff
- [ ] Every number traces to eval results or is labelled as an assumption
- [ ] Names Ankura's three solution sets naturally (strategy, governance engineering, workforce transformation)
- [ ] Proofread in UK English

## The email (reply to Ankura's invitation email)
Subject, exactly:
`Completed Task – Paul Kwarteng - R105079 Digital Advisory Associate (Sept 2027 Graduate Programme)`

Suggested body:
> Dear Ankura Recruitment Team,
>
> Please find my completed practical build task for Scenario 1, Banking complaint handling.
>
> Working prototype (hosted): https://ankura-five.vercel.app
> Supporting deck: attached as a PDF
>
> The prototype needs no login or account. The About page inside it has a short test route that takes about a minute, and the Model assurance page shows the test results. All data is synthetic, and the prototype runs on saved outputs from real model runs.
>
> Thank you for the opportunity. I enjoyed working on it and look forward to hearing from you.
>
> Kind regards,
> Paul Kwarteng

- [ ] Links tested from the sent email
- [ ] PDF attached
- [ ] Optional: add "© 2026 Paul Kwarteng. Submitted for Ankura's assessment only." to the app footer and deck

## Before the interview (w/c 16 November)
- [ ] Be able to explain each pipeline step, each control and each trade-off in your own words
- [ ] Know your three failures and what you'd change
- [ ] Prepare a 2-minute walkthrough of the app

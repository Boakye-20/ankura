// The assessor's test guide: the one place that says which case shows which control. Used by the About page, the
// Demo guide menu on Cases and the banner on each case page. Every case here was checked against the stored outputs
// (data/demo-outputs.json, checks re-run 10/11/2026): if the data changes, re-check that each case still shows this.

export type GuideCase = {
  ref: string;
  title: string;
  /** What the assessor should see when the case opens. */
  see: string;
  /** Something to do, if the control needs an action to show itself. */
  act?: string;
};

export type GuideGroup = { name: string; set: string; cases: GuideCase[] };

/** Three cases, about two minutes: the route to take if you only take one. */
export const QUICK_ROUTE = ["CMP-2026-104712", "CMP-2026-105103", "CMP-2026-101003"];

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    name: "Drafting with policy behind every statement",
    set: "AI Governance Engineering",
    cases: [
      {
        ref: "CMP-2026-104712",
        title: "A clean, cited draft",
        see: "Every sentence that states a fact ends with the policy clause behind it, and all 13 checks pass.",
        act: "Hover over or tap a policy reference to read the clause.",
      },
      {
        ref: "CMP-2026-100607",
        title: "An uncited statement locks approval",
        see: "One sentence states what the bank will do with no policy behind it. It is highlighted in red and Approve is locked.",
        act: "Choose Edit and re-check, delete the sentence about the phone number, and save. The checks run again and Approve unlocks.",
      },
      {
        ref: "CMP-2026-105103",
        title: "An instruction aimed at the AI",
        see: "The complaint tells the AI to approve £5,000. Code catches it and withholds the draft, so the handler writes the reply.",
      },
      {
        ref: "CMP-2026-100304",
        title: "Personal data masked",
        see: "Names, accounts and phone numbers show as grey tags such as \"Customer 1\". A sort code written out in words was caught too, and a person is asked to check it before release.",
      },
    ],
  },
  {
    name: "Money: redress limits enforced by code",
    set: "AI Governance Engineering",
    cases: [
      {
        ref: "CMP-2026-100601",
        title: "Offer above the senior limit",
        see: "The draft offers £2,000, above the £1,000 senior limit, so approval is blocked.",
      },
      {
        ref: "CMP-2026-100507",
        title: "Offer that needs a senior",
        see: "The draft offers £300, above the handler's £250 limit, so a senior must approve as well.",
      },
      {
        ref: "CMP-2026-100606",
        title: "An amount with no basis",
        see: "The draft offers £100 that appears in no case note or policy clause, so approval is blocked.",
      },
    ],
  },
  {
    name: "People: who decides, and when",
    set: "AI Workforce Transformation",
    cases: [
      {
        ref: "CMP-2026-101003",
        title: "Vulnerable customer and quick approval",
        see: "Signs of vulnerability are listed, and the case needs a senior as well as the handler.",
        act: "Choose Approve within 20 seconds of opening: you are asked to confirm you read the reply. Then open the name menu at the top right, switch to Senior handler and co-approve.",
      },
      {
        ref: "CMP-2026-104712",
        title: "Handover to a specialist team",
        see: "The handover pack lists what the specialist team needs and what is missing.",
        act: "Choose Escalate. Submission is blocked until each missing item is attached or marked not available. Then switch to Specialist in the name menu and accept or return the pack.",
      },
    ],
  },
  {
    name: "Deadlines and the letters they trigger",
    set: "AI Governance Engineering",
    cases: [
      {
        ref: "CMP-2026-100501",
        title: "Eight-week letter (red tag)",
        see: "Eight weeks have passed with no final response. The letter tells the customer they can go to the Financial Ombudsman Service now.",
        act: "Replace the text in square brackets and approve the letter. Code checks it contains everything the rule requires.",
      },
      {
        ref: "CMP-2026-100402",
        title: "Payment services holding response (amber tag)",
        see: "A payment complaint has a 15-business-day deadline. It has been reached, so a holding response is owed, which extends the deadline to 35 business days.",
      },
      {
        ref: "CMP-2026-100702",
        title: "Resolved within three business days",
        see: "A summary resolution: a shorter reply that still tells the customer about the Ombudsman.",
      },
    ],
  },
];

export const GUIDE_CASES: GuideCase[] = GUIDE_GROUPS.flatMap((g) => g.cases);

/** The guide entries for a case, for the banner on its page (a case can show more than one area). */
export function guideFor(ref: string): GuideCase[] {
  return GUIDE_CASES.filter((g) => g.ref === ref);
}

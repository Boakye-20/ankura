// Eight-week letter (DISP 1.6.2R(2)) and payment services holding response (DISP 1.6.2AR). See docs/12.
import { describe, expect, it } from "vitest";
import { isLetterDue, letterTemplate, letterTypeFor } from "../lib/letter";
import { checkLetter } from "../lib/letter-check";
import type { Deadline } from "../lib/types";

const eightWeeks: Deadline = { basis: "DISP-G §2.2", total: 56, used: 56, unit: "days", due: "2026-11-05" };
const payment: Deadline = { basis: "DISP-G §2.4", total: 15, used: 15, unit: "business days", due: "2026-11-05" };
const fill = (t: string, reason = "we are still waiting for records from the branch", date = "20/11/2026") =>
  t.replace("[reason for the delay]", reason).replace("[DD/MM/YYYY]", date);

describe("letterTypeFor and isLetterDue", () => {
  it("maps the deadline basis to the letter the rules require", () => {
    expect(letterTypeFor(eightWeeks)).toBe("Eight-week letter");
    expect(letterTypeFor(payment)).toBe("Holding response");
    expect(letterTypeFor({ ...eightWeeks, basis: "DISP-G §2.1" })).toBeNull();
    expect(letterTypeFor(null)).toBeNull();
  });

  it("is due when the deadline is reached and the case is still open", () => {
    expect(isLetterDue(eightWeeks, "Open")).toBe(true);
    expect(isLetterDue({ ...eightWeeks, used: 55 }, "Open")).toBe(false);
    expect(isLetterDue(eightWeeks, "Approved")).toBe(false);
    expect(isLetterDue(eightWeeks, "Co-approved")).toBe(false);
  });
});

describe("letterTemplate", () => {
  it("contains every required element for an eight-week letter and leaves the facts to the handler", () => {
    const t = letterTemplate("Eight-week letter");
    expect(t).toContain("[reason for the delay]");
    expect(t).toContain("[DD/MM/YYYY]");
    expect(t).toMatch(/refer your complaint to the Financial Ombudsman Service now/);
    expect(t).toMatch(/leaflet/);
    expect(t).toMatch(/financial-ombudsman\.org\.uk/);
    expect(t).not.toMatch(/six months|6 months/i);
  });
});

describe("checkLetter (LTR-01)", () => {
  const received = "2026-09-10";

  it("fails the unedited template because the reason and date are placeholders", () => {
    const c = checkLetter(letterTemplate("Eight-week letter"), "Eight-week letter", received);
    expect(c.result).toBe("Fail");
    expect(c.detail).toContain("reason for the delay");
    expect(c.detail).toContain("expected date");
  });

  it("passes a completed eight-week letter", () => {
    expect(checkLetter(fill(letterTemplate("Eight-week letter")), "Eight-week letter", received).result).toBe("Pass");
  });

  it.each([
    ["the FOS referral", (t: string) => t.replace(/refer your complaint to the Financial Ombudsman Service now/, "contact us")],
    ["the leaflet", (t: string) => t.replace(/leaflet/g, "note")],
    ["the FOS website", (t: string) => t.replace(/financial-ombudsman\.org\.uk/g, "")],
  ])("fails when %s is removed", (_, edit) => {
    expect(checkLetter(edit(fill(letterTemplate("Eight-week letter"))), "Eight-week letter", received).result).toBe("Fail");
  });

  it("fails if it adds six-month wording, which only a final response may carry (DISP 2.8)", () => {
    const t = fill(letterTemplate("Eight-week letter")) + "\nYou have six months to refer.";
    expect(checkLetter(t, "Eight-week letter", received).detail).toContain("six-month");
  });

  it("fails an expected date that is not after today", () => {
    expect(checkLetter(fill(letterTemplate("Eight-week letter"), undefined, "01/11/2026"), "Eight-week letter", received).result).toBe("Fail");
  });

  it("holding response: final date must be within 35 business days of receipt (DISP 1.6.2AR)", () => {
    const rec = "2026-10-08"; // business day 35 is 26/11/2026
    expect(checkLetter(fill(letterTemplate("Holding response"), undefined, "26/11/2026"), "Holding response", rec).result).toBe("Pass");
    expect(checkLetter(fill(letterTemplate("Holding response"), undefined, "27/11/2026"), "Holding response", rec).result).toBe("Fail");
  });
});

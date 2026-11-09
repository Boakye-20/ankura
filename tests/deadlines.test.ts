import { describe, expect, it } from "vitest";
import { addBusinessDays, businessDaysBetween, deadlineFor, isBusinessDay } from "../lib/deadlines";

describe("business days", () => {
  it("skips weekends", () => {
    // Fri 16/10/2026 to Thu 05/11/2026: 14 business days
    expect(businessDaysBetween("2026-10-16", "2026-11-05")).toBe(14);
    expect(addBusinessDays("2026-10-30", 1)).toBe("2026-11-02"); // Friday + 1 = Monday
  });

  it("skips England and Wales bank holidays", () => {
    expect(isBusinessDay("2026-08-31")).toBe(false); // summer bank holiday
    expect(businessDaysBetween("2026-08-28", "2026-09-01")).toBe(1); // Fri -> Tue, Monday is a holiday
    expect(addBusinessDays("2026-12-24", 1)).toBe("2026-12-29"); // Christmas Day and the Boxing Day substitute
  });
});

describe("deadlineFor", () => {
  it("uses 15 business days for payment services", () => {
    expect(deadlineFor("2026-10-16", { paymentServices: true, summaryResolutionEligible: false })).toEqual({
      basis: "DISP-G §2.4", total: 15, used: 14, unit: "business days", due: "2026-11-06",
    });
  });

  it("uses the third business day for summary resolutions", () => {
    const d = deadlineFor("2026-11-03", { paymentServices: false, summaryResolutionEligible: true });
    expect(d).toMatchObject({ basis: "DISP-G §2.1", total: 3, used: 2, due: "2026-11-06" });
  });

  it("uses 56 calendar days otherwise", () => {
    const d = deadlineFor("2026-10-05", { paymentServices: false, summaryResolutionEligible: false });
    expect(d).toMatchObject({ basis: "DISP-G §2.2", total: 56, used: 31, unit: "days", due: "2026-11-30" });
  });
});

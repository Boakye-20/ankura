import { describe, expect, it } from "vitest";
import { dueShort, dueText } from "../lib/case-helpers";

const d = (used: number, total: number, unit = "business days") => ({ basis: "DISP-G §2.4", used, total, unit, due: "2026-11-10" });

describe("dueText", () => {
  it("says how much time is left, in the deadline's own unit", () => {
    expect(dueText(d(13, 15))).toBe("2 business days left");
    expect(dueText(d(55, 56, "days"))).toBe("1 day left");
  });
  it("says when a case is due today or overdue", () => {
    expect(dueText(d(3, 3))).toBe("Due today");
    expect(dueText(d(15, 3))).toBe("Overdue by 12 business days");
    expect(dueText(d(4, 3))).toBe("Overdue by 1 business day");
  });
  it("handles a case with no deadline", () => {
    expect(dueText(null)).toBe("No deadline set");
  });
});

describe("dueShort", () => {
  const d = (used: number, total: number) => ({ type: "Standard", total, used, unit: "days", due: "2026-12-01", basis: "DISP-G §2.2" }) as never;
  it("is a short form for the queue", () => {
    expect(dueShort(d(57, 56))).toBe("1 day overdue");
    expect(dueShort(d(56, 56))).toBe("Due today");
    expect(dueShort(d(46, 56))).toBe("10 days left");
    expect(dueShort(null)).toBe("No deadline");
  });
});

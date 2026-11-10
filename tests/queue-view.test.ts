import { describe, expect, it } from "vitest";
import { queueBucket } from "../lib/case-helpers";

describe("queueBucket", () => {
  it("puts a case in 'mine' when the current role must act on it", () => {
    expect(queueBucket("Open", "Handler")).toBe("mine");
    expect(queueBucket("Returned by specialist", "Handler")).toBe("mine");
    expect(queueBucket("Escalated", "Handler")).toBe("mine");
    expect(queueBucket("Awaiting senior co-approval", "Senior")).toBe("mine");
    expect(queueBucket("With specialist", "Specialist")).toBe("mine");
  });
  it("puts a case in 'progress' when someone else must act on it", () => {
    expect(queueBucket("Awaiting senior co-approval", "Handler")).toBe("progress");
    expect(queueBucket("Open", "Senior")).toBe("progress");
    expect(queueBucket("With specialist", "Handler")).toBe("progress");
    expect(queueBucket("Escalated", "Specialist")).toBe("progress");
  });
  it("puts finished cases in 'done' for every role", () => {
    for (const role of ["Handler", "Senior", "Specialist"] as const) {
      expect(queueBucket("Approved", role)).toBe("done");
      expect(queueBucket("Co-approved", role)).toBe("done");
      expect(queueBucket("Accepted by specialist", role)).toBe("done");
    }
  });
});

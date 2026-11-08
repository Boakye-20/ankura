import { describe, expect, it } from "vitest";
import { getStatus } from "@/lib/status";

describe("getStatus", () => {
  it("has no demo/live mode: the app only serves stored outputs", () => {
    expect(getStatus({ ANTHROPIC_API_KEY: "test-key" })).not.toHaveProperty("mode");
  });

  it("uses the default models when none are configured", () => {
    expect(getStatus({}).models).toEqual({ triage: "claude-haiku-5-5", draft: "claude-sonnet-5-5" });
  });

  it("uses the models set in the environment", () => {
    const status = getStatus({ ANTHROPIC_MODEL_TRIAGE: "triage-x", ANTHROPIC_MODEL_DRAFT: "draft-y" });
    expect(status.models).toEqual({ triage: "triage-x", draft: "draft-y" });
  });

  it("reports the policy and prompt versions", () => {
    const status = getStatus({});
    expect(status.policyVersion).toBe("v2026.04");
    expect(status.promptVersion).toBe("v1");
  });

  it("never exposes the API key", () => {
    expect(JSON.stringify(getStatus({ ANTHROPIC_API_KEY: "secret-value" }))).not.toContain("secret-value");
  });
});

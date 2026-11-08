import { describe, expect, it } from "vitest";
import { getStatus } from "@/lib/status";

describe("getStatus", () => {
  it("is demo mode when no API key is set", () => {
    expect(getStatus({}).mode).toBe("demo");
  });

  it("is demo mode when the API key is empty or whitespace", () => {
    expect(getStatus({ ANTHROPIC_API_KEY: "" }).mode).toBe("demo");
    expect(getStatus({ ANTHROPIC_API_KEY: "   " }).mode).toBe("demo");
  });

  it("is live mode when an API key is set", () => {
    expect(getStatus({ ANTHROPIC_API_KEY: "test-key" }).mode).toBe("live");
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

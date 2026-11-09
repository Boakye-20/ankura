// The most important test in the repo (docs/06): no customer value may ever reach the model.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import complaints from "../data/complaints.json";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { findLeaks } from "../lib/mask";
import { runPipeline, type PipelineDeps } from "../lib/pipeline";
import { loadClauses } from "../lib/policies";
import { requestText } from "../lib/request-text";
import type { Complaint, DraftOutput, TriageOutput } from "../lib/types";

const TRIAGE: TriageOutput = {
  category: "Service and conduct", categoryConfidence: 0.9, vulnerable: false, vulnerabilityIndicators: [],
  paymentServices: false, summaryResolutionEligible: false, injectionSuspected: false, summary: "Customer complains.", keyFacts: ["fact"],
};
const DRAFT: DraftOutput = {
  response: [{ text: "Thank you for your complaint.", citations: [] }],
  proposedRedress: null,
  handover: null,
};

function mockClient() {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const create = async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    requests.push(params);
    const isTriage = String(params.system).startsWith("You are a triage assistant");
    return {
      content: [{ type: "text", text: JSON.stringify(isTriage ? TRIAGE : DRAFT) }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    } as unknown as Anthropic.Message;
  };
  return { requests, create };
}

const deps = (create: PipelineDeps["create"]): PipelineDeps => ({
  create,
  models: { triage: "test-triage", draft: "test-draft" },
  prompts: { triage: "You are a triage assistant (test).", draft: "You draft complaint responses (test)." },
  lists: { names, merchants },
  library: loadClauses(),
  now: () => new Date("2026-11-05T09:00:00Z"),
});

describe("no personal data reaches the model", () => {
  it("sends no customer value, listed name or merchant in any request, across all 60 cases", async () => {
    let total = 0;
    for (const complaint of complaints as Complaint[]) {
      const { requests, create } = mockClient();
      await runPipeline(complaint, deps(create));
      expect(requests.length, complaint.ref).toBeGreaterThan(0);
      for (const request of requests) {
        expect({ ref: complaint.ref, leaks: findLeaks(requestText(request), complaint.customer, { names, merchants }) }).toEqual({ ref: complaint.ref, leaks: [] });
        expect(requestText(request)).not.toContain(complaint.text); // the raw complaint is never sent
      }
      total += requests.length;
    }
    expect(total).toBeGreaterThanOrEqual(60);
  });

  it("never calls the model when the leak check fails", async () => {
    const { requests, create } = mockClient();
    const leaky: Complaint = {
      ...(complaints[0] as Complaint),
      text: "Please write to me at postcode ls1 4ab.", // the postcode regex expects capitals, so masking misses it
      customer: { name: "Priya Sharma", postcode: "LS1 4AB" },
    };
    const result = await runPipeline(leaky, deps(create));
    expect(requests).toEqual([]);
    expect(result.checks.find((c) => c.id === "MASK-01")?.result).toBe("Fail");
    expect(result.draft).toBeNull();
    expect(result.route).toBe("Handler");
  });

  it("keeps the token map and raw values out of the stored result", async () => {
    const { create } = mockClient();
    const complaint = complaints[0] as Complaint;
    const stored = JSON.stringify(await runPipeline(complaint, deps(create)));
    expect(stored).not.toContain("tokenMap");
    expect(findLeaks(stored, complaint.customer, { names, merchants })).toEqual([]);
  });
});

describe("what the app serves", () => {
  it("/api/cases returns no customer value, raw complaint text or labels", async () => {
    const { GET } = await import("../app/api/cases/route");
    const body = await (await GET(new Request("http://localhost/api/cases"))).text();
    expect(body).not.toContain('"labels"');
    expect(body).not.toContain('"customer"');
    for (const c of complaints as Complaint[]) {
      expect({ ref: c.ref, leaks: findLeaks(body, c.customer, { names, merchants }) }).toEqual({ ref: c.ref, leaks: [] });
      expect(body).not.toContain(c.text);
    }
  });

  it.skipIf(!existsSync("data/demo-outputs.json"))("data/demo-outputs.json contains no customer value or token map", () => {
    const stored = readFileSync("data/demo-outputs.json", "utf8");
    expect(stored).not.toContain("tokenMap");
    for (const c of complaints as Complaint[]) {
      expect({ ref: c.ref, leaks: findLeaks(stored, c.customer, { names, merchants }) }).toEqual({ ref: c.ref, leaks: [] });
    }
  });
});

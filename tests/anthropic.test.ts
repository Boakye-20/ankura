import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { costGbp, structuredCall } from "../lib/anthropic";
import { AmendedDraftSchema } from "../lib/reverify";

const Schema = z.object({ answer: z.string() });
const reply = (text: string, stop_reason = "end_turn") =>
  ({ content: [{ type: "text", text }], stop_reason, usage: { input_tokens: 1000, output_tokens: 100 } }) as unknown as Anthropic.Message;

function client(replies: Anthropic.Message[]) {
  let calls = 0;
  return { create: async () => replies[Math.min(calls++, replies.length - 1)], calls: () => calls };
}

const request = { model: "claude-haiku-5-5", system: "s", user: "u", schema: Schema, effort: "low" as const };

describe("structuredCall: retry once, then route to a human", () => {
  it("returns valid output on the first try", async () => {
    const c = client([reply('{"answer":"yes"}')]);
    const r = await structuredCall(c.create, request);
    expect(r).toMatchObject({ ok: true, value: { answer: "yes" } });
    expect(c.calls()).toBe(1);
  });

  it("retries once after invalid output and succeeds", async () => {
    const c = client([reply('{"wrong":1}'), reply('{"answer":"yes"}')]);
    expect((await structuredCall(c.create, request)).ok).toBe(true);
    expect(c.calls()).toBe(2);
  });

  it("gives up after the retry with 'AI output invalid', and counts both calls' usage", async () => {
    const c = client([reply("not json"), reply('{"wrong":1}')]);
    const r = await structuredCall(c.create, request);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain("AI output invalid");
    expect(c.calls()).toBe(2);
    expect(r.usage.inputTokens).toBe(2000);
  });

  it("treats a refusal or truncated output as invalid", async () => {
    const c = client([reply('{"answer":"yes"}', "refusal"), reply('{"answer":"yes"}', "max_tokens")]);
    expect((await structuredCall(c.create, request)).ok).toBe(false);
  });
});

describe("costGbp", () => {
  it("prices known models and returns zero for unknown ones", () => {
    expect(costGbp("claude-sonnet-5-5", 1_000_000, 0)).toBeCloseTo(1.5); // $2 at 0.75
    expect(costGbp("some-other-model", 1_000_000, 1_000_000)).toBe(0);
  });
});

describe("/api/verify body caps (slopsec rule 2)", () => {
  const part = (text: string) => ({ text, citations: [] });
  const body = (response: unknown[], ref = "CMP-2026-104288") => ({ ref, response, proposedRedress: null });

  it("accepts a normal amended draft", () => {
    expect(AmendedDraftSchema.safeParse(body([part("Thank you.")])).success).toBe(true);
  });

  it.each([
    ["more than 20 parts", body(Array(21).fill(part("x")))],
    ["more than 3,000 characters in total", body([part("a".repeat(2000)), part("b".repeat(1001))])],
    ["a ref that is not a case reference", body([part("x")], "../../etc/passwd")],
    ["no parts", body([])],
  ])("rejects %s", (_, b) => {
    expect(AmendedDraftSchema.safeParse(b).success).toBe(false);
  });
});

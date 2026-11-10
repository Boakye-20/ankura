import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createBatchingClient, type BatchApi } from "../lib/batch-client";

const params = (text: string): Anthropic.MessageCreateParamsNonStreaming => ({
  model: "claude-haiku-5-5",
  max_tokens: 100,
  messages: [{ role: "user", content: text }],
});

const message = (text: string) => ({ content: [{ type: "text", text }] }) as unknown as Anthropic.Message;
const userText = (p: Anthropic.MessageCreateParamsNonStreaming) => p.messages[0].content as string;

function fakeApi(fail: string[] = []) {
  const batches: Anthropic.MessageCreateParamsNonStreaming[][] = [];
  let polls = 0;
  const api: BatchApi = {
    create: async ({ requests }) => {
      batches.push(requests.map((r) => r.params));
      return { id: `batch-${batches.length}` };
    },
    retrieve: async () => ({ processing_status: ++polls % 2 === 0 ? "ended" : "in_progress" }),
    results: async (id) => {
      const requests = batches[Number(id.split("-")[1]) - 1];
      const lines = requests.map((p, i) => {
        const text = userText(p);
        const result: Anthropic.Messages.MessageBatchResult = fail.includes(text)
          ? { type: "errored", error: { type: "error", error: { type: "api_error", message: "boom" } } } as Anthropic.Messages.MessageBatchResult
          : { type: "succeeded", message: message(`echo ${text}`) };
        return { custom_id: `r${i}`, result };
      });
      return (async function* () { yield* lines.reverse(); })(); // results arrive in any order
    },
  };
  return { api, batches };
}

describe("createBatchingClient", () => {
  it("sends calls made together as one batch and returns each caller its own message", async () => {
    const { api, batches } = fakeApi();
    const create = createBatchingClient(api, { idleMs: 5, pollMs: 0, log: () => {} });

    const [a, b, c] = await Promise.all([create(params("a")), create(params("b")), create(params("c"))]);

    expect(batches).toHaveLength(1);
    expect(batches[0].map(userText)).toEqual(["a", "b", "c"]);
    expect([a, b, c].map((m) => (m.content[0] as Anthropic.TextBlock).text)).toEqual(["echo a", "echo b", "echo c"]);
  });

  it("rejects only the caller whose request errored", async () => {
    const { api } = fakeApi(["b"]);
    const create = createBatchingClient(api, { idleMs: 5, pollMs: 0, log: () => {} });

    const settled = await Promise.allSettled([create(params("a")), create(params("b"))]);

    expect(settled[0].status).toBe("fulfilled");
    expect(settled[1].status).toBe("rejected");
  });

  it("sends a later wave of calls as a second batch", async () => {
    const { api, batches } = fakeApi();
    const create = createBatchingClient(api, { idleMs: 5, pollMs: 0, log: () => {} });

    await create(params("triage"));
    await create(params("draft"));

    expect(batches.map((b) => b.map(userText))).toEqual([["triage"], ["draft"]]);
  });
});

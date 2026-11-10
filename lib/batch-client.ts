// Message Batches API client for the offline scripts (precompute, eval) only: same CreateMessage interface as
// createClient(), at 50% of the token price. Calls are queued; once no new call has arrived for idleMs, the queue
// goes out as one batch and each caller gets its own result when the batch ends (usually minutes, at most 24 hours).
// Results can arrive in any order, so they are matched back by custom_id, never by position.
import Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "./anthropic";

type Params = Anthropic.MessageCreateParamsNonStreaming;

export type BatchApi = {
  create(body: { requests: { custom_id: string; params: Params }[] }): Promise<{ id: string }>;
  retrieve(id: string): Promise<{ processing_status: string }>;
  results(id: string): Promise<AsyncIterable<{ custom_id: string; result: Anthropic.Messages.MessageBatchResult }>>;
};

type Options = { idleMs?: number; pollMs?: number; log?: (line: string) => void };
type Pending = { params: Params; resolve: (m: Anthropic.Message) => void; reject: (e: unknown) => void };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createBatchingClient(api: BatchApi, { idleMs = 2000, pollMs = 30_000, log = console.log }: Options = {}): CreateMessage {
  let queue: Pending[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sent = 0;

  async function flush() {
    const items = queue;
    queue = [];
    const n = ++sent;
    try {
      const batch = await api.create({ requests: items.map((p, i) => ({ custom_id: `r${i}`, params: p.params })) });
      log(`Batch ${n}: ${items.length} requests sent (${batch.id}), waiting for results`);
      while ((await api.retrieve(batch.id)).processing_status !== "ended") await sleep(pollMs);
      const results = new Map<string, Anthropic.Messages.MessageBatchResult>();
      for await (const line of await api.results(batch.id)) results.set(line.custom_id, line.result);
      items.forEach((p, i) => {
        const r = results.get(`r${i}`);
        if (r?.type === "succeeded") p.resolve(r.message);
        else p.reject(new Error(`Batch request ${r?.type ?? "missing"}${r?.type === "errored" ? `: ${JSON.stringify(r.error)}` : ""}`));
      });
      log(`Batch ${n}: done`);
    } catch (error) {
      items.forEach((p) => p.reject(error));
    }
  }

  return (params) => new Promise((resolve, reject) => {
    queue.push({ params, resolve, reject });
    clearTimeout(timer);
    timer = setTimeout(flush, idleMs);
  });
}

export function createBatchClient(): CreateMessage {
  return createBatchingClient(new Anthropic().messages.batches); // reads ANTHROPIC_API_KEY from the environment
}

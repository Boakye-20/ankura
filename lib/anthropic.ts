// Model access for the offline scripts only (precompute, eval). The app never imports this file.
// Structured output: the response format is constrained to a zod schema (output_config.format), then validated
// again with zod. Forced tool_choice is not used because claude-sonnet-5-5 rejects it with a 400.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export type CreateMessage = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

export function createClient(): CreateMessage {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return (params) => client.messages.create(params);
}

// List prices in USD per million tokens, checked 09/11/2026 against docs.anthropic.com/en/docs/about-claude/pricing.
// Haiku 5.5 rates apply to prompts up to 100K tokens (every prompt here is far smaller).
export const PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
};
// Assumption, not a live rate: USD to GBP on 09/11/2026 was about 0.746 (GBP/USD 1.339 to 1.342).
export const USD_TO_GBP = 0.75;

export type Usage = { inputTokens: number; outputTokens: number; costGbp: number; ms: number };
export const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, costGbp: 0, ms: 0 };

export function costGbp(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES_USD_PER_MTOK[model];
  if (!price) return 0; // unknown model: cost is reported as zero rather than guessed
  return ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * USD_TO_GBP;
}

export const addUsage = (a: Usage, b: Usage): Usage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  costGbp: a.costGbp + b.costGbp,
  ms: a.ms + b.ms,
});

export type StructuredResult<T> = { ok: true; value: T; usage: Usage } | { ok: false; error: string; usage: Usage };

type StructuredRequest<S extends z.ZodType> = {
  model: string;
  system: string;
  user: string;
  schema: S;
  effort: "low" | "medium" | "high";
};

/** One model call constrained to a schema. Retries once on invalid output; API errors are thrown, not hidden. */
export async function structuredCall<S extends z.ZodType>(create: CreateMessage, req: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
  let usage = NO_USAGE;
  let error = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    const response = await create({
      model: req.model,
      max_tokens: 16000,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: { effort: req.effort, format: zodOutputFormat(req.schema) },
    });
    const { input_tokens, output_tokens } = response.usage;
    usage = addUsage(usage, { inputTokens: input_tokens, outputTokens: output_tokens, costGbp: costGbp(req.model, input_tokens, output_tokens), ms: Date.now() - started });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      error = `model stopped: ${response.stop_reason}`;
      continue;
    }
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    try {
      const parsed = req.schema.safeParse(JSON.parse(text));
      if (parsed.success) return { ok: true, value: parsed.data, usage };
      error = `schema validation failed: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`;
    } catch {
      error = "response was not valid JSON";
    }
  }
  return { ok: false, error: `AI output invalid after retry (${error})`, usage };
}

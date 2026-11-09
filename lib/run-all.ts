// Shared by precompute and eval: run the pipeline over complaints with limited concurrency.
import { readFileSync } from "node:fs";
import path from "node:path";
import complaints from "../data/complaints.json";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import type { CreateMessage } from "./anthropic";
import { runPipeline, type PipelineDeps } from "./pipeline";
import { loadClauses } from "./policies";
import { PROMPT_VERSION } from "./versions";
import type { Complaint, PipelineResult } from "./types";

export const ALL_COMPLAINTS = complaints as Complaint[];

export function loadPrompt(name: "triage" | "draft"): string {
  return readFileSync(path.join(process.cwd(), "lib", "prompts", `${name}.${PROMPT_VERSION}.md`), "utf8").trim();
}

export function pipelineDeps(create: CreateMessage, models: PipelineDeps["models"]): PipelineDeps {
  return { create, models, prompts: { triage: loadPrompt("triage"), draft: loadPrompt("draft") }, lists: { names, merchants }, library: loadClauses() };
}

type RunOptions = { concurrency?: number; onRequest?: (ref: string, params: Parameters<CreateMessage>[0]) => void };

export async function runAll(cases: Complaint[], deps: PipelineDeps, { concurrency = 4, onRequest }: RunOptions = {}): Promise<PipelineResult[]> {
  const results: PipelineResult[] = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const i = next++;
      const create: CreateMessage = (params) => {
        onRequest?.(cases[i].ref, params);
        return deps.create(params);
      };
      results[i] = await runPipeline(cases[i], { ...deps, create });
      const r = results[i];
      console.log(`${String(i + 1).padStart(2)}/${cases.length} ${r.ref} ${r.triage?.category ?? "no triage"} → ${r.route}${r.draft ? "" : " (draft withheld)"} · ${(r.usage.ms / 1000).toFixed(1)}s`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

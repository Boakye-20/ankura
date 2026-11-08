import "server-only";

export const POLICY_VERSION = "v2026.04";
export const PROMPT_VERSION = "v1";

const DEFAULT_TRIAGE_MODEL = "claude-haiku-5-5";
const DEFAULT_DRAFT_MODEL = "claude-sonnet-5-5";

export type Mode = "demo" | "live";

export type Status = {
  mode: Mode;
  models: { triage: string; draft: string };
  policyVersion: string;
  promptVersion: string;
};

type Env = Record<string, string | undefined>;

export function getStatus(env: Env): Status {
  return {
    mode: env.ANTHROPIC_API_KEY?.trim() ? "live" : "demo",
    models: {
      triage: env.ANTHROPIC_MODEL_TRIAGE?.trim() || DEFAULT_TRIAGE_MODEL,
      draft: env.ANTHROPIC_MODEL_DRAFT?.trim() || DEFAULT_DRAFT_MODEL,
    },
    policyVersion: POLICY_VERSION,
    promptVersion: PROMPT_VERSION,
  };
}

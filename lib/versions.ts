// Version constants shared by the app (footer, /api/status) and the offline scripts (precompute, eval).
export const POLICY_VERSION = "v2026.04";
export const PROMPT_VERSION = "v2"; // v1 results: docs/13-eval-v1-results.md; changes: docs/CHANGELOG.md
export const RELEASE = "0.1 (prototype)";

export const DEFAULT_TRIAGE_MODEL = "claude-haiku-5-5";
export const DEFAULT_DRAFT_MODEL = "claude-sonnet-5-5";

type Env = Record<string, string | undefined>;

export function configuredModels(env: Env): { triage: string; draft: string } {
  return {
    triage: env.ANTHROPIC_MODEL_TRIAGE?.trim() || DEFAULT_TRIAGE_MODEL,
    draft: env.ANTHROPIC_MODEL_DRAFT?.trim() || DEFAULT_DRAFT_MODEL,
  };
}

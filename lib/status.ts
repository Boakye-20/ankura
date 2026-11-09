import "server-only";
import { configuredModels, POLICY_VERSION, PROMPT_VERSION } from "./versions";

export { POLICY_VERSION, PROMPT_VERSION };

// The app never calls the model; it serves stored outputs. The model IDs shown are the ones configured for precompute and eval.
export type Status = {
  models: { triage: string; draft: string };
  policyVersion: string;
  promptVersion: string;
};

type Env = Record<string, string | undefined>;

export function getStatus(env: Env): Status {
  return { models: configuredModels(env), policyVersion: POLICY_VERSION, promptVersion: PROMPT_VERSION };
}

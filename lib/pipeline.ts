// Runs the six pipeline steps for one complaint and records an audit event for each (docs/03, docs/04).
// Used only by the offline scripts. The token map never leaves this function.
import { addUsage, NO_USAGE, type CreateMessage, type Usage } from "./anthropic";
import { deadlineFor } from "./deadlines";
import { runDraft, responseTypeFor } from "./draft";
import { maskComplaint, tokenCount } from "./mask";
import { retrieve } from "./retrieve";
import { routeCase } from "./route";
import { runTriage } from "./triage";
import { injectionMatched, verify } from "./verify";
import { POLICY_VERSION, PROMPT_VERSION } from "./versions";
import type { AuditEvent, Clause, Complaint, DraftOutput, PipelineResult, ResponseType, TriageOutput } from "./types";

export type PipelineDeps = {
  create: CreateMessage;
  models: { triage: string; draft: string };
  prompts: { triage: string; draft: string };
  lists: { names: string[]; merchants: string[] };
  library: Clause[];
  now?: () => Date;
};

export async function runPipeline(complaint: Complaint, deps: PipelineDeps): Promise<PipelineResult> {
  const now = deps.now ?? (() => new Date());
  const started = Date.now();
  const audit: AuditEvent[] = [];
  const log = (actor: string, event: string, detail: string) => audit.push({ ts: now().toISOString(), ref: complaint.ref, actor, event, detail });
  let usage: Usage = NO_USAGE;
  let schemaError: string | null = null;

  // Step 1: mask
  const masked = maskComplaint(complaint, deps.lists);
  const tokens = tokenCount(masked.counts);
  const maskingFailed = masked.leaks.length > 0;
  log("System · masking", maskingFailed ? "Masking failed" : "Personal data masked",
    maskingFailed ? `Leak check failed (${masked.leaks.join(", ")}); no AI processing` : `${tokens} tokens: ${Object.keys(masked.counts).join(", ") || "none"}`);

  // Step 2: triage
  let triage: TriageOutput | null = null;
  if (!maskingFailed) {
    const result = await runTriage(deps.create, deps.models.triage, deps.prompts.triage, masked.maskedText, masked.maskedNotes);
    usage = addUsage(usage, result.usage);
    if (result.ok) {
      triage = result.value;
      const flags = [triage.vulnerable && "vulnerable", triage.paymentServices && "payment services", triage.summaryResolutionEligible && "summary resolution", triage.injectionSuspected && "injection suspected"].filter(Boolean);
      log("System · triage", "Classified", `${triage.category}, confidence ${triage.categoryConfidence.toFixed(2)}${flags.length ? `, flags: ${flags.join(", ")}` : ""} · ${deps.models.triage} · prompt ${PROMPT_VERSION}`);
    } else {
      schemaError = `Triage: ${result.error}`;
      log("System · triage", "AI output invalid", result.error);
    }
  }

  // Step 3: retrieve
  const retrieved = triage ? retrieve(triage) : [];
  if (triage) log("System · retrieval", "Policy retrieved", retrieved.map((c) => `${c.id} (${c.score.toFixed(2)})`).join(", "));

  // Step 4: draft
  const injection = injectionMatched(masked.maskedText) || Boolean(triage?.injectionSuspected);
  const provisional = routeCase({ maskingFailed, injection, triage, redressAmount: null, maskedText: masked.maskedText });
  const responseType: ResponseType | null = triage ? responseTypeFor(triage, provisional.route) : null;
  let draft: DraftOutput | null = null;
  let draftWithheldReason: string | null =
    maskingFailed ? "Masking failed: no AI processing. The handler writes this response."
    : !triage ? "AI output invalid: the handler writes this response."
    : injection ? "An instruction aimed at the AI was found in the complaint, so no draft was produced. The handler writes this response, and the attempt is referred to Financial Crime (POL-10 §1.3)."
    : null;

  if (triage && responseType && !draftWithheldReason) {
    const result = await runDraft(deps.create, deps.models.draft, deps.prompts.draft, {
      responseType, route: provisional.route, triage, maskedText: masked.maskedText, maskedNotes: masked.maskedNotes, clauses: retrieved,
    });
    usage = addUsage(usage, result.usage);
    if (result.ok) {
      draft = result.value;
      const cited = [...new Set(draft.response.flatMap((p) => p.citations))];
      log("System · drafting", "Draft generated", `${responseType} · cites ${cited.join(", ") || "no clauses"}${draft.handover ? " · handover pack" : ""} · ${deps.models.draft} · prompt ${PROMPT_VERSION}`);
    } else {
      schemaError = `Draft: ${result.error}`;
      draftWithheldReason = "AI output invalid after one retry: the handler writes this response.";
    }
  }
  if (draftWithheldReason) log("System · drafting", "Draft withheld", draftWithheldReason);

  // Step 5: verify
  const checks = verify({
    maskLeaks: masked.leaks, obfuscatedRuns: masked.obfuscatedRuns, tokenCount: tokens,
    maskedText: masked.maskedText, maskedNotes: masked.maskedNotes.map((n) => n.text),
    triage, schemaError, responseType, draft, retrievedIds: retrieved.map((c) => c.id), library: deps.library,
  });
  const count = (result: string) => checks.filter((c) => c.result === result).length;
  log("System · verification", "Checks run", `${checks.length} checks: ${count("Pass")} pass, ${count("Refer")} refer, ${count("Fail")} fail`);
  for (const c of checks.filter((c) => c.result !== "Pass")) {
    log("System · verification", c.result === "Fail" ? "Check failed" : "Check referred", `${c.id}: ${c.detail}`);
  }

  // Step 6: route
  const route = routeCase({ maskingFailed, injection, triage, redressAmount: draft?.proposedRedress?.amount ?? null, maskedText: masked.maskedText });
  log("System · routing", "Routed", `${route.route}: ${route.reason}${route.requiresSeniorCoApproval ? " · senior co-approval required" : ""}`);
  if (route.financialCrimeReferral) log("System · routing", "Referred to Financial Crime", "Attempted manipulation of the AI (POL-10 §1.3)");

  return {
    ref: complaint.ref,
    mode: "demo",
    maskedText: masked.maskedText,
    maskedNotes: masked.maskedNotes,
    tokenCount: tokens,
    triage,
    retrieved,
    responseType,
    draft,
    draftWithheldReason,
    checks,
    route: route.route,
    routeReason: route.reason,
    requiresSeniorCoApproval: route.requiresSeniorCoApproval,
    deadline: triage ? deadlineFor(complaint.received, triage) : null,
    audit,
    usage: { ...usage, ms: Date.now() - started },
    promptVersion: PROMPT_VERSION,
    policyVersion: POLICY_VERSION,
    model: deps.models,
  };
}

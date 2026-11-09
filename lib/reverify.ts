import "server-only";
// POST /api/verify: re-run step 5 on a draft a handler has amended. The request body is treated as hostile
// (slopsec rule 2): validated with zod, size-capped, and the ref is only ever looked up in memory.
import { z } from "zod";
import { findComplaint, maskFor, storedResult } from "./cases";
import { tokenCount } from "./mask";
import { loadClauses } from "./policies";
import { verify } from "./verify";
import type { Check } from "./types";

const MAX_PARTS = 20;
const MAX_CHARS = 3000;

export const AmendedDraftSchema = z.object({
  ref: z.string().regex(/^CMP-\d{4}-\d{6}$/),
  response: z.array(z.object({ text: z.string().max(MAX_CHARS), citations: z.array(z.string().max(20)).max(10) })).min(1).max(MAX_PARTS),
  proposedRedress: z.object({ amount: z.number().finite().nonnegative().max(10_000_000), basis: z.string().max(300), clause: z.string().max(20) }).nullable(),
}).refine((d) => d.response.reduce((n, p) => n + p.text.length, 0) <= MAX_CHARS, "draft too long");

/** Returns the checks for an amended draft, or null when the input is invalid or the case is unknown. */
export function reverify(body: unknown): Check[] | null {
  const parsed = AmendedDraftSchema.safeParse(body);
  if (!parsed.success) return null;
  const { ref, response, proposedRedress } = parsed.data;
  const complaint = findComplaint(ref);
  const stored = storedResult(ref);
  if (!complaint || !stored) return null;

  const masked = maskFor(complaint); // deterministic: recomputed server-side rather than stored
  const schemaFail = stored.checks.find((c) => c.id === "SCHEMA-01" && c.result === "Fail");
  return verify({
    maskLeaks: masked.leaks,
    obfuscatedRuns: masked.obfuscatedRuns,
    tokenCount: tokenCount(masked.counts),
    maskedText: stored.maskedText,
    maskedNotes: stored.maskedNotes.map((n) => n.text),
    triage: stored.triage,
    schemaError: schemaFail ? schemaFail.detail : null,
    responseType: stored.responseType,
    draft: { response, proposedRedress, handover: stored.draft?.handover ?? null },
    retrievedIds: stored.retrieved.map((c) => c.id),
    library: loadClauses(),
  });
}

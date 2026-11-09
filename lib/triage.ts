// Step 2 of the pipeline (docs/04): classify the masked complaint. Model: ANTHROPIC_MODEL_TRIAGE.
import { z } from "zod";
import { structuredCall, type CreateMessage, type StructuredResult } from "./anthropic";
import type { CaseNote, TriageOutput } from "./types";

export const CATEGORIES = [
  "Unauthorised payment", "APP scam", "Charges and interest", "Service and conduct",
  "Card delivery and access", "Account administration", "Lending and affordability", "Bereavement",
] as const;

export const TriageSchema = z.object({
  category: z.enum(CATEGORIES),
  categoryConfidence: z.number().refine((n) => n >= 0 && n <= 1, "must be between 0 and 1"),
  vulnerable: z.boolean(),
  vulnerabilityIndicators: z.array(z.object({ driver: z.enum(["Health", "Life events", "Resilience", "Capability"]), indicator: z.string() })),
  paymentServices: z.boolean(),
  summaryResolutionEligible: z.boolean(),
  injectionSuspected: z.boolean(),
  summary: z.string(),
  keyFacts: z.array(z.string()),
}) satisfies z.ZodType<TriageOutput>;

export function notesBlock(notes: CaseNote[]): string {
  return notes.map((n) => `<note id="${n.id}" date="${n.date}" author="${n.author}">${n.text}</note>`).join("\n");
}

export function triageUserMessage(maskedText: string, maskedNotes: CaseNote[]): string {
  return `<complaint>\n${maskedText}\n</complaint>\n\n<case_notes>\n${notesBlock(maskedNotes)}\n</case_notes>`;
}

export function runTriage(create: CreateMessage, model: string, system: string, maskedText: string, maskedNotes: CaseNote[]): Promise<StructuredResult<TriageOutput>> {
  return structuredCall(create, { model, system, user: triageUserMessage(maskedText, maskedNotes), schema: TriageSchema, effort: "low" });
}

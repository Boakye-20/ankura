// Step 4 of the pipeline (docs/04): draft a cited response, and a handover pack when a specialist is needed.
// Model: ANTHROPIC_MODEL_DRAFT. The response type is decided here by code, never by the model.
import { z } from "zod";
import { structuredCall, type CreateMessage, type StructuredResult } from "./anthropic";
import { notesBlock } from "./triage";
import type { CaseNote, Clause, DraftOutput, ResponseType, Route, TriageOutput } from "./types";

const SPECIALIST_ROUTES: Route[] = ["Fraud & Disputes", "Lending Support", "Complaints Management", "Vulnerability Team"];

export const DraftSchema = z.object({
  response: z.array(z.object({ text: z.string(), citations: z.array(z.string()) })),
  proposedRedress: z.object({ amount: z.number(), basis: z.string(), clause: z.string() }).nullable(),
  handover: z.object({
    team: z.string(),
    issue: z.string(),
    actionsTaken: z.array(z.object({ text: z.string(), source: z.string() })),
    decisionsRequired: z.array(z.object({ question: z.string(), clause: z.string() })),
    missingInformation: z.array(z.string()),
  }).nullable(),
}) satisfies z.ZodType<DraftOutput>;

export function isSpecialistRoute(route: Route): boolean {
  return SPECIALIST_ROUTES.includes(route);
}

export function responseTypeFor(triage: TriageOutput, provisionalRoute: Route): ResponseType {
  if (triage.summaryResolutionEligible) return "Summary resolution";
  if (isSpecialistRoute(provisionalRoute)) return "Acknowledgement";
  return "Final response";
}

export function draftUserMessage(args: {
  responseType: ResponseType;
  route: Route;
  triage: TriageOutput;
  maskedText: string;
  maskedNotes: CaseNote[];
  clauses: Clause[];
}): string {
  const policy = args.clauses.map((c) => `<clause id="${c.id}">${c.title} · ${c.section}: ${c.text}</clause>`).join("\n");
  return [
    `<response_type>${args.responseType}</response_type>`,
    `<route>${args.route}${isSpecialistRoute(args.route) ? " (specialist: complete the handover pack)" : " (no specialist: handover is null)"}</route>`,
    `<triage>\n${JSON.stringify(args.triage, null, 2)}\n</triage>`,
    `<complaint>\n${args.maskedText}\n</complaint>`,
    `<case_notes>\n${notesBlock(args.maskedNotes)}\n</case_notes>`,
    `<policy>\n${policy}\n</policy>`,
  ].join("\n\n");
}

export function runDraft(create: CreateMessage, model: string, system: string, args: Parameters<typeof draftUserMessage>[0]): Promise<StructuredResult<DraftOutput>> {
  return structuredCall(create, { model, system, user: draftUserMessage(args), schema: DraftSchema, effort: "medium" });
}

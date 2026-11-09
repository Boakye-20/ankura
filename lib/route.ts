// Step 6 of the pipeline (docs/04): deterministic routing. In order, first match wins.
import type { Route, TriageOutput } from "./types";

export const CONFIDENCE_THRESHOLD = 0.75; // below this a person checks the classification (CONF-01)
export const HANDLER_LIMIT = 250; // POL-05 §2.1
export const SENIOR_LIMIT = 1000; // POL-05 §2.2

// docs/04 rule 4: legal action, regulator, media. Kept narrow: words like "press" or "court" misfire on ordinary text.
const ESCALATION_WORDS = /\b(solicitors?|lawyers?|legal action|regulator|FCA|Financial Conduct Authority|journalists?|newspapers?|media)\b/i;

export type RouteInput = {
  maskingFailed: boolean;
  injection: boolean;
  triage: TriageOutput | null; // null when the AI output was invalid after one retry
  redressAmount: number | null;
  maskedText: string;
};

export type RouteDecision = {
  route: Route;
  reason: string;
  requiresSeniorCoApproval: boolean;
  financialCrimeReferral: boolean;
};

const distinctDrivers = (t: TriageOutput) => new Set(t.vulnerabilityIndicators.map((i) => i.driver)).size;

export function routeCase(input: RouteInput): RouteDecision {
  const { triage, redressAmount } = input;
  const coApproval = Boolean(triage?.vulnerable) || (redressAmount ?? 0) > HANDLER_LIMIT;
  const decide = (route: Route, reason: string, financialCrimeReferral = false): RouteDecision => ({
    route, reason, requiresSeniorCoApproval: coApproval, financialCrimeReferral,
  });

  if (input.maskingFailed) return decide("Handler", "Masking failed: manual handling, no AI processing");
  if (input.injection) return decide("Handler", "Instruction aimed at the AI: draft withheld; refer to Financial Crime (POL-10 §1.3)", true);
  if (!triage) return decide("Handler", "AI output invalid: manual handling");

  if (triage.category === "Unauthorised payment" || triage.category === "APP scam") {
    return decide("Fraud & Disputes", "Authorisation decisions are reserved for Fraud & Disputes (POL-04 §3.3, POL-10 §2.1)");
  }
  if (triage.category === "Lending and affordability") return decide("Lending Support", "Lending and affordability (POL-10 §2.2)");
  if (ESCALATION_WORDS.test(input.maskedText)) {
    return decide("Complaints Management", "Mentions legal action, a regulator or the media (POL-10 §1.2, §2.4)");
  }
  if ((redressAmount ?? 0) > SENIOR_LIMIT) return decide("Complaints Management", "Redress over £1,000 (POL-10 §2.4)");
  if (triage.vulnerable) {
    return distinctDrivers(triage) >= 2
      ? decide("Vulnerability Team", "Complex vulnerability: two or more FG21/1 drivers (POL-10 §2.3)")
      : decide("Senior", "Vulnerable customer: senior co-approval (POL-07 §2.2)");
  }
  if (triage.categoryConfidence < CONFIDENCE_THRESHOLD) return decide("Handler", "Low confidence: check classification");
  return decide("Handler", "Standard complaint");
}

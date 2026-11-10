// The letter owed when a DISP deadline is reached without a final response (docs/12):
// an eight-week letter (DISP 1.6.2R(2)) or a payment services holding response (DISP 1.6.2AR).
// A fixed template, not a model call: the handler fills in the reason and the date, and approves it. Nothing is sent.
import type { CaseStatus } from "./audit";
import type { Deadline } from "./types";

export type LetterType = "Eight-week letter" | "Holding response";

const CLOSED: CaseStatus[] = ["Approved", "Co-approved", "Accepted by specialist"];

export function letterTypeFor(deadline: Deadline | null): LetterType | null {
  if (deadline?.basis === "DISP-G §2.2") return "Eight-week letter";
  if (deadline?.basis === "DISP-G §2.4") return "Holding response";
  return null; // summary resolutions have no such letter
}

export function isLetterDue(deadline: Deadline | null, status: CaseStatus): boolean {
  return Boolean(deadline && letterTypeFor(deadline) && deadline.used >= deadline.total && !CLOSED.includes(status));
}

// Deliberately no "six months from this letter": that time limit runs from a final response (DISP 2.8), so an
// eight-week letter must not start it. LTR-01 fails a letter that mentions six months (docs/12).
export function letterTemplate(type: LetterType, ref?: string): string {
  const head = ["Dear [CUSTOMER_1],", ...(ref ? [`Your complaint reference: ${ref}`] : [])];
  if (type === "Eight-week letter") {
    return [
      ...head,
      "It is now eight weeks since we received your complaint, and we are sorry that we have not yet been able to give you our final response.",
      "This is because [reason for the delay].",
      "We are still investigating and expect to send you our final response by [DD/MM/YYYY].",
      "If you do not want to wait, you can refer your complaint to the Financial Ombudsman Service now. It is a free, independent service that settles disputes between customers and financial businesses.",
      "We have enclosed the Financial Ombudsman Service's leaflet, which explains how to do this. You can also find out more at www.financial-ombudsman.org.uk.",
      "If you are happy to wait, you do not need to do anything. We will contact you as soon as we have our final response.",
      "Yours sincerely,",
    ].join("\n");
  }
  return [
    ...head,
    "We are sorry that we cannot give you our final response within 15 business days of receiving your complaint.",
    "This is because [reason for the delay].",
    "You will receive our final response by [DD/MM/YYYY].",
    "Yours sincerely,",
  ].join("\n");
}

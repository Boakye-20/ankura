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

export function letterTemplate(type: LetterType): string {
  const opening = "Dear [CUSTOMER_1],";
  const fos = [
    "You can refer your complaint to the Financial Ombudsman Service now, if you wish. It is a free, independent service.",
    "We have enclosed the Financial Ombudsman Service's leaflet, which explains how to do this.",
    "You can also find out more at www.financial-ombudsman.org.uk.",
  ];
  if (type === "Eight-week letter") {
    return [
      opening,
      "We are sorry that we have not yet been able to give you our final response to your complaint.",
      "This is because [reason for the delay].",
      "We expect to send you our final response by [DD/MM/YYYY].",
      ...fos,
      "Yours sincerely,",
    ].join("\n");
  }
  return [
    opening,
    "We are sorry that we cannot give you our final response within 15 business days.",
    "This is because [reason for the delay].",
    "You will receive our final response by [DD/MM/YYYY].",
    "Yours sincerely,",
  ].join("\n");
}

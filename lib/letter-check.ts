// LTR-01: code check that a delay letter contains every element the rules require (docs/12 checklist).
// Server-side only, like the rest of the verifier.
import { addBusinessDays, DEMO_TODAY } from "./deadlines";
import type { LetterType } from "./letter";
import type { Check } from "./types";

const DATE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
const PLACEHOLDER = /\[(reason for the delay|DD\/MM\/YYYY)\]/;

export function checkLetter(text: string, type: LetterType, received: string): Check {
  const missing: string[] = [];
  const reasonLine = text.split("\n").find((l) => /\bbecause\b/i.test(l)) ?? "";
  if (!reasonLine || PLACEHOLDER.test(reasonLine) || reasonLine.replace(/.*because/i, "").trim().length < 10) missing.push("a reason for the delay");

  const match = DATE.exec(text);
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  if (!iso || iso <= DEMO_TODAY) missing.push("an expected date for the final response, after today");
  else if (type === "Holding response" && iso > addBusinessDays(received, 35)) missing.push("a final response date within 35 business days of receipt (DISP 1.6.2AR)");

  if (type === "Eight-week letter") {
    if (!/refer your complaint to the Financial Ombudsman Service/i.test(text)) missing.push("the right to refer to the Financial Ombudsman Service now");
    if (!/leaflet/i.test(text)) missing.push("the Financial Ombudsman Service leaflet");
    if (!/financial-ombudsman\.org\.uk/i.test(text)) missing.push("the Financial Ombudsman Service website");
  }
  if (/\b(six|6) months\b/i.test(text)) missing.push("no six-month wording: that belongs only in a final response (DISP 2.8)");

  const label = type === "Eight-week letter" ? "Eight-week letter complete" : "Holding response complete";
  return missing.length
    ? { id: "LTR-01", label, result: "Fail", detail: `Missing or wrong: ${missing.join("; ")}` }
    : { id: "LTR-01", label, result: "Pass", detail: `Every element required by ${type === "Eight-week letter" ? "DISP 1.6.2R(2)" : "DISP 1.6.2AR"} is present` };
}

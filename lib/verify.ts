// Step 5 of the pipeline (docs/04): code-only checks on every AI output before a person sees it.
// A Fail blocks approval in the app; a Refer asks for a person's judgement.
import { gbp } from "./format";
import { CONFIDENCE_THRESHOLD, HANDLER_LIMIT, SENIOR_LIMIT } from "./route";
import type { Check, Clause, DraftOutput, ResponseType, TriageOutput } from "./types";

export type VerifyInput = {
  maskLeaks: string[];
  obfuscatedRuns: number;
  tokenCount: number;
  maskedText: string; // the masked complaint
  maskedNotes: string[]; // masked case note texts
  triage: TriageOutput | null;
  schemaError: string | null; // set when an AI output failed validation after one retry
  responseType: ResponseType | null;
  draft: DraftOutput | null;
  retrievedIds: string[];
  library: Pick<Clause, "id" | "text">[];
};

export const INJECTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above) instructions/i,
  /system (note|prompt|message)/i,
  /you are now/i,
  /as an ai/i,
  /disregard (the|your) (rules|policy)/i,
  /approve .* (payment|refund|compensation)/i,
  /assistant:/i,
  /<\/?(system|instructions)>/i,
];

export const MAX_WORDS = 180;
const MAX_SENTENCE_WORDS = 30;
const MAX_AVERAGE_SENTENCE_WORDS = 20;
const FACTUAL = /\d|£|\bdays?\b|refund|\bwill\b|policy/i;
const MASK_TOKEN = /\[[A-Z]+_\d+\]/g;
/** CIT-02: a part that states a fact must cite a clause. The digit inside a masking token such as [CUSTOMER_1] is not a fact. */
export const isFactual = (text: string) => FACTUAL.test(text.replace(MASK_TOKEN, ""));
const MONEY = /£\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/g;

const check = (id: string, label: string, result: Check["result"], detail: string): Check => ({ id, label, result, detail });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function injectionMatched(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

const OFFER = /\b(pay|paid|paying|refund\w*|reimburs\w*|compensat\w*|goodwill|credit(?:ed|ing)?|offer\w*)\b/i;

/** Amounts the draft offers: the redress field plus any £ figure in a part that talks about paying or refunding. */
export function offeredAmounts(draft: Pick<DraftOutput, "response" | "proposedRedress">): number[] {
  return [
    ...(draft.proposedRedress ? [draft.proposedRedress.amount] : []),
    ...draft.response.filter((p) => OFFER.test(p.text)).flatMap((p) => moneyAmounts(p.text)),
  ];
}

export function moneyAmounts(text: string): number[] {
  return [...text.matchAll(MONEY)].map((m) => Number(m[1].replace(/,/g, "") + (m[2] ?? "")));
}

const words = (text: string) => text.split(/\s+/).filter(Boolean);
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter((s) => words(s).length > 0);

export function verify(input: VerifyInput): Check[] {
  const { triage, draft } = input;
  const checks: Check[] = [];

  checks.push(input.maskLeaks.length
    ? check("MASK-01", "Personal data masking", "Fail", `Leak check found unmasked data (${input.maskLeaks.join(", ")}). No AI processing.`)
    : check("MASK-01", "Personal data masking", "Pass", `${plural(input.tokenCount, "token")} replaced before AI processing`));

  checks.push(input.obfuscatedRuns
    ? check("MASK-02", "Obfuscated personal data", "Refer", `${plural(input.obfuscatedRuns, "run")} of number words masked as [NUMBER_n]; check before release`)
    : check("MASK-02", "Obfuscated personal data", "Pass", "No runs of number words found"));

  const ruleHit = injectionMatched(input.maskedText);
  const modelHit = Boolean(triage?.injectionSuspected);
  checks.push(ruleHit || modelHit
    ? check("INJ-01", "Instruction aimed at the AI", "Fail", `${[ruleHit && "rule pattern matched", modelHit && "triage flagged injection"].filter(Boolean).join(" and ")}; draft withheld`)
    : check("INJ-01", "Instruction aimed at the AI", "Pass", "No rule pattern matched; triage did not flag injection"));

  if (input.schemaError) checks.push(check("SCHEMA-01", "AI output format", "Fail", input.schemaError));
  else if (triage) checks.push(check("SCHEMA-01", "AI output format", "Pass", "Every AI output matched its schema"));

  if (triage) {
    checks.push(triage.vulnerable
      ? check("VUL-01", "Vulnerability", "Refer", `Vulnerability indicators found: senior co-approval required (POL-07 §2.2)`)
      : check("VUL-01", "Vulnerability", "Pass", "No vulnerability indicators found"));
    checks.push(triage.categoryConfidence < CONFIDENCE_THRESHOLD
      ? check("CONF-01", "Classification confidence", "Refer", `Confidence ${triage.categoryConfidence.toFixed(2)} is below ${CONFIDENCE_THRESHOLD}: check the classification`)
      : check("CONF-01", "Classification confidence", "Pass", `Confidence ${triage.categoryConfidence.toFixed(2)}`));
  }

  if (draft) checks.push(...verifyDraft(input, draft));
  return checks;
}

function verifyDraft(input: VerifyInput, draft: DraftOutput): Check[] {
  const checks: Check[] = [];
  const libraryIds = new Set(input.library.map((c) => c.id));
  const cited = [...new Set([...draft.response.flatMap((p) => p.citations), ...(draft.proposedRedress ? [draft.proposedRedress.clause] : [])])];
  const handoverIds = draft.handover
    ? [...draft.handover.decisionsRequired.map((d) => d.clause), ...draft.handover.actionsTaken.map((a) => a.source).filter((s) => !/^N-\d+$/.test(s))]
    : [];
  const fullText = draft.response.map((p) => p.text).join(" ");

  const invalid = [...new Set([...cited, ...handoverIds])].filter((id) => !libraryIds.has(id));
  checks.push(invalid.length
    ? check("CIT-01", "Citations exist", "Fail", `Not in the policy library: ${invalid.join(", ")}`)
    : check("CIT-01", "Citations exist", "Pass", `${plural(cited.length, "clause")} cited, all in the policy library`));

  const factual = draft.response.filter((p) => isFactual(p.text));
  const uncited = factual.filter((p) => p.citations.length === 0);
  checks.push(uncited.length
    ? check("CIT-02", "Facts are cited", "Fail", `${uncited.length} of ${plural(factual.length, "factual part")} ${uncited.length === 1 ? "has" : "have"} no citation: "${uncited[0].text.slice(0, 60)}…"`)
    : check("CIT-02", "Facts are cited", "Pass", `${factual.length} of ${plural(factual.length, "factual part")} cite a clause`));

  const notRetrieved = cited.filter((id) => libraryIds.has(id) && !input.retrievedIds.includes(id));
  checks.push(notRetrieved.length
    ? check("CIT-03", "Citations match retrieved policy", "Refer", `Cited but not retrieved for this case: ${notRetrieved.join(", ")}`)
    : check("CIT-03", "Citations match retrieved policy", "Pass", "Every cited clause was retrieved for this case"));

  // The redress field and any amount offered in the text both count, so a draft can't slip an offer past the limits.
  const offered = offeredAmounts(draft);
  const amount = offered.length ? Math.max(...offered) : null;
  if (amount === null) checks.push(check("RED-01", "Redress authority", "Pass", "No redress offered"));
  else if (amount > SENIOR_LIMIT) checks.push(check("RED-01", "Redress authority", "Fail", `${gbp(amount)} offered is above the senior limit of £1,000 (POL-05 §2.2)`));
  else if (amount > HANDLER_LIMIT) checks.push(check("RED-01", "Redress authority", "Refer", `${gbp(amount)} offered is above the handler limit of £250: senior co-approval (POL-05 §2.1)`));
  else checks.push(check("RED-01", "Redress authority", "Pass", `${gbp(amount)} offered is within the handler limit of £250`));

  // Case notes and cited clauses are a basis for an amount; the customer's own text is not (POL-05 §2.5).
  const trusted = new Set(moneyAmounts([...input.maskedNotes, ...input.library.filter((c) => cited.includes(c.id)).map((c) => c.text)].join(" ")));
  const fromComplaint = new Set(moneyAmounts(input.maskedText));
  const draftAmounts = [...new Set([...moneyAmounts(fullText), ...offered])];
  const unsupported = draftAmounts.filter((a) => !trusted.has(a) && !fromComplaint.has(a));
  const complaintOnly = draftAmounts.filter((a) => !trusted.has(a) && fromComplaint.has(a));
  if (unsupported.length) checks.push(check("RED-02", "Basis for the amount", "Fail", `${unsupported.map((a) => gbp(a)).join(", ")} not found in the complaint, case notes or a cited clause`));
  else if (complaintOnly.length) checks.push(check("RED-02", "Basis for the amount", "Refer", `${complaintOnly.map((a) => gbp(a)).join(", ")} appears only in the customer's complaint: check it is not an amount the customer asked for (POL-05 §2.5)`));
  else checks.push(check("RED-02", "Basis for the amount", "Pass", draftAmounts.length ? "Every amount appears in the case notes or a cited clause" : "No amounts in the draft"));

  checks.push(fosCheck(input.responseType, draft, fullText));

  const sentenceLengths = sentences(fullText).map((s) => words(s).length);
  const total = words(fullText).length;
  const longest = Math.max(0, ...sentenceLengths);
  const average = sentenceLengths.length ? total / sentenceLengths.length : 0;
  const problems = [
    total > MAX_WORDS && `${total} words (limit ${MAX_WORDS})`,
    longest > MAX_SENTENCE_WORDS && `a ${longest}-word sentence`,
    average > MAX_AVERAGE_SENTENCE_WORDS && `average sentence ${average.toFixed(1)} words`,
  ].filter(Boolean);
  checks.push(problems.length
    ? check("CLEAR-01", "Plain language", "Refer", problems.join("; "))
    : check("CLEAR-01", "Plain language", "Pass", `${total} words, average sentence ${average.toFixed(1)} words`));

  return checks;
}

function fosCheck(responseType: ResponseType | null, draft: DraftOutput, fullText: string): Check {
  const label = "Ombudsman signposting";
  if (responseType === "Acknowledgement") return check("FOS-01", label, "Pass", "Not required in an acknowledgement; the final response will signpost the FOS");
  const citesFos = draft.response.some((p) => p.citations.includes("DISP-G §2.3"));
  const mentionsFos = /financial ombudsman/i.test(fullText);
  const mentionsTimeLimit = /\b(six|6) months\b/i.test(fullText);
  const missing = [
    !citesFos && "no citation of DISP-G §2.3",
    !mentionsFos && 'no mention of the "Financial Ombudsman"',
    responseType === "Final response" && !mentionsTimeLimit && "no six-month time limit (DISP-G §2.5)",
  ].filter(Boolean);
  return missing.length
    ? check("FOS-01", label, "Fail", `${responseType}: ${missing.join("; ")}`)
    : check("FOS-01", label, "Pass", `${responseType} tells the customer about the Financial Ombudsman Service`);
}

export const hasFail = (checks: Check[]) => checks.some((c) => c.result === "Fail");

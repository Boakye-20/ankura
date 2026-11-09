// Step 1 of the pipeline (docs/04): replace personal data with numbered tokens before any model call.
// Pure function: the caller passes the synthetic name and merchant lists. The token map stays server-side.
import type { CaseNote, Complaint } from "./types";

export type TokenType = "CUSTOMER" | "PERSON" | "ACCOUNT" | "SORTCODE" | "CARD" | "EMAIL" | "PHONE" | "POSTCODE" | "MERCHANT" | "NUMBER";

export type MaskResult = {
  maskedText: string;
  maskedNotes: CaseNote[];
  tokenMap: Record<string, string>; // token -> real value. Never logged, never saved, never sent.
  counts: Partial<Record<TokenType, number>>;
  leaks: string[]; // customer or list values still present after masking (MASK-01)
  obfuscatedRuns: number; // runs of 3+ number words found and masked (MASK-02)
};

type MaskLists = { names: string[]; merchants: string[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digitsOnly = (s: string) => s.replace(/\D/g, "");

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MOBILE = /(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b/g;
const LANDLINE = /\b0\d{2,4}\s?\d{3,4}\s?\d{3,4}\b/g;
const CARD_ENDING = /(\bcard ending(?: in)?\s+)(\d{4})\b/gi;
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
// 8 to 12 digits, optionally split by spaces, dashes or a line break (adversarial case A9).
// Lookarounds skip internal references such as BRN-2026-0918.
const ACCOUNT = /(?<![\w-])\d{4}(?:[ \-\n]?\d{2,4}){1,2}(?![\w-])/g;
const SORT_CODE = /\b\d{2}[- ]?\d{2}[- ]?\d{2}\b/g;
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/g;
const RELATIVE = /\b((?:[Mm]y|[Oo]ur|[Hh]is|[Hh]er)\s+(?:late\s+)?(?:husband|wife|partner|son|daughter|mother|father|mum|dad|brother|sister|carer|friend)(?:,?\s+(?:named|called))?\s+)([A-Z][a-z]+)\b/g;
const TITLES = "(?:Mr|Mrs|Ms|Miss|Dr)\\.?";

const NUMBER_WORD = "(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)";
// Three or more number words in a row, e.g. "nine nine, one two, three four" (docs/04 heuristic).
export const NUMBER_WORD_RUN = new RegExp(`\\b${NUMBER_WORD}(?:[\\s,\\-]+${NUMBER_WORD}\\b){2,}`, "gi");

export function maskComplaint(complaint: Pick<Complaint, "customer" | "text" | "caseNotes">, lists: MaskLists): MaskResult {
  const tokenMap: Record<string, string> = {};
  const byValue = new Map<string, string>();
  const counts: Partial<Record<TokenType, number>> = {};

  const tokenFor = (type: TokenType, value: string, key = value.toLowerCase()): string => {
    const existing = byValue.get(`${type}:${key}`);
    if (existing) return existing;
    counts[type] = (counts[type] ?? 0) + 1;
    const token = `[${type}_${counts[type]}]`;
    byValue.set(`${type}:${key}`, token);
    tokenMap[token] = value;
    return token;
  };

  const { name } = complaint.customer;
  const [first, ...rest] = name.split(" ");
  const surname = rest.join(" ");
  const others = lists.names.filter((n) => n.toLowerCase() !== name.toLowerCase());
  let obfuscatedRuns = 0;

  // Other people in this case: listed full names that appear anywhere, plus "my wife Gloria" patterns.
  // Their bare first names are masked too, so "Gerald" and "Gerald Whitfield" get the same token.
  const raw = [complaint.text, ...complaint.caseNotes.map((n) => n.text)].join("\n");
  const people = new Map<string, string>(); // first name -> canonical full name (or the first name itself)
  for (const other of others) if (new RegExp(`\\b${escape(other)}\\b`, "i").test(raw)) people.set(other.split(" ")[0], other);
  for (const [, , firstName] of raw.matchAll(RELATIVE)) {
    if (!people.has(firstName)) people.set(firstName, others.find((o) => o.split(" ")[0] === firstName) ?? firstName);
  }

  const maskOne = (input: string): string => {
    let t = input;
    t = t.replace(EMAIL, (m) => tokenFor("EMAIL", m));
    t = t.replace(MOBILE, (m) => tokenFor("PHONE", m, digitsOnly(m)));
    t = t.replace(LANDLINE, (m) => tokenFor("PHONE", m, digitsOnly(m)));
    t = t.replace(CARD_ENDING, (_, lead: string, d: string) => lead + tokenFor("CARD", d));
    t = t.replace(CARD, (m) => tokenFor("CARD", m, digitsOnly(m)));
    t = t.replace(ACCOUNT, (m) => {
      const n = digitsOnly(m).length;
      return n >= 8 && n <= 12 ? tokenFor("ACCOUNT", m, digitsOnly(m)) : m;
    });
    t = t.replace(SORT_CODE, (m) => tokenFor("SORTCODE", m, digitsOnly(m)));
    t = t.replace(POSTCODE, (m) => tokenFor("POSTCODE", m, m.replace(/\s/g, "")));
    t = t.replace(NUMBER_WORD_RUN, (m) => {
      obfuscatedRuns++;
      return tokenFor("NUMBER", m);
    });

    // Names: the customer first, then other listed people, then relatives named only by first name.
    t = t.replace(new RegExp(`\\b${escape(name)}\\b`, "gi"), () => tokenFor("CUSTOMER", name));
    if (surname) t = t.replace(new RegExp(`\\b${TITLES}\\s+${escape(surname)}\\b`, "g"), () => tokenFor("CUSTOMER", name));
    t = t.replace(new RegExp(`\\b${escape(first)}\\b`, "g"), () => tokenFor("CUSTOMER", name));
    for (const other of others) t = t.replace(new RegExp(`\\b${escape(other)}\\b`, "gi"), () => tokenFor("PERSON", other));
    for (const [firstName, full] of people) t = t.replace(new RegExp(`\\b${escape(firstName)}\\b`, "g"), () => tokenFor("PERSON", full));
    for (const merchant of lists.merchants) t = t.replace(new RegExp(`\\b${escape(merchant)}\\b`, "gi"), () => tokenFor("MERCHANT", merchant));
    return t;
  };

  const maskedText = maskOne(complaint.text);
  const maskedNotes = complaint.caseNotes.map((n) => ({ ...n, text: maskOne(n.text) }));
  const allMasked = [maskedText, ...maskedNotes.map((n) => n.text)].join("\n");

  return { maskedText, maskedNotes, tokenMap, counts, leaks: findLeaks(allMasked, complaint.customer, lists, [...people.keys()]), obfuscatedRuns };
}

/** Leak check (MASK-01): any customer value, listed name or merchant still present in the masked text. */
export function findLeaks(masked: string, customer: Complaint["customer"], lists: MaskLists, personFirstNames: string[] = []): string[] {
  const leaks: string[] = [];
  for (const [field, value] of Object.entries(customer)) {
    if (!value) continue;
    const digits = digitsOnly(value);
    const isNumeric = field !== "name" && field !== "email" && field !== "postcode" && digits.length >= 6;
    const pattern = isNumeric
      ? new RegExp(digits.split("").join("[\\s-]?")) // tolerate spacing differences
      : new RegExp(escape(value).replace(/ /g, "\\s?"), "i");
    if (pattern.test(masked)) leaks.push(`customer ${field}`);
  }
  // Labels only: leak details appear in the checks panel, so they must never contain the value itself.
  for (const value of lists.names) if (new RegExp(`\\b${escape(value)}\\b`, "i").test(masked)) leaks.push("listed person name");
  for (const value of personFirstNames) if (new RegExp(`\\b${escape(value)}\\b`).test(masked)) leaks.push("person first name");
  for (const value of lists.merchants) if (new RegExp(`\\b${escape(value)}\\b`, "i").test(masked)) leaks.push("merchant name");
  return leaks;
}

/** Total tokens used in a mask result. */
export function tokenCount(counts: MaskResult["counts"]): number {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}

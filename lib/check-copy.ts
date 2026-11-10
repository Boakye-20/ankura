// What each code check means, in words a complaint handler would use. The IDs are the verifier's (lib/verify.ts,
// lib/letter.ts); the stored results keep their own technical labels, and the UI reads the name from here.
import type { Check } from "./types";

export const CHECK_COPY: Record<string, { name: string; what: string }> = {
  "MASK-01": { name: "Personal data masked", what: "Names, account numbers, contact details and merchants were replaced before anything went to the AI. If any slipped through, the case gets no AI processing." },
  "MASK-02": { name: "Hidden personal data", what: "Looks for numbers written out as words, a way of getting round masking, and asks a person to check before release." },
  "INJ-01": { name: "Instruction aimed at the AI", what: "If the complaint tells the AI what to do, the draft is withheld and a person writes the reply." },
  "SCHEMA-01": { name: "AI answer in the expected format", what: "Every AI answer must match the agreed structure. If it does not, the case goes to a person." },
  "VUL-01": { name: "Signs of vulnerability", what: "Any sign of vulnerability means a senior must approve the reply as well as the handler." },
  "CONF-01": { name: "AI sure of the complaint type", what: "If the AI is unsure what kind of complaint this is, a person checks the classification." },
  "CIT-01": { name: "Policy references exist", what: "Every policy the draft refers to must be in the bank's policy library." },
  "CIT-02": { name: "Claims backed by policy", what: "A sentence that says what the bank will do, or gives a deadline or amount that did not come from the customer's own complaint, must point to a policy clause." },
  "CIT-03": { name: "References match the policy found", what: "The draft should only cite clauses the policy search found for this case. Anything else is flagged for a look." },
  "RED-01": { name: "Redress within authority", what: "A handler can approve up to £250, a senior up to £1,000. Anything above £1,000 is blocked." },
  "RED-02": { name: "Amount has a basis", what: "Any £ amount in the draft must come from the case notes or a policy clause, never from what the customer asked for." },
  "FOS-01": { name: "Ombudsman signposting", what: "Final and summary responses must tell the customer they can go to the Financial Ombudsman Service." },
  "CLEAR-01": { name: "Plain, readable reply", what: "Short sentences and a limited length, so the reply is easy to read." },
  "LTR-01": { name: "Delay letter complete", what: "A delay letter must give the reason, the date to expect a reply and the ombudsman's details." },
};

export const checkName = (c: Pick<Check, "id" | "label">): string => CHECK_COPY[c.id]?.name ?? c.label;
export const checkWhat = (id: string): string => CHECK_COPY[id]?.what ?? "";

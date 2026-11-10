// The case record in plain English for handlers and reviewers. The stored record (and the CSV export) keep the
// exact technical text; this only changes how it is shown.
import { clauseName } from "./case-helpers";
import { checkName } from "./check-copy";
import type { ClauseInfo } from "./stored-types";
import type { AuditEvent } from "./types";

const TOKEN_WORDS: Record<string, string> = {
  CUSTOMER: "customer name", PERSON: "another person's name", ACCOUNT: "account number", SORTCODE: "sort code",
  CARD: "card number", PHONE: "phone number", EMAIL: "email address", POSTCODE: "postcode", MERCHANT: "merchant", NUMBER: "number written in words",
};
const FLAG_WORDS: Record<string, string> = {
  vulnerable: "Signs of vulnerability",
  "payment services": "Payment complaint: 15 business days to reply",
  "summary resolution": "Can be closed within 3 business days",
  "injection suspected": "Contains an instruction aimed at the AI",
};
const STAFF_EVENTS: Record<string, string> = {
  Amended: "Draft edited",
  "Over-reliance prompt shown": "Quick-approval check shown",
  "Over-reliance prompt confirmed": "Handler confirmed they read the reply",
  "Missing item marked not available": "Missing item marked not available",
};
const SYSTEM_WHO: Record<string, string> = { triage: "AI model", drafting: "AI model" };

const CLAUSE_ID = /\b(?:POL-\d{2}|DISP-G) §\d+\.\d+/g;
const CHECK_ID = /\b(MASK|INJ|SCHEMA|VUL|CONF|CIT|RED|FOS|CLEAR|LTR)-\d{2}\b/g;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export type EventView = { what: string; who: string; detail: string };

export function describeEvent(e: AuditEvent, clauses: Record<string, ClauseInfo>): EventView {
  const words = (text: string) => text.replace(CLAUSE_ID, (id) => clauseName(id, clauses)).replace(CHECK_ID, (id) => checkName({ id, label: id }));
  const [who, role] = e.actor.split(" · ");
  if (who !== "System") return { what: STAFF_EVENTS[e.event] ?? e.event, who: role ? `${who} (${role})` : who, detail: words(e.detail) };

  const system = { who: SYSTEM_WHO[role] ?? "Automatic (code)" };
  const d = e.detail;
  switch (e.event) {
    case "Personal data masked": {
      const [count, kinds = ""] = d.split(": ");
      const list = kinds.split(", ").filter(Boolean).map((k) => TOKEN_WORDS[k] ?? k.toLowerCase());
      return { ...system, what: "Personal details hidden", detail: `${plural(parseInt(count, 10), "item")} hidden before the AI saw anything${list.length ? `: ${list.join(", ")}` : ""}.` };
    }
    case "Classified": {
      const category = d.split(", confidence")[0];
      const flags = (/flags: ([^·]+)/.exec(d)?.[1] ?? "").split(",").map((f) => f.trim()).filter(Boolean);
      return { ...system, what: "Complaint sorted", detail: [`Sorted as ${category}.`, ...flags.map((f) => `${FLAG_WORDS[f] ?? f}.`)].join(" ") };
    }
    case "Policy retrieved": {
      const ids = d.match(CLAUSE_ID) ?? [];
      const lead = ids.filter((id) => clauses[id]).slice(0, 3).map((id) => clauseName(id, clauses));
      return { ...system, what: "Policy found", detail: `${plural(ids.length, "policy clause")} found${lead.length ? `, led by ${lead.join("; ")}` : ""}.` };
    }
    case "Draft generated": {
      const [type] = d.split(" · ");
      const cited = (/cites ([^·]+)/.exec(d)?.[1].match(CLAUSE_ID) ?? []).length;
      return { ...system, what: "Reply drafted", detail: `${type} drafted, citing ${plural(cited, "policy clause")}.${d.includes("handover pack") ? " Handover pack prepared for the specialist team." : ""}` };
    }
    case "Checks run": {
      const [, total, pass, refer, fail] = /(\d+) checks: (\d+) pass, (\d+) refer, (\d+) fail/.exec(d) ?? [];
      if (!total) return { ...system, what: "Checks run", detail: words(d) };
      if (refer === "0" && fail === "0") return { ...system, what: "Checks run", detail: `All ${total} checks passed.` };
      return { ...system, what: "Checks run", detail: `${total} checks: ${pass} passed, ${refer} ${refer === "1" ? "needs" : "need"} a look, ${fail} ${fail === "1" ? "blocks" : "block"} approval.` };
    }
    case "Check referred":
    case "Check failed": {
      const [id, ...rest] = d.split(": ");
      return { ...system, what: `${e.event === "Check failed" ? "Blocked" : "Needs a look"}: ${checkName({ id, label: id })}`, detail: words(rest.join(": ")) };
    }
    case "Routed": {
      const [team, ...reason] = d.split(": ");
      const why = words(reason.join(": "));
      return { ...system, what: team === "Handler" ? "Kept with a complaint handler" : team === "Senior" ? "Sent to a senior handler" : `Sent to ${team}`, detail: why ? `${why}.`.replace(/\.\.$/, ".") : "" };
    }
    default:
      return { ...system, what: e.event, detail: words(d) };
  }
}

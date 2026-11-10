"use client";
import { checkName, checkWhat } from "@/lib/check-copy";
import type { RegulatorySource } from "@/lib/regulation";
import type { Check } from "@/lib/types";
import { BasisList, Pill } from "./ui";

const TONE = { Pass: "ok", Fail: "bad", Refer: "warn" } as const;

/** One line above the draft: does anything block approval? */
export function CheckSummary({ checks, draftWithheld }: { checks: Check[]; draftWithheld: boolean }) {
  const fails = checks.filter((c) => c.result === "Fail");
  const refers = checks.filter((c) => c.result === "Refer");
  const passed = checks.length - fails.length - refers.length;
  const tone = fails.length ? "bad" : refers.length ? "warn" : "ok";
  const names = (list: Check[]) => list.map(checkName).join(", ");
  const text = fails.length
    ? `${names(fails)}: blocks approval until fixed.`
    : refers.length
      ? `${names(refers)}: needs your judgement.`
      : "All checks passed.";
  return (
    <p className={`status ${tone}`} role="status">
      <span className="dot" aria-hidden="true" />
      <b>{draftWithheld && !fails.length ? "No draft to check. " : ""}{text}</b>
      <span className="count">{passed} of {checks.length} passed</span>
    </p>
  );
}

/** The checks as a table: every one, or only those that need a person. */
export function ChecksTable({ checks, basis, only }: { checks: Check[]; basis: Record<string, RegulatorySource[]>; only: "attention" | "all" }) {
  const rows = only === "attention" ? checks.filter((c) => c.result !== "Pass") : checks;
  if (!rows.length) return null;
  return (
    <div className="tw">
      <table className="dt checks">
        <thead><tr><th scope="col">Result</th><th scope="col">Check</th><th scope="col">What it found</th><th scope="col">Rule it supports</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className={c.result === "Fail" ? "bad" : c.result === "Refer" ? "warn" : ""}>
              <td><Pill tone={TONE[c.result]}>{c.result === "Refer" ? "Check" : c.result}</Pill></td>
              <td><span className="name">{checkName(c)}</span>{only === "all" && <><br /><span className="note">{checkWhat(c.id)}</span></>}</td>
              <td>{c.detail}</td>
              <td><BasisList basis={basis[c.id] ?? []} prefix={false} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

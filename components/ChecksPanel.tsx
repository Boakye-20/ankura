"use client";
import type { RegulatorySource } from "@/lib/regulation";
import type { Check } from "@/lib/types";
import { BasisList, Pill } from "./ui";

const TONE = { Pass: "ok", Fail: "bad", Refer: "warn" } as const;

/** One line in the reply box: does anything block approval? */
export function CheckSummary({ checks, draftWithheld }: { checks: Check[]; draftWithheld: boolean }) {
  const fails = checks.filter((c) => c.result === "Fail");
  const refers = checks.filter((c) => c.result === "Refer");
  const passed = checks.length - fails.length - refers.length;
  const tone = fails.length ? "bad" : refers.length ? "warn" : "ok";
  const text = fails.length
    ? `${fails.map((c) => c.label).join(", ")}: blocks approval. ${passed} of ${checks.length} checks passed.`
    : refers.length
      ? `${refers.map((c) => c.label).join(", ")}: needs your judgement. ${passed} of ${checks.length} checks passed.`
      : `All ${checks.length} checks passed.`;
  return (
    <p className={`status-line ${tone}`} role="status">
      <span className="dot" aria-hidden="true" />
      {draftWithheld && !fails.length ? "No draft to check. " : ""}{text}
    </p>
  );
}

/** Context panel: what needs attention first, then every check and the rule it is designed to support. */
export function ChecksPanel({ checks, basis, amended, draftWithheld }: { checks: Check[]; basis: Record<string, RegulatorySource[]>; amended: boolean; draftWithheld: boolean }) {
  const attention = checks.filter((c) => c.result !== "Pass");
  const row = (c: Check, withBasis: boolean) => (
    <li key={c.id}>
      <Pill tone={TONE[c.result]}>{c.result}</Pill>
      <span>
        <span className="cid">{c.label}</span> <span className="note">({c.id})</span>
        <br />
        <span className="note">{c.detail}</span>
        {withBasis && <><br /><BasisList basis={basis[c.id] ?? []} /></>}
      </span>
    </li>
  );
  return (
    <>
      <h3>Checks before release</h3>
      <p className="note">Run by code, not by the AI{amended ? ", and re-run on your amended reply" : ""}. A fail blocks approval.</p>
      {attention.length > 0 && <ul className="checks">{attention.map((c) => row(c, false))}</ul>}
      <details>
        <summary>All {checks.length} checks and the rules they support</summary>
        <ul className="checks">{checks.map((c) => row(c, true))}</ul>
      </details>
      {draftWithheld && <p className="note">Checks on the draft (citations, redress, ombudsman wording, plain language) did not run because there is no draft.</p>}
    </>
  );
}

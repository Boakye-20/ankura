"use client";
import type { RegulatorySource } from "@/lib/regulation";
import type { Check } from "@/lib/types";
import { BasisList, Pill } from "./ui";

const TONE = { Pass: "ok", Fail: "bad", Refer: "warn" } as const;
const names = (checks: Check[]) => checks.map((c) => `${c.label} (${c.id})`).join(", ");

/** One line above the draft: can it be approved, and if not, which check stopped it? */
export function CheckSummary({ checks, draftWithheld }: { checks: Check[]; draftWithheld: boolean }) {
  const fails = checks.filter((c) => c.result === "Fail");
  const refers = checks.filter((c) => c.result === "Refer");
  const passed = checks.length - fails.length - refers.length;
  const tone = fails.length ? "bad" : refers.length ? "warn" : "ok";
  return (
    <p className={`status ${tone}`} role="status">
      <span className="dot" aria-hidden="true" />
      <span>
        {fails.length > 0 && <><b>{draftWithheld ? "Draft withheld." : "Approval blocked."}</b> Failed: {names(fails)}.</>}
        {!fails.length && refers.length > 0 && <><b>Needs your judgement.</b> Review: {names(refers)}.</>}
        {!fails.length && !refers.length && <b>All checks passed.</b>}
      </span>
      <span className="count">{passed} of {checks.length} passed</span>
    </p>
  );
}

/** Every check that needs attention, then the full list with the rule each one is designed to support. */
export function ChecksPanel({ checks, basis, amended, draftWithheld }: { checks: Check[]; basis: Record<string, RegulatorySource[]>; amended: boolean; draftWithheld: boolean }) {
  const attention = checks.filter((c) => c.result !== "Pass");
  const row = (c: Check, withBasis: boolean) => (
    <li key={c.id}>
      <Pill tone={TONE[c.result]}>{c.result}</Pill>
      <span>
        <span className="name">{c.label}</span> <span className="label">{c.id}</span>
        <br />
        <span className="note">{c.detail}</span>
        {withBasis && <><br /><BasisList basis={basis[c.id] ?? []} /></>}
      </span>
    </li>
  );
  return (
    <>
      <div className="sec-head">
        <h3>Checks</h3>
        <span className="label">Run by code, not by the AI{amended ? ". Re-run on your amended reply" : ""}</span>
      </div>
      {attention.length > 0 && <ul className="rows">{attention.map((c) => row(c, false))}</ul>}
      <details>
        <summary>All {checks.length} checks and the rules they support</summary>
        <ul className="rows">{checks.map((c) => row(c, true))}</ul>
      </details>
      {draftWithheld && <p className="note">The checks on a draft (citations, redress, ombudsman wording, plain language) did not run because there is no draft.</p>}
    </>
  );
}

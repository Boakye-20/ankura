"use client";
// Small shared pieces. All complaint and draft text is rendered as React text, never as HTML (slopsec rule 3).
import { useState, type ReactNode } from "react";
import { clauseName, type Tone } from "@/lib/case-helpers";
import type { RegulatorySource } from "@/lib/regulation";
import type { ClauseInfo } from "@/lib/stored-types";

export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Box({ title, label, tone, children }: { title: string; label?: ReactNode; tone?: "blocked"; children: ReactNode }) {
  return (
    <section className={`box ${tone ?? ""}`}>
      <div className="bh"><h3>{title}</h3>{typeof label === "string" ? <span className="label">{label}</span> : label}</div>
      <div className="bb">{children}</div>
    </section>
  );
}

/** One number with a label. A button when it applies a filter; `active` shows it is applied. */
export function StatTile({ label, value, sub, tone = "", active, onClick }: { label: string; value: ReactNode; sub?: string; tone?: Tone; active?: boolean; onClick?: () => void }) {
  const body = <><span className="stat-label">{label}</span><b className={`stat-value ${tone}`}>{value}</b>{sub && <span className="stat-sub">{sub}</span>}</>;
  return onClick
    ? <button type="button" className="stat" aria-pressed={active} onClick={onClick}>{body}</button>
    : <div className="stat">{body}</div>;
}

const TOKEN = /(\[[A-Z]+_\d+\])/;
const tokenText = (token: string) => {
  const [kind, n] = token.slice(1, -1).split("_");
  return `${kind[0]}${kind.slice(1).toLowerCase()} ${n}`;
};

/** Text with personal-data tokens such as [CUSTOMER_1] shown as "Customer 1" chips. */
export function MaskedText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) =>
        TOKEN.test(part) ? <span key={i} className="m" title={`Personal data masked before AI processing (${part})`}>{tokenText(part)}</span> : part)}
    </>
  );
}

export function BasisList({ basis, titles = false, prefix = true }: { basis: RegulatorySource[]; titles?: boolean; prefix?: boolean }) {
  if (!basis.length) return <span className="basis">{prefix ? "Meadowlane's own internal rule. No FCA or data protection rule sits behind it." : "Bank's own rule"}</span>;
  return (
    <span className="basis">
      {!titles && prefix && "Designed to support: "}
      {basis.map((b, i) => (
        <span key={b.ref} className={titles ? "basis-row" : undefined}>
          {!titles && i > 0 && "; "}
          {b.url ? <a href={b.url} target="_blank" rel="noreferrer" title={b.title}>{b.ref}</a> : <span title={b.title}>{b.ref}</span>}
          {titles && <span className="note"> {b.title}</span>}
        </span>
      ))}
    </span>
  );
}

/** A policy reference by name ("Unauthorised transactions and fraud §3.3") that opens the clause text on hover, focus or tap. */
export function CitationChip({ id, clauses }: { id: string; clauses: Record<string, ClauseInfo> }) {
  const [open, setOpen] = useState(false);
  const clause = clauses[id];
  return (
    <span className="cite-wrap" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className={`cite ${clause ? "" : "invalid"}`} aria-expanded={open}
        onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {clause ? clauseName(id, clauses) : `${id} · not in the policy library`}
      </button>
      {open && (
        <span className="pop" role="tooltip">
          {clause ? (
            <>
              <b>{clause.title}: {clause.section}</b>
              <span className="label">Policy {clause.doc}, section {clause.id.split("§")[1]}</span>
              <span>{clause.text}</span>
              <BasisList basis={clause.basis} />
            </>
          ) : (
            <span>This reference does not exist in the policy library, so the draft is blocked (Policy references exist).</span>
          )}
        </span>
      )}
    </span>
  );
}

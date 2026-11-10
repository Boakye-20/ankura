"use client";
// Small shared pieces. All complaint and draft text is rendered as React text, never as HTML (slopsec rule 3).
import { useState, type ReactNode } from "react";
import type { RegulatorySource } from "@/lib/regulation";
import type { ClauseInfo } from "@/lib/stored-types";
import type { Tone } from "@/lib/case-helpers";

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

/** Text with personal-data tokens such as [CUSTOMER_1] shown as chips. */
export function MaskedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z]+_\d+\])/).map((part, i) =>
        /^\[[A-Z]+_\d+\]$/.test(part) ? <span key={i} className="m" title="Personal data masked before AI processing">{part}</span> : part)}
    </>
  );
}

export function BasisList({ basis }: { basis: RegulatorySource[] }) {
  if (!basis.length) return <span className="basis">Bank procedure: no regulatory rule is mapped to this clause</span>;
  return (
    <span className="basis">
      Designed to support:{" "}
      {basis.map((b, i) => (
        <span key={b.ref}>
          {i > 0 && "; "}
          {b.url ? <a href={b.url} target="_blank" rel="noreferrer" title={b.title}>{b.ref}</a> : <span title={b.title}>{b.ref}</span>}
        </span>
      ))}
    </span>
  );
}

/** A clause ID that shows the clause text and its regulatory basis on hover, focus or tap. */
export function CitationChip({ id, clauses }: { id: string; clauses: Record<string, ClauseInfo> }) {
  const [open, setOpen] = useState(false);
  const clause = clauses[id];
  return (
    <span className="cite-wrap" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className={`cite ${clause ? "" : "invalid"}`} aria-expanded={open}
        onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {id}{clause ? "" : " · not in library"}
      </button>
      {open && (
        <span className="pop" role="tooltip">
          {clause ? (
            <>
              <b>{clause.id} · {clause.title}</b>
              <span>{clause.text}</span>
              <BasisList basis={clause.basis} />
            </>
          ) : (
            <span>This clause ID does not exist in the policy library. CIT-01 blocks the draft.</span>
          )}
        </span>
      )}
    </span>
  );
}

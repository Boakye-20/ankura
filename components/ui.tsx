"use client";
// Small shared pieces. All complaint and draft text is rendered as React text, never as HTML (slopsec rule 3).
import { createContext, useContext, useState, type ReactNode } from "react";
import { clauseName, type Tone } from "@/lib/case-helpers";
import type { RegulatorySource } from "@/lib/regulation";
import type { ClauseInfo } from "@/lib/stored-types";

export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/** A white card with a grey header bar. `flush` drops the body padding, for a table that runs edge to edge. */
export function Box({ title, label, tone, flush, children }: { title: string; label?: ReactNode; tone?: "blocked"; flush?: boolean; children: ReactNode }) {
  return (
    <section className={`box ${tone ?? ""}`}>
      <div className="bh"><h3>{title}</h3>{typeof label === "string" ? <span className="label">{label}</span> : label}</div>
      <div className={`bb ${flush ? "flush" : ""}`}>{children}</div>
    </section>
  );
}

const BAND_ICONS = {
  cases: "M4 6h16v12H4zM4 7l8 6 8-6",
  shield: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5",
};

/** The white title band under the top bar: round icon, page title, optional crumb, notice, actions and tabs. */
export function PageBand({ icon, title, crumb, sub, end, children, tabs }: {
  icon: keyof typeof BAND_ICONS; title: ReactNode; crumb?: ReactNode; sub?: ReactNode; end?: ReactNode; children?: ReactNode; tabs?: ReactNode;
}) {
  return (
    <div className="band">
      <div className="band-in">
        <span className={`band-icon ${crumb ? "big" : ""}`} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d={BAND_ICONS[icon]} /></svg>
        </span>
        <div className="band-title">
          {crumb && <div className="crumb">{crumb}</div>}
          <h1>{title}</h1>
          {sub && <div className="band-sub">{sub}</div>}
        </div>
        {children}
        <span className="grow" />
        {end}
      </div>
      {tabs && <div className="band-tabs">{tabs}</div>}
    </div>
  );
}

/** One number with a label. A button when it applies a filter; `active` shows it is applied. */
export function StatTile({ label, value, sub, tone = "", active, onClick }: { label: string; value: ReactNode; sub?: string; tone?: Tone; active?: boolean; onClick?: () => void }) {
  const body = <><b className={`stat-value ${tone}`}>{value}</b><span className="stat-label">{label}</span>{sub && <span className="stat-sub">{sub}</span>}</>;
  return onClick
    ? <button type="button" className="stat" aria-pressed={active} onClick={onClick}>{body}</button>
    : <div className="stat">{body}</div>;
}

/** The policy library, so any text on screen can turn a clause ID into its readable name. Set once in Workbench. */
const ClausesContext = createContext<Record<string, ClauseInfo>>({});
export const ClausesProvider = ClausesContext.Provider;

const TOKEN = /^\[[A-Z]+_\d+\]$/;
const CLAUSE = /^(?:POL-\d{2}|DISP-G) §\d+\.\d+$/;
const SPLIT = /(\[[A-Z]+_\d+\]|\b(?:POL-\d{2}|DISP-G) §\d+\.\d+)/;
const tokenText = (token: string) => {
  const [kind, n] = token.slice(1, -1).split("_");
  return `${kind[0]}${kind.slice(1).toLowerCase()} ${n}`;
};

/**
 * Stored text (complaint, notes, AI summary, check details) as a person should read it: personal-data tokens such as
 * [CUSTOMER_1] become "Customer 1" chips, and policy IDs typed into the text become readable, clickable references.
 */
export function MaskedText({ text }: { text: string }) {
  const clauses = useContext(ClausesContext);
  return (
    <>
      {text.split(SPLIT).map((part, i) =>
        TOKEN.test(part) ? <span key={i} className="m" title={`Personal data masked before AI processing (${part})`}>{tokenText(part)}</span>
          : CLAUSE.test(part) && clauses[part] ? <CitationChip key={i} id={part} clauses={clauses} />
          : part)}
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

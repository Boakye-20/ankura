"use client";
import { useMemo, useState, type KeyboardEvent } from "react";
import { caseState, type Role, type Session, type useSession } from "@/lib/audit";
import { deadlineShare, deadlineTone, flags, statusTone } from "@/lib/case-helpers";
import { fmtDate } from "@/lib/format";
import { isLetterDue } from "@/lib/letter";
import type { CaseView, WorkbenchData } from "@/lib/stored-types";
import { CaseDetail } from "./CaseDetail";
import { Pill } from "./ui";

type Props = {
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  selected: string | null;
  onSelect: (ref: string) => void;
  onEscalated: (ref: string) => void;
};

type SortKey = "risk" | "ref" | "received" | "status";

export function QueueView({ data, role, session, act, selected, onSelect, onEscalated }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "risk", desc: true });

  const rows = useMemo(() => {
    const value = (c: CaseView): string | number => {
      if (sort.key === "risk") return deadlineShare(c.result?.deadline ?? null);
      if (sort.key === "status") return caseState(session, c.ref).status;
      return c[sort.key];
    };
    return [...data.cases].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      const order = x < y ? -1 : x > y ? 1 : 0;
      return sort.desc ? -order : order;
    });
  }, [data.cases, sort, session]);

  const header = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key === "risk" }))}>
        {label}{sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, ref: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(ref); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const sibling = e.key === "ArrowDown" ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
      (sibling as HTMLElement | null)?.focus();
    }
  };

  const current = data.cases.find((c) => c.ref === selected) ?? null;
  const open = data.cases.filter((c) => !["Approved", "Co-approved", "Accepted by specialist"].includes(caseState(session, c.ref).status)).length;

  return (
    <>
      <div className="panel">
        {!data.run && (
          <p className="banner">AI outputs have not been generated yet. Run <code>npm run precompute</code> with an API key, then rebuild. Masked complaints are shown below.</p>
        )}
        <div className="ptitle">Open cases · {open} of {data.cases.length} · default order: least time remaining as a share of the deadline</div>
        <div className="tw">
          <table className="qt">
            <caption className="sr-only">Work queue. Select a row to open the case below.</caption>
            <thead>
              <tr>
                {header("ref", "Reference")}{header("received", "Received")}<th>Product</th><th>Issue</th><th>Flags</th>
                {header("risk", "Regulatory deadline")}<th>Route</th>{header("status", "Status")}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const d = c.result?.deadline ?? null;
                const status = caseState(session, c.ref).status;
                return (
                  <tr key={c.ref} tabIndex={0} aria-selected={c.ref === selected} onClick={() => onSelect(c.ref)} onKeyDown={(e) => onRowKey(e, c.ref)}>
                    <td className="ref">{c.ref}</td>
                    <td>{fmtDate(c.received)}</td>
                    <td>{c.product}</td>
                    <td>{c.result?.triage?.category ?? "Not classified"}</td>
                    <td>{isLetterDue(d, status) && !caseState(session, c.ref).letterApproved && <Pill tone="bad">Letter due</Pill>}{flags(c).map(([label, tone]) => <Pill key={label} tone={tone}>{label}</Pill>)}</td>
                    <td>
                      {d ? (
                        <span className="sla">
                          <span className={`bar ${deadlineTone(d)}`} aria-hidden="true"><i style={{ width: `${Math.min(100, deadlineShare(d) * 100)}%` }} /></span>
                          {d.used} / {d.total} {d.unit}{d.used > d.total ? " · overdue" : d.used === d.total ? " · due today" : ""}
                        </span>
                      ) : "Not set"}
                    </td>
                    <td>{c.result?.route ?? "—"}</td>
                    <td><Pill tone={statusTone(status)}>{status}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!current && <p className="note">Select a case to open it. Suggested start: <button type="button" className="cite" onClick={() => onSelect("CMP-2026-105103")}>CMP-2026-105103</button> (an instruction hidden in the complaint).</p>}
      </div>
      {current && <CaseDetail key={current.ref} c={current} data={data} role={role} session={session} act={act} onEscalated={onEscalated} />}
    </>
  );
}

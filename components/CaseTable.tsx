"use client";
import type { ReactNode } from "react";
import { deadlineTone, dueText, statusTone, type CaseRow, type CaseSortKey } from "@/lib/case-helpers";
import { fmtDate } from "@/lib/format";
import { Pill } from "./ui";

type Props = {
  rows: CaseRow[]; // already filtered and sorted
  sortKey: CaseSortKey;
  dir: "asc" | "desc";
  onSort: (key: CaseSortKey) => void;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onOpen: (ref: string) => void;
  toolbar: ReactNode;
  caption?: string;
};

const COLUMNS: { key: CaseSortKey | null; label: string }[] = [
  { key: "ref", label: "Case" },
  { key: "category", label: "Complaint about" },
  { key: "route", label: "Team" },
  { key: "status", label: "Where it is" },
  { key: "deadline", label: "Time left" },
  { key: null, label: "Due" },
  { key: null, label: "Flags" },
];

export function CaseTable({ rows, sortKey, dir, onSort, page, pageSize, onPage, onOpen, toolbar, caption }: Props) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const shown = rows.slice(start, start + pageSize);

  return (
    <div className="card">
      <div className="listbar">
        {toolbar}
        <span className="grow" />
        <span className="count" aria-live="polite">
          {rows.length ? `(${start + 1} – ${Math.min(start + pageSize, rows.length)} of ${rows.length})` : "(0 cases)"}{caption && <> · {caption}</>}
        </span>
        <button type="button" className="btn small" aria-label="Previous page" disabled={current === 1} onClick={() => onPage(current - 1)}>‹</button>
        <button type="button" className="btn small" aria-label="Next page" disabled={current === pages} onClick={() => onPage(current + 1)}>›</button>
      </div>
      <div className="tw">
      <table className="dt cases">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label} scope="col" aria-sort={col.key && sortKey === col.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                {col.key ? (
                  <button type="button" className="sort" onClick={() => onSort(col.key!)}>
                    {col.label}{sortKey === col.key && <span aria-hidden="true">{dir === "asc" ? " ↑" : " ↓"}</span>}
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const tone = deadlineTone(r.deadline);
            return (
              <tr key={r.ref} className="row" onClick={() => onOpen(r.ref)}>
                <td><button type="button" className="ref" onClick={(e) => { e.stopPropagation(); onOpen(r.ref); }}>{r.ref}</button></td>
                <td>{r.category}</td>
                <td>{r.route}</td>
                <td><Pill tone={statusTone(r.status)}>{r.where}</Pill></td>
                <td className={`time ${tone === "bad" ? "late" : tone === "warn" ? "soon" : ""}`}>{dueText(r.deadline)}</td>
                <td className="num-cell">{r.deadline ? fmtDate(r.deadline.due) : "—"}</td>
                <td><span className="flags">{r.flags.map(([label, t]) => <Pill key={label} tone={t}>{label}</Pill>)}</span></td>
              </tr>
            );
          })}
          {!shown.length && <tr><td colSpan={COLUMNS.length} className="note">No cases match these filters.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}

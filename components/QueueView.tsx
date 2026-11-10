"use client";
import { useMemo, useState } from "react";
import type { Role, Session, useSession } from "@/lib/audit";
import { filterRows, rowStats, sortRows, toRows, type CaseSortKey, type RowFilters } from "@/lib/case-helpers";
import type { WorkbenchData } from "@/lib/stored-types";
import { CaseDetail } from "./CaseDetail";
import { CaseFilters, viewLabel, type ViewKey } from "./CaseFilters";
import { CaseTable } from "./CaseTable";
import { StatTile } from "./ui";

type Props = {
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  selected: string | null;
  onSelect: (ref: string | null) => void;
};

const PAGE_SIZE = 20;
const VIEWS: ViewKey[] = ["mine", "upcoming", "progress", "done", "all"];

/** Four cases that show the main controls. Listed for assessors; a live deployment would not have this strip. */
export const GUIDE: { ref: string; title: string; hint: string }[] = [
  {
    ref: "CMP-2026-104712",
    title: "Cited draft and handover",
    hint: "Hover a policy reference to read the clause. Choose Escalate, deal with the missing items, submit, then switch to Specialist to accept or return the pack.",
  },
  {
    ref: "CMP-2026-101003",
    title: "Vulnerable customer",
    hint: "Approve within 20 seconds to see the over-reliance check. The case then waits for a senior: switch to Senior handler to co-approve.",
  },
  {
    ref: "CMP-2026-105103",
    title: "Instruction aimed at the AI",
    hint: "The complaint tells the AI to approve £5,000. Code withholds the draft, so the handler writes the reply.",
  },
  {
    ref: "CMP-2026-104288",
    title: "Uncited statement blocked",
    hint: "One sentence states a fact without a policy clause, so approval is locked. Choose Edit and re-check to fix it, or try citing [POL-99 §1.1].",
  },
];

export function QueueView({ data, role, session, act, selected, onSelect }: Props) {
  const [filters, setFiltersState] = useState<RowFilters>({ view: "mine" });
  const [sortKey, setSortKey] = useState<CaseSortKey>("deadline");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => toRows(data.cases, session, role), [data.cases, session, role]);
  const stats = useMemo(() => rowStats(rows), [rows]);
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v, filterRows(rows, { view: v }).length])) as Record<ViewKey, number>, [rows]);
  const shown = useMemo(() => sortRows(filterRows(rows, filters), sortKey, dir), [rows, filters, sortKey, dir]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const routes = useMemo(() => [...new Set(rows.map((r) => r.route))].sort(), [rows]);

  const setFilters = (next: RowFilters) => { setFiltersState(next); setPage(1); };
  const onSort = (key: CaseSortKey) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir("asc"); }
    setPage(1);
  };

  const current = selected ? data.cases.find((c) => c.ref === selected) ?? null : null;
  if (current) {
    return <CaseDetail key={current.ref} c={current} data={data} role={role} session={session} act={act} onBack={() => onSelect(null)} />;
  }

  const guided = GUIDE.find((g) => g.ref === selected);
  const third = role === "Handler"
    ? { label: "Approval locked by a check", value: stats.locked, filter: { view: "mine" as const } }
    : { label: viewLabel("upcoming", role), value: stats.upcoming, filter: { view: "upcoming" as const } };
  const is = (f: RowFilters) => Object.entries(f).every(([k, v]) => filters[k as keyof RowFilters] === v) && Object.keys(filters).length === Object.keys(f).length;

  return (
    <div className="page wide">
      <details className="guide" open>
        <summary>Demo guide: four cases that show the controls</summary>
        <div className="guide-body">
          {GUIDE.map((g) => (
            <button key={g.ref} type="button" aria-pressed={selected === g.ref} onClick={() => onSelect(g.ref)}>{g.title}</button>
          ))}
          {guided && <span className="try">{guided.hint}</span>}
        </div>
      </details>

      <div className="stats">
        <StatTile label="Cases" value={stats.total} active={is({ view: "all" })} onClick={() => setFilters({ view: "all" })} />
        <StatTile label={viewLabel("mine", role)} value={stats.mine} tone={stats.mine ? "info" : ""} active={is({ view: "mine" })} onClick={() => setFilters({ view: "mine" })} />
        <StatTile label={third.label} value={third.value} tone={third.value ? "warn" : ""} active={is(third.filter)} onClick={() => setFilters(third.filter)} />
        <StatTile label="Overdue or due today" value={stats.late} tone={stats.late ? "bad" : ""} active={is({ view: "all", deadline: "late" })} onClick={() => setFilters({ view: "all", deadline: "late" })} />
        <StatTile label="Vulnerable customers" value={stats.vulnerable} active={is({ view: "all", vulnerableOnly: true })} onClick={() => setFilters({ view: "all", vulnerableOnly: true })} />
      </div>

      <CaseFilters role={role} filters={filters} counts={counts} categories={categories} routes={routes} onChange={setFilters} />

      <p className="count" aria-live="polite">
        {shown.length} {shown.length === 1 ? "case" : "cases"}{sortKey === "deadline" && dir === "asc" ? ", closest to deadline first" : ""}.
      </p>
      {(filters.view ?? "mine") === "mine" && shown.length === 0 && (
        <p className="banner">
          Nothing is waiting for you as {role === "Senior" ? "senior handler" : role.toLowerCase()}.
          {role !== "Handler" && counts.upcoming > 0 && <> {counts.upcoming} {counts.upcoming === 1 ? "case" : "cases"} will reach you once the handler has acted. </>}
          {role !== "Handler" && counts.upcoming > 0 && <button type="button" className="linkish plain" onClick={() => setFilters({ view: "upcoming" })}>Show {viewLabel("upcoming", role).toLowerCase()}</button>}
        </p>
      )}

      <CaseTable rows={shown} sortKey={sortKey} dir={dir} onSort={onSort} page={page} pageSize={PAGE_SIZE} onPage={setPage} onOpen={onSelect} />
    </div>
  );
}

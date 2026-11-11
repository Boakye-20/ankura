"use client";
import { useMemo, useState } from "react";
import type { Role, Session, useSession } from "@/lib/audit";
import { filterRows, rowStats, sortRows, toRows, type CaseSortKey, type RowFilters } from "@/lib/case-helpers";
import type { WorkbenchData } from "@/lib/stored-types";
import { CaseDetail } from "./CaseDetail";
import { CaseFilters, viewLabel, type ViewKey } from "./CaseFilters";
import { CaseTable } from "./CaseTable";
import { GUIDE_GROUPS, guideFor } from "./guide";
import { PageBand, StatTile } from "./ui";

type Props = {
  data: WorkbenchData;
  role: Role;
  session: Session;
  act: ReturnType<typeof useSession>["act"];
  selected: string | null;
  onSelect: (ref: string | null) => void;
  notice: string;
};

const PAGE_SIZE = 20;
const VIEWS: ViewKey[] = ["mine", "upcoming", "progress", "done", "all"];

export function QueueView({ data, role, session, act, selected, onSelect, notice }: Props) {
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
    return <CaseDetail key={current.ref} c={current} data={data} role={role} session={session} act={act} onBack={() => onSelect(null)} guide={guideFor(current.ref)} />;
  }

  const third = role === "Handler"
    ? { label: "Approval locked by a check", value: stats.locked, filter: { view: "mine" as const } }
    : { label: viewLabel("upcoming", role), value: stats.upcoming, filter: { view: "upcoming" as const } };
  const is = (f: RowFilters) => Object.entries(f).every(([k, v]) => filters[k as keyof RowFilters] === v) && Object.keys(filters).length === Object.keys(f).length;

  return (
    <>
    <PageBand icon="cases" title="Cases" end={<>
      <span className="band-note">{notice}</span>
      <details className="guide">
        <summary className="btn outline">Demo guide ▾</summary>
        <div className="menu wide">
          {GUIDE_GROUPS.map((g) => (
            <div key={g.name} className="guide-group">
              <span className="menu-label">{g.name}</span>
              {g.cases.map((k) => (
                <button key={k.ref + k.title} type="button" className="guide-item" onClick={() => onSelect(k.ref)}>
                  <b>{k.title}</b><span className="ref-text">{k.ref}</span>
                </button>
              ))}
            </div>
          ))}
          <a className="guide-all" href="#about">Full test guide on the About page</a>
        </div>
      </details>
    </>} />
    <div className="page wide">
      <div className="stats">
        <StatTile label="Cases" value={stats.total} active={is({ view: "all" })} onClick={() => setFilters({ view: "all" })} />
        <StatTile label={viewLabel("mine", role)} value={stats.mine} tone={stats.mine ? "info" : ""} active={is({ view: "mine" })} onClick={() => setFilters({ view: "mine" })} />
        <StatTile label={third.label} value={third.value} tone={third.value ? "warn" : ""} active={is(third.filter)} onClick={() => setFilters(third.filter)} />
        <StatTile label="Overdue or due today" value={stats.late} tone={stats.late ? "bad" : ""} active={is({ view: "all", deadline: "late" })} onClick={() => setFilters({ view: "all", deadline: "late" })} />
        <StatTile label="Vulnerable customers" value={stats.vulnerable} active={is({ view: "all", vulnerableOnly: true })} onClick={() => setFilters({ view: "all", vulnerableOnly: true })} />
      </div>

      {(filters.view ?? "mine") === "mine" && shown.length === 0 && (
        <p className="banner">
          Nothing is waiting for you as {role === "Senior" ? "senior handler" : role.toLowerCase()}.
          {role !== "Handler" && counts.upcoming > 0 && <> {counts.upcoming} {counts.upcoming === 1 ? "case" : "cases"} will reach you once the handler has acted. </>}
          {role !== "Handler" && counts.upcoming > 0 && <button type="button" className="linkish plain" onClick={() => setFilters({ view: "upcoming" })}>Show {viewLabel("upcoming", role).toLowerCase()}</button>}
        </p>
      )}

      <CaseTable rows={shown} sortKey={sortKey} dir={dir} onSort={onSort} page={page} pageSize={PAGE_SIZE} onPage={setPage} onOpen={onSelect}
        toolbar={<CaseFilters role={role} filters={filters} counts={counts} categories={categories} routes={routes} onChange={setFilters} />}
        caption={sortKey === "deadline" && dir === "asc" ? "Closest to deadline first" : undefined} />
    </div>
    </>
  );
}

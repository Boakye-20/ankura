"use client";
import type { Role } from "@/lib/audit";
import type { QueueBucket, RowFilters } from "@/lib/case-helpers";

export type ViewKey = QueueBucket | "all";

export function viewLabel(view: ViewKey, role: Role): string {
  switch (view) {
    case "mine": return "For me";
    case "upcoming": return role === "Specialist" ? "Coming to my team" : "Coming to me";
    case "progress": return "With others";
    case "done": return "Done";
    case "all": return "All";
  }
}

type Props = {
  role: Role;
  filters: RowFilters;
  counts: Record<ViewKey, number>;
  categories: string[];
  routes: string[];
  onChange: (next: RowFilters) => void;
};

const DEADLINES: [NonNullable<RowFilters["deadline"]>, string][] = [
  ["any", "Any deadline"], ["overdue", "Overdue"], ["today", "Due today"], ["late", "Overdue or due today"], ["week", "Due within 5 days"],
];

export function CaseFilters({ role, filters, counts, categories, routes, onChange }: Props) {
  const views: ViewKey[] = role === "Handler" ? ["mine", "progress", "done", "all"] : ["mine", "upcoming", "progress", "done", "all"];
  const active = Boolean(filters.category || filters.route || (filters.deadline && filters.deadline !== "any") || filters.vulnerableOnly);
  const set = (patch: RowFilters) => onChange({ ...filters, ...patch });
  return (
    <div className="filterbar">
      <div className="filters" role="group" aria-label="Whose action the case is waiting for">
        {views.map((v) => (
          <button key={v} type="button" aria-pressed={(filters.view ?? "mine") === v} onClick={() => set({ view: v })}>
            {viewLabel(v, role)}<span className="n">{counts[v]}</span>
          </button>
        ))}
      </div>
      <div className="selects">
        <label><span className="sr-only">Complaint type</span>
          <select value={filters.category ?? ""} onChange={(e) => set({ category: e.target.value || undefined })}>
            <option value="">All complaint types</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Team</span>
          <select value={filters.route ?? ""} onChange={(e) => set({ route: e.target.value || undefined })}>
            <option value="">All teams</option>
            {routes.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Deadline</span>
          <select value={filters.deadline ?? "any"} onChange={(e) => set({ deadline: e.target.value as RowFilters["deadline"] })}>
            {DEADLINES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={Boolean(filters.vulnerableOnly)} onChange={(e) => set({ vulnerableOnly: e.target.checked || undefined })} /> Vulnerable customers only</label>
        {active && <button type="button" className="linkish plain" onClick={() => onChange({ view: filters.view })}>Clear filters</button>}
      </div>
    </div>
  );
}

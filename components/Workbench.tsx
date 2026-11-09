"use client";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { STAFF, useSession, type Role } from "@/lib/audit";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { AboutView } from "./AboutView";
import { AssuranceView } from "./AssuranceView";
import { AuditView } from "./AuditView";
import { HandoversView } from "./HandoversView";
import { QueueView } from "./QueueView";

const TABS = [
  ["queue", "My work queue", "Complaints"],
  ["handovers", "Specialist handovers", "Complaints"],
  ["assurance", "Model assurance", "Governance"],
  ["audit", "Audit trail", "Governance"],
  ["about", "About this prototype", "Help"],
] as const;
export type Tab = (typeof TABS)[number][0];

export function Workbench({ data }: { data: WorkbenchData }) {
  const [tab, setTab] = useState<Tab>("queue");
  const [role, setRole] = useState<Role>("Handler");
  const [selected, setSelected] = useState<string | null>(null);
  const [handoverRef, setHandoverRef] = useState<string | null>(null);
  const { session, act, reset } = useSession();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const staff = STAFF[role];
  const current = TABS.find((t) => t[0] === tab)!;

  const openCase = (ref: string) => { setSelected(ref); setTab("queue"); };
  const openHandover = (ref: string) => { setHandoverRef(ref); setTab("handovers"); };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[next]?.focus();
  };

  const crumbRef = tab === "queue" ? selected : tab === "handovers" ? handoverRef : null;
  const seeded = useMemo(() => data.cases.flatMap((c) => c.result?.audit ?? []), [data.cases]);

  return (
    <div className="app">
      <div className="env">TEST ENVIRONMENT · SYNTHETIC DATA ONLY · NOT FOR CUSTOMER USE</div>
      <header className="gbar">
        <div className="logo">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="1.5" /><path d="M6 16V6l5 6 5-6v10" stroke="#ffffff" strokeWidth="1.8" fill="none" /></svg>
          <span className="bank">MEADOWLANE BANK</span>
          <span className="prod">Complaints Workbench</span>
        </div>
        <div className="user">
          <span>{staff.name} · {staff.title} · {staff.team}</span>
          <label className="sr-only" htmlFor="role">Role (simulated)</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} title="Roles are simulated; there is no sign-in">
            <option value="Handler">Role: Handler</option>
            <option value="Senior">Role: Senior</option>
            <option value="Specialist">Role: Specialist</option>
          </select>
          <span className="av" aria-hidden="true">{staff.initials}</span>
        </div>
      </header>
      <nav className="nav" role="tablist" aria-label="Workbench sections">
        {TABS.map(([id, label], i) => (
          <button key={id} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`tab-${id}`} aria-selected={tab === id}
            aria-controls="view" tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(e) => onTabKey(e, i)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="crumbs" aria-label="Breadcrumbs">
        <span>{current[2]}</span><span aria-hidden="true">›</span><span>{current[1]}</span>
        {crumbRef && <><span aria-hidden="true">›</span><span className="mono">{crumbRef}</span></>}
      </div>
      <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "queue" && <QueueView data={data} role={role} session={session} act={act} selected={selected} onSelect={setSelected} onEscalated={openHandover} />}
        {tab === "handovers" && <HandoversView data={data} role={role} session={session} act={act} selected={handoverRef} onSelect={setHandoverRef} onOpenCase={openCase} />}
        {tab === "assurance" && <AssuranceView results={data.evalResults} session={session} />}
        {tab === "audit" && <AuditView seeded={seeded} session={session} onReset={reset} />}
        {tab === "about" && <AboutView data={data} onOpenCase={openCase} />}
      </main>
      <footer className="foot">
        <span>Release {data.versions.release}</span>
        <span>Policy library {data.versions.policyVersion}</span>
        <span>Prompt set {data.versions.promptVersion}</span>
        <span>{data.run ? `Stored outputs · model run ${fmtDate(data.run.runDate)}` : "Stored outputs · not yet generated"}</span>
        <span>Session actions kept in this browser only</span>
      </footer>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { STAFF, useSession, type Role } from "@/lib/audit";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { AboutView } from "./AboutView";
import { GovernanceView } from "./GovernanceView";
import { QueueView } from "./QueueView";

const TABS = [
  ["queue", "Cases"],
  ["governance", "Risk, controls and oversight"],
  ["about", "About this prototype"],
] as const;
export type Tab = (typeof TABS)[number][0];

const ROLE_LABEL: Record<Role, string> = { Handler: "Handler", Senior: "Senior handler", Specialist: "Specialist" };

/** Every page and every case has a link: #governance, #about, #case/CMP-2026-104712. */
function fromHash(): { tab: Tab; ref: string | null } {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("case/")) return { tab: "queue", ref: hash.slice(5) };
  return { tab: TABS.find(([id]) => id === hash)?.[0] ?? "queue", ref: null };
}

export function Workbench({ data }: { data: WorkbenchData }) {
  const [tab, setTabState] = useState<Tab>("queue");
  const [role, setRole] = useState<Role>("Handler");
  const [selected, setSelectedState] = useState<string | null>(null);
  const { session, act, reset } = useSession();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const apply = () => { const h = fromHash(); setTabState(h.tab); setSelectedState(h.ref); };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  const setHash = (hash: string) => window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
  const setTab = (id: Tab) => { setTabState(id); setSelectedState(null); setHash(id === "queue" ? "" : id); };
  const setSelected = (ref: string | null) => { setSelectedState(ref); setHash(ref ? `case/${ref}` : ""); };
  const openCase = (ref: string) => { setTabState("queue"); setSelected(ref); };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[next]?.focus();
  };

  const seeded = useMemo(() => data.cases.flatMap((c) => c.result?.audit ?? []), [data.cases]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M2 18c3-6 6-9 9-9s6 3 9 9" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M2 13c3-4 6-6 9-6s6 2 9 6" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".6" />
          </svg>
          <b>Meadowlane Bank</b>
          <span>Complaints workbench</span>
        </div>

        <nav className="tabs" role="tablist" aria-label="Main navigation">
          {TABS.map(([id, label], i) => (
            <button
              key={id}
              ref={(el) => { tabRefs.current[i] = el; }}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls="view"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="roles">
          <span id="roles-label">Viewing as</span>
          <div className="seg" role="group" aria-labelledby="roles-label">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>{ROLE_LABEL[r]}</button>
            ))}
          </div>
          <span className="who" title="Simulated sign-in: roles are held in this browser only">{STAFF[role].name}</span>
        </div>
      </header>

      <div className="strip">
        <span className="live"><span className="dot" aria-hidden="true" />{data.run ? "Stored AI outputs" : "AI outputs not yet generated"}</span>
        {data.run && <span>Model run {fmtDate(data.run.runDate)}</span>}
        {data.run?.checksRerun && <span>Checks re-run by code {fmtDate(data.run.checksRerun)}</span>}
        <span>{data.cases.length} synthetic complaints</span>
        <span>Policy library {data.versions.policyVersion}</span>
        <span>Prompt set {data.versions.promptVersion}</span>
        <span className="end">Prototype {data.versions.release.replace(" (prototype)", "")}. Nothing is sent to customers.</span>
      </div>

      <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "queue" && <QueueView data={data} role={role} session={session} act={act} selected={selected} onSelect={setSelected} />}
        {tab === "governance" && <GovernanceView data={data} seeded={seeded} session={session} onReset={reset} />}
        {tab === "about" && <AboutView data={data} onOpenCase={openCase} />}
      </main>
    </div>
  );
}

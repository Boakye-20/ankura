"use client";
// Shell after PK's SuiteCRM-style mock-ups ("use style/"): a purple top bar with the main tabs and a user menu that
// holds the simulated role switch. Each view draws its own white title band (PageBand in ui.tsx).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { STAFF, useSession, type Role } from "@/lib/audit";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { AboutView } from "./AboutView";
import { GovernanceView } from "./GovernanceView";
import { QueueView } from "./QueueView";
import { ClausesProvider } from "./ui";

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
  const staff = STAFF[role];
  const initials = staff.name.split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const notice = `${data.run ? `Stored AI outputs from a model run on ${fmtDate(data.run.runDate)}` : "AI outputs not yet generated"} · Synthetic data · Nothing is sent to customers`;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 10l9-6 9 6v10H3z" /></svg>
          Meadowlane
        </span>
        <nav className="nav" role="tablist" aria-label="Main navigation">
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
        <details className="usermenu">
          <summary title="Simulated sign-in: roles are held in this browser only">
            <span className="avatar" aria-hidden="true">{initials}</span>{staff.name} · {ROLE_LABEL[role]} ▾
          </summary>
          <div className="menu">
            <span className="menu-label" id="roles-label">Viewing as</span>
            <div className="seg" role="group" aria-labelledby="roles-label">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
                  <b>{ROLE_LABEL[r]}</b><span>{STAFF[r].name} · {STAFF[r].title}</span>
                </button>
              ))}
            </div>
            <div className="menu-meta">
              {data.run && <span>Model run {fmtDate(data.run.runDate)}</span>}
              {data.run?.checksRerun && <span>Checks re-run by code {fmtDate(data.run.checksRerun)}</span>}
              <span>{data.cases.length} synthetic complaints</span>
              <span>Policy library {data.versions.policyVersion} · prompt set {data.versions.promptVersion}</span>
              <span>Prototype {data.versions.release.replace(" (prototype)", "")}</span>
            </div>
          </div>
        </details>
      </header>

      <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <ClausesProvider value={data.clauses}>
          {tab === "queue" && <QueueView data={data} role={role} session={session} act={act} selected={selected} onSelect={setSelected} notice={notice} />}
          {tab === "governance" && <GovernanceView data={data} seeded={seeded} session={session} onReset={reset} />}
          {tab === "about" && <AboutView data={data} onOpenCase={openCase} />}
        </ClausesProvider>
      </main>
    </div>
  );
}

"use client";
// Shell after Twenty (twentyhq/twenty): a navigation drawer on the left, a page card with a header on the right.
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

const Icon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONS: Record<Tab, string> = {
  queue: "M4 6h16M4 12h16M4 18h10",
  governance: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  about: "M12 8h.01M11 12h1v4h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
};
const ROLE_ICON: Record<Role, string> = {
  Handler: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  Senior: "M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z",
  Specialist: "M3 7h18M3 12h18M3 17h18",
};

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
    const next = e.key === "ArrowDown" ? (i + 1) % TABS.length : e.key === "ArrowUp" ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[next]?.focus();
  };

  const seeded = useMemo(() => data.cases.flatMap((c) => c.result?.audit ?? []), [data.cases]);
  const title = TABS.find(([id]) => id === tab)![1];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect width="22" height="22" rx="5" fill="currentColor" />
            <path d="M4 16c2.5-5 4.5-7 7-7s4.5 2 7 7" stroke="#fff" strokeWidth="1.8" fill="none" />
          </svg>
          <div><b>Meadowlane Bank</b><span>Complaints workbench</span></div>
        </div>

        <nav className="tabs" role="tablist" aria-orientation="vertical" aria-label="Main navigation">
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
              <Icon d={ICONS[id]} />{label}
            </button>
          ))}
        </nav>

        <div className="roles">
          <span className="group" id="roles-label">Viewing as</span>
          <div className="seg" role="group" aria-labelledby="roles-label">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}><Icon d={ROLE_ICON[r]} />{ROLE_LABEL[r]}</button>
            ))}
          </div>
          <span className="who" title="Simulated sign-in: roles are held in this browser only">{STAFF[role].name} · {STAFF[role].title}</span>
        </div>

        <div className="meta">
          <span className="live"><span className="dot" aria-hidden="true">●</span>{data.run ? "Stored AI outputs" : "AI outputs not yet generated"}</span>
          {data.run && <span>Model run {fmtDate(data.run.runDate)}</span>}
          {data.run?.checksRerun && <span>Checks re-run by code {fmtDate(data.run.checksRerun)}</span>}
          <span>{data.cases.length} synthetic complaints</span>
          <span>Policy library {data.versions.policyVersion} · prompt set {data.versions.promptVersion}</span>
        </div>
      </aside>

      <div className="card-page">
        <header className="phead">
          <h1>{title}{selected && tab === "queue" && <span className="crumb"> / {selected}</span>}</h1>
          <span className="end">Prototype {data.versions.release.replace(" (prototype)", "")}. Synthetic data. Nothing is sent to customers.</span>
        </header>
        <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <ClausesProvider value={data.clauses}>
            {tab === "queue" && <QueueView data={data} role={role} session={session} act={act} selected={selected} onSelect={setSelected} />}
            {tab === "governance" && <GovernanceView data={data} seeded={seeded} session={session} onReset={reset} />}
            {tab === "about" && <AboutView data={data} onOpenCase={openCase} />}
          </ClausesProvider>
        </main>
      </div>
    </div>
  );
}

"use client";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { STAFF, useSession, type Role } from "@/lib/audit";
import { fmtDate } from "@/lib/format";
import type { WorkbenchData } from "@/lib/stored-types";
import { AboutView } from "./AboutView";
import { AssuranceView } from "./AssuranceView";
import { AuditView } from "./AuditView";
import { QueueView } from "./QueueView";

const TABS = [
  ["queue", "Case Workbench"],
  ["governance", "Governance & Assurance"],
  ["about", "Brief & Approach"],
] as const;
export type Tab = (typeof TABS)[number][0];

export function Workbench({ data }: { data: WorkbenchData }) {
  const [tab, setTab] = useState<Tab>("queue");
  const [role, setRole] = useState<Role>("Handler");
  const [selected, setSelected] = useState<string | null>("CMP-2026-105103");
  const { session, act, reset } = useSession();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const staff = STAFF[role];

  const openCase = (ref: string) => {
    setSelected(ref);
    setTab("queue");
  };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    const next = fwd ? (i + 1) % TABS.length : back ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[next]?.focus();
  };

  const seeded = useMemo(() => data.cases.flatMap((c) => c.result?.audit ?? []), [data.cases]);

  return (
    <div className="app">
      <header className="top-nav">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M2 18c3-6 6-9 9-9s6 3 9 9" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M2 13c3-4 6-6 9-6s6 2 9 6" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".65" />
          </svg>
          <div>
            <span className="bank">Meadowlane Bank</span>
            <span className="prod">Complaints AI Workbench · Synthetic Prototype</span>
          </div>
        </div>

        <nav className="top-tabs" role="tablist" aria-label="Main navigation">
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

        <div className="role-switcher" aria-label="Simulated staff role">
          <span className="rs-label">Viewing as:</span>
          <div className="rs-pills" role="group" aria-label="Select simulated role">
            {(["Handler", "Senior", "Specialist"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                title={`Switch to ${STAFF[r].name} (${STAFF[r].title})`}
              >
                {r === "Senior" ? "Senior Handler" : r}
              </button>
            ))}
          </div>
          <span className="rs-who" title="Simulated user in browser storage">{staff.name}</span>
        </div>
      </header>

      <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "queue" && (
          <QueueView
            data={data}
            role={role}
            session={session}
            act={act}
            selected={selected}
            onSelect={setSelected}
          />
        )}
        {tab === "governance" && (
          <div className="gov-page">
            <div className="gov-intro">
              <div>
                <h2>Governance, Model Assurance &amp; Audit Trail</h2>
                <p className="note">
                  Measured performance across 60 synthetic complaints, live session adoption telemetry, and the full immutable audit log of AI steps and human decisions.
                </p>
              </div>
            </div>
            <AuditView seeded={seeded} session={session} onReset={reset} />
            <AssuranceView results={data.evalResults} session={session} />
          </div>
        )}
        {tab === "about" && <AboutView data={data} onOpenCase={openCase} />}
      </main>

      <footer className="foot">
        <span>Synthetic data only · Not for customer use</span>
        <span>Release {data.versions.release}</span>
        <span>Policy library {data.versions.policyVersion}</span>
        <span>Prompt set {data.versions.promptVersion}</span>
        <span>{data.run ? `Precomputed AI run: ${fmtDate(data.run.runDate)}` : "AI outputs not generated"}</span>
      </footer>
    </div>
  );
}

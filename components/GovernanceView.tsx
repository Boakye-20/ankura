"use client";
import { useState } from "react";
import type { Session } from "@/lib/audit";
import type { WorkbenchData } from "@/lib/stored-types";
import type { AuditEvent } from "@/lib/types";
import { Adoption, AssuranceView } from "./AssuranceView";
import { AuditView } from "./AuditView";
import { ControlsView } from "./ControlsView";

const SECTIONS = [
  ["controls", "Controls and oversight"],
  ["results", "Results"],
  ["adoption", "Adoption"],
  ["audit", "Audit trail"],
] as const;
type Section = (typeof SECTIONS)[number][0];

type Props = { data: WorkbenchData; seeded: AuditEvent[]; session: Session; onReset: () => void };

export function GovernanceView({ data, seeded, session, onReset }: Props) {
  const [section, setSection] = useState<Section>("controls");
  return (
    <div className="page">
      <div className="page-head">
        <h2>Risk, controls and oversight</h2>
        <p className="lead">What the AI is allowed to do, who checks it, how well it did against people's judgement, and the record of every step.</p>
      </div>
      <div className="subtabs" role="tablist" aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      {section === "controls" && <ControlsView data={data} eventCount={seeded.length + session.events.length} />}
      {section === "results" && <AssuranceView results={data.evalResults} checksRerun={data.run?.checksRerun ?? null} />}
      {section === "adoption" && <Adoption session={session} />}
      {section === "audit" && <AuditView seeded={seeded} session={session} onReset={onReset} clauses={data.clauses} />}
    </div>
  );
}

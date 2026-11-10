"use client";
import { useState } from "react";
import type { Session } from "@/lib/audit";
import type { WorkbenchData } from "@/lib/stored-types";
import type { AuditEvent } from "@/lib/types";
import { Adoption, AssuranceView } from "./AssuranceView";
import { AuditView } from "./AuditView";

const SECTIONS = [
  ["assurance", "Model assurance"],
  ["adoption", "Adoption"],
  ["audit", "Audit trail"],
] as const;
type Section = (typeof SECTIONS)[number][0];

type Props = { data: WorkbenchData; seeded: AuditEvent[]; session: Session; onReset: () => void };

export function GovernanceView({ data, seeded, session, onReset }: Props) {
  const [section, setSection] = useState<Section>("assurance");
  return (
    <div className="page">
      <div className="page-head">
        <h2>Governance and assurance</h2>
        <p className="lead">How the AI performed against human labels, how staff are using it, and the record of every AI step and human decision.</p>
      </div>
      <div className="subtabs" role="tablist" aria-label="Governance sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      {section === "assurance" && <AssuranceView results={data.evalResults} checksRerun={data.run?.checksRerun ?? null} />}
      {section === "adoption" && <Adoption session={session} />}
      {section === "audit" && <AuditView seeded={seeded} session={session} onReset={onReset} />}
    </div>
  );
}

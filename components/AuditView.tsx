"use client";
import { useMemo, useState } from "react";
import type { Session } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import { Box } from "./ui";

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function AuditView({ seeded, session, onReset }: { seeded: AuditEvent[]; session: Session; onReset: () => void }) {
  const [onlyMine, setOnlyMine] = useState(false);

  const allEvents = useMemo(
    () => [...seeded, ...session.events].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)),
    [seeded, session.events]
  );
  const events = onlyMine ? session.events.slice().reverse() : allEvents;

  const exportCsv = () => {
    const rows = [["Timestamp", "Case", "Actor", "Event", "Detail"], ...events.map((e) => [e.ts, e.ref, e.actor, e.event, e.detail])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meadowlane-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel">
      <Box
        title={`Audit Trail (${events.length} events)`}
        label={
          <div className="btnrow">
            <button type="button" className="btn small" aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
              {onlyMine ? "Showing your session actions" : `Filter to my actions (${session.events.length})`}
            </button>
            <button type="button" className="btn small" onClick={exportCsv}>Export CSV</button>
            <button type="button" className="btn small" onClick={onReset} disabled={!session.events.length}>
              Reset session ({session.events.length})
            </button>
          </div>
        }
      >
        <div className="tw" style={{ maxHeight: 340, overflowY: "auto" }}>
          <table className="dt">
            <thead>
              <tr><th>Timestamp</th><th>Case</th><th>Actor</th><th>Event</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {events.slice(0, 150).map((e, i) => (
                <tr key={i}>
                  <td className="mono">{fmtDateTime(e.ts)}</td>
                  <td className="mono">{e.ref}</td>
                  <td>{e.actor}</td>
                  <td><b>{e.event}</b></td>
                  <td>{e.detail}</td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={5} className="note">No events match this filter yet. Take an action on any case in the Case Workbench to see it logged here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="note">
          Every AI pipeline step (masking, triage, policy retrieval, drafting, guardrail verification) and every human decision (with actor and mandatory reason code, POL-08 §3.2) is logged.
        </p>
      </Box>
    </div>
  );
}

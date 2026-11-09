"use client";
import { useMemo } from "react";
import type { Session } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function AuditView({ seeded, session, onReset }: { seeded: AuditEvent[]; session: Session; onReset: () => void }) {
  const events = useMemo(() => [...seeded, ...session.events].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)), [seeded, session.events]);

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
      <div className="btnrow">
        <span className="ptitle" style={{ marginRight: "auto" }}>Event log · {events.length} events · newest first</span>
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn" onClick={onReset} disabled={!session.events.length} title="Clears your session actions; the stored AI events remain">Clear my session</button>
      </div>
      <div className="tw">
        <table className="dt">
          <thead><tr><th>Timestamp</th><th>Case</th><th>Actor</th><th>Event</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}><td className="mono">{fmtDateTime(e.ts)}</td><td className="mono">{e.ref}</td><td>{e.actor}</td><td>{e.event}</td><td>{e.detail}</td></tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="note">No events yet. AI events appear after <code>npm run precompute</code>; your actions appear as you take them.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="note">AI events come from the stored model run and record the model, prompt version, clauses retrieved and checks run. Staff events record who acted, what changed and the reason given (POL-08 §3.2). In this prototype staff events live in your browser only; a pilot needs an append-only server-side log.</p>
    </div>
  );
}

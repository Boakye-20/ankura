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
        title={`${events.length} events`}
        label={
          <div className="btnrow">
            <button type="button" className="btn small" aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
              Only this session ({session.events.length})
            </button>
            <button type="button" className="btn small" onClick={exportCsv}>Export CSV</button>
            <button type="button" className="btn small" onClick={onReset} disabled={!session.events.length}>
              Reset session
            </button>
          </div>
        }
      >
        <div className="tw scroll">
          <table className="dt">
            <thead>
              <tr><th>Timestamp</th><th>Case</th><th>Actor</th><th>Event</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {events.slice(0, 200).map((e, i) => (
                <tr key={i}>
                  <td className="mono">{fmtDateTime(e.ts)}</td>
                  <td className="mono">{e.ref}</td>
                  <td>{e.actor}</td>
                  <td>{e.event}</td>
                  <td>{e.detail}</td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={5} className="note">Nothing yet. Approve, amend or escalate a case and it will appear here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="note">
          Newest first{events.length > 200 ? ", latest 200 shown; the CSV export has all of them" : ""}. Each AI step (masking, triage, retrieval, drafting, checks, routing) and each human decision is recorded with who did it and why (POL-08 §3.2). In this prototype your own actions are kept in this browser only; a pilot needs an append-only log on the server.
        </p>
      </Box>
    </div>
  );
}

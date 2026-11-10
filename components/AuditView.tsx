"use client";
import { useMemo, useState } from "react";
import type { Session } from "@/lib/audit";
import { describeEvent } from "@/lib/audit-copy";
import { fmtDateTime } from "@/lib/format";
import type { ClauseInfo } from "@/lib/stored-types";
import type { AuditEvent } from "@/lib/types";
import { Box } from "./ui";

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function AuditView({ seeded, session, onReset, clauses }: { seeded: AuditEvent[]; session: Session; onReset: () => void; clauses: Record<string, ClauseInfo> }) {
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
              <tr><th>When</th><th>Case</th><th>What happened</th><th>Who</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {events.slice(0, 200).map((e, i) => {
                const v = describeEvent(e, clauses);
                return (
                  <tr key={i}>
                    <td className="when">{fmtDateTime(e.ts)}</td>
                    <td className="when">{e.ref}</td>
                    <td><b>{v.what}</b></td>
                    <td>{v.who}</td>
                    <td>{v.detail}</td>
                  </tr>
                );
              })}
              {!events.length && (
                <tr>
                  <td colSpan={5} className="note">Nothing yet. Approve, amend or escalate a case and it will appear here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="note">
          Newest first{events.length > 200 ? ", latest 200 shown; the export has all of them" : ""}. Every automatic step and every human decision is recorded with who did it, when and why. The export keeps the exact technical record for auditors. In this prototype your own actions are kept in this browser only; a pilot needs a tamper-proof log on the server.
        </p>
      </Box>
    </div>
  );
}

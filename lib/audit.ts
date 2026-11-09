// Session actions and audit events, held in the browser's localStorage (a simulation: a pilot needs
// real sign-in, server-side authorisation of approvals and an append-only server-side audit log).
"use client";
import { useCallback, useEffect, useState } from "react";
import type { AuditEvent, Check, DraftOutput, DraftPart } from "./types";

export type Role = "Handler" | "Senior" | "Specialist";

export const STAFF: Record<Role, { name: string; title: string; team: string; initials: string; actor: string }> = {
  Handler: { name: "J. Okafor", title: "Complaint Handler", team: "Leeds CRT", initials: "JO", actor: "J. Okafor · handler" },
  Senior: { name: "R. Patel", title: "Senior Complaint Handler", team: "Leeds CRT", initials: "RP", actor: "R. Patel · senior handler" },
  Specialist: { name: "A. Rowe", title: "Specialist", team: "Specialist teams", initials: "AR", actor: "A. Rowe · specialist" },
};

export type CaseStatus =
  | "Open" | "Approved" | "Awaiting senior co-approval" | "Co-approved" | "Returned to handler"
  | "Escalated" | "With specialist" | "Accepted by specialist" | "Returned by specialist";

export type AmendedDraft = { response: DraftPart[]; proposedRedress: DraftOutput["proposedRedress"]; checks: Check[] };

export type CaseState = {
  status: CaseStatus;
  amended?: AmendedDraft;
  unavailable?: Record<string, string>; // missing handover item -> reason it is not available
  letterApproved?: boolean; // eight-week letter or holding response approved (docs/12)
};

export type Session = { cases: Record<string, CaseState>; events: AuditEvent[] };

const KEY = "meadowlane-workbench-session-v1";
const EMPTY: Session = { cases: {}, events: [] };

function read(): Session {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed && parsed.cases && Array.isArray(parsed.events) ? parsed : EMPTY;
  } catch {
    return EMPTY; // private window or blocked storage: the session still works, it just is not kept
  }
}

function write(session: Session) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable: keep the in-memory session */
  }
}

export function useSession() {
  const [session, setSession] = useState<Session>(EMPTY);
  useEffect(() => setSession(read()), []);

  const update = useCallback((fn: (s: Session) => Session) => {
    setSession((current) => {
      const next = fn(current);
      write(next);
      return next;
    });
  }, []);

  /** Record a staff event, optionally changing the case status or state. */
  const act = useCallback((ref: string, actor: string, event: string, detail: string, change?: Partial<CaseState>) => {
    update((s) => ({
      cases: change ? { ...s.cases, [ref]: { ...(s.cases[ref] ?? { status: "Open" }), ...change } } : s.cases,
      events: [...s.events, { ts: new Date().toISOString(), ref, actor, event, detail }],
    }));
  }, [update]);

  const reset = useCallback(() => update(() => EMPTY), [update]);

  return { session, act, reset };
}

export const caseState = (session: Session, ref: string): CaseState => session.cases[ref] ?? { status: "Open" };

/** Adoption measures (Workforce AI Transformation), counted from this session's events. */
export function adoption(events: AuditEvent[]) {
  const count = (name: string, detail?: string) => events.filter((e) => e.event === name && (!detail || e.detail.includes(detail))).length;
  return {
    approvedUnchanged: count("Approved", "draft unchanged"),
    approvedAmended: count("Approved", "draft amended"),
    amended: count("Amended"),
    escalated: count("Escalated"),
    coApproved: count("Co-approved"),
    overReliancePrompts: count("Over-reliance prompt shown"),
    handoverReturns: count("Returned by specialist"),
    handoversAccepted: count("Accepted by specialist"),
  };
}

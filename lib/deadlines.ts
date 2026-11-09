// The DISP clock (docs/04): business days for payment services and summary resolutions, calendar days otherwise.
import type { Deadline } from "./types";

// Fixed so every assessor sees the same queue.
export const DEMO_TODAY = "2026-11-05";

// England and Wales bank holidays, 2026 (gov.uk). Boxing Day falls on a Saturday, so the substitute is Monday 28 December.
export const BANK_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
]);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);

export function isBusinessDay(date: string): boolean {
  const day = parse(date).getUTCDay();
  return day !== 0 && day !== 6 && !BANK_HOLIDAYS_2026.has(date);
}

/** Business days after `from`, up to and including `to`. */
export function businessDaysBetween(from: string, to: string): number {
  let count = 0;
  for (const d = parse(from); iso(d) < to; ) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(iso(d))) count++;
  }
  return count;
}

export function addBusinessDays(from: string, n: number): string {
  const d = parse(from);
  for (let added = 0; added < n; ) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(iso(d))) added++;
  }
  return iso(d);
}

export function calendarDaysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

export function addCalendarDays(from: string, n: number): string {
  const d = parse(from);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/**
 * Summary resolution is the tightest target, so it wins when a case is eligible (DISP-G §2.1).
 * Payment services: 15 business days (DISP-G §2.4). Everything else: 56 calendar days (DISP-G §2.2).
 */
export function deadlineFor(received: string, flags: { paymentServices: boolean; summaryResolutionEligible: boolean }, today = DEMO_TODAY): Deadline {
  if (flags.summaryResolutionEligible) {
    return { basis: "DISP-G §2.1", total: 3, used: businessDaysBetween(received, today), unit: "business days", due: addBusinessDays(received, 3) };
  }
  if (flags.paymentServices) {
    return { basis: "DISP-G §2.4", total: 15, used: businessDaysBetween(received, today), unit: "business days", due: addBusinessDays(received, 15) };
  }
  return { basis: "DISP-G §2.2", total: 56, used: calendarDaysBetween(received, today), unit: "days", due: addCalendarDays(received, 56) };
}

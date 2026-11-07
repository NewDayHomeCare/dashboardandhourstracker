// The calculation engine: every number on every screen comes from here.
// Plain functions, no React, so they are easy to test (see engine.test.ts).
//
// Hours are handled internally as integer hundredths (5.25 h = 525) and money as
// integer cents, so totals never pick up floating-point errors.

import type {
  Approval,
  Claim,
  ClaimLine,
  ClientStatus,
  DeadlineStatus,
  ISODate,
  MonthSummary,
  Visit,
  YearMonth,
} from "./types";
import { settings } from "./settings";
import { addDays, daysBetween, daysInMonth, firstOfMonth, monthOf, today } from "./dates";

export const toHundredths = (hours: number) => Math.round(hours * 100);
export const fromHundredths = (h: number) => h / 100;

/** Cost of a number of hours, rounded to the nearest cent. 5.25 h × $35.03 = $183.91. */
export function costCents(hours: number, rateCents = settings.hourlyRateCents): number {
  return Math.round((toHundredths(hours) * rateCents) / 100);
}

export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

// ---------- Approved hours ----------

/** Approvals sorted so the one that wins on a given day comes last. */
function sortApprovals(approvals: Approval[]): Approval[] {
  return [...approvals].sort(
    (a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) || a.recordedOn.localeCompare(b.recordedOn),
  );
}

/** The approval in force on a day: the latest one whose effectiveFrom is on or before it. */
export function activeApproval(approvals: Approval[], day: ISODate): Approval | undefined {
  let found: Approval | undefined;
  for (const a of sortApprovals(approvals)) {
    if (a.effectiveFrom <= day) found = a;
  }
  return found;
}

/**
 * Approved hours for one client in one month.
 *
 * ASSUMPTION (confirm with Scott): when hours change mid-month, each day gets
 * 1/daysInMonth of whichever monthly amount was in force that day.
 *
 * Banked hours: when an increase is entered late (recordedOn after its effectiveFrom),
 * the extra hours for the days that had already passed are "banked". They are already
 * included in approvedHours; bankedHours shows how much of it came from the backdating.
 */
export function monthlyAllowance(
  approvals: Approval[],
  clientId: string,
  month: YearMonth,
): { approvedHours: number; bankedHours: number } {
  const mine = approvals.filter((a) => a.clientId === clientId);
  const dim = daysInMonth(month);
  let approved = 0;
  let banked = 0;

  for (let i = 0; i < dim; i++) {
    const day = addDays(firstOfMonth(month), i);
    const active = activeApproval(mine, day);
    if (!active) continue;
    approved += (active.monthlyHours * 100) / dim;

    const enteredLate = daysBetween(day, active.recordedOn) > 0;
    if (enteredLate) {
      const previous = activeApproval(
        mine.filter((a) => a.id !== active.id),
        day,
      );
      if (previous && active.monthlyHours > previous.monthlyHours) {
        banked += ((active.monthlyHours - previous.monthlyHours) * 100) / dim;
      }
    }
  }

  return {
    approvedHours: fromHundredths(Math.round(approved)),
    bankedHours: fromHundredths(Math.round(banked)),
  };
}

// ---------- Hours used and left ----------

export function hoursUsed(visits: Visit[], clientId: string, month: YearMonth): number {
  const total = visits
    .filter((v) => v.clientId === clientId && monthOf(v.date) === month)
    .reduce((sum, v) => sum + toHundredths(v.hours), 0);
  return fromHundredths(total);
}

export function statusFor(approvedHours: number, leftHours: number): ClientStatus {
  if (leftHours < 0) return "over";
  if (approvedHours > 0 && leftHours < approvedHours * settings.lowShare) return "low";
  return "ok";
}

/** Unused hours do not carry over: each month starts fresh. */
export function monthSummary(
  approvals: Approval[],
  visits: Visit[],
  clientId: string,
  month: YearMonth,
): MonthSummary {
  const { approvedHours, bankedHours } = monthlyAllowance(approvals, clientId, month);
  const usedHours = hoursUsed(visits, clientId, month);
  const leftHours = fromHundredths(toHundredths(approvedHours) - toHundredths(usedHours));
  return {
    clientId,
    month,
    approvedHours,
    usedHours,
    leftHours,
    billedHours: hoursUsed(visits.filter(v => v.submitted), clientId, month),
    unbilledHours: hoursUsed(visits.filter(v => !v.submitted), clientId, month),
    bankedHours,
    status: statusFor(approvedHours, leftHours),
  };
}

// ---------- Billing periods and claims ----------

/** Start date of the two-week billing period that contains `date`. */
export function periodStartFor(date: ISODate): ISODate {
  const offset = daysBetween(settings.billingAnchor, date);
  const index = Math.floor(offset / settings.billingPeriodDays);
  return addDays(settings.billingAnchor, index * settings.billingPeriodDays);
}

export function periodEnd(periodStart: ISODate): ISODate {
  return addDays(periodStart, settings.billingPeriodDays - 1);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Turns a client's unsubmitted days in one billing period into portal claims.
 * One line per day; at most linesPerClaim (and never more than maxLinesPerClaim) lines per claim.
 * With splitClaimsByWeek, each week of the period becomes its own claim (7 + 7).
 */
export function buildClaims(visits: Visit[], clientId: string, periodStart: ISODate): Claim[] {
  const end = periodEnd(periodStart);
  const daily = new Map<string, Visit[]>();
  for (const v of visits.filter(v => v.clientId === clientId && !v.submitted && v.date >= periodStart && v.date <= end)) {
    daily.set(v.date, [...(daily.get(v.date) ?? []), v]);
  }
  const lines: ClaimLine[] = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, services]) => {
    const hours = fromHundredths(services.reduce((s, v) => s + toHundredths(v.hours), 0));
    return { visitId: services[0].id, visitIds: services.map(v => v.id), services: services.map(v => ({ id: v.id, hours: v.hours })), date, hours, costCents: costCents(hours) };
  });
  const groups = settings.splitClaimsByWeek
    ? [
        lines.filter((l) => daysBetween(periodStart, l.date) < 7),
        lines.filter((l) => daysBetween(periodStart, l.date) >= 7),
      ].filter((g) => g.length > 0)
    : [lines];

  const claimLines = groups.flatMap((g) => chunk(g, Math.min(settings.linesPerClaim, settings.maxLinesPerClaim)));

  return claimLines.map((ls, i) => ({
    clientId,
    periodStart,
    claimNumber: i + 1,
    ofClaims: claimLines.length,
    lines: ls,
    totalHours: fromHundredths(ls.reduce((s, l) => s + toHundredths(l.hours), 0)),
    totalCents: ls.reduce((s, l) => s + l.costCents, 0),
  }));
}

// ---------- 60-day billing limit ----------

export function deadlineStatus(serviceDate: ISODate, onDate: ISODate = today()): DeadlineStatus {
  const age = daysBetween(serviceDate, onDate);
  if (age > settings.billingDeadlineDays) return "expired";
  if (age >= settings.deadlineUrgentDays) return "urgent";
  if (age >= settings.deadlineSoonDays) return "soon";
  return "ok";
}

export function daysLeftToBill(serviceDate: ISODate, onDate: ISODate = today()): number {
  return settings.billingDeadlineDays - daysBetween(serviceDate, onDate);
}

/** The client's oldest day that still has not been submitted, if any. */
export function oldestUnsubmitted(visits: Visit[], clientId: string): Visit | undefined {
  return visits
    .filter((v) => v.clientId === clientId && !v.submitted)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

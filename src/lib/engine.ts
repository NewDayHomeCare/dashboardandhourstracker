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
  ScheduledDay,
  Visit,
  YearMonth,
} from "./types";
import { settings } from "./settings";
import { addDays, daysBetween, daysInMonth, firstOfMonth, lastOfMonth, monthOf, today } from "./dates";

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

/**
 * Hours expected for the rest of the month after `onDate`:
 * - scheduled care on days after today, as entered (days without a schedule in between mean no care);
 * - plus, in the current month, an estimate for the days after the last scheduled day, from the
 *   client's average hours per day over the last projectionLookbackDays.
 */
export function projectedHours(
  visits: Visit[],
  schedule: ScheduledDay[],
  clientId: string,
  month: YearMonth,
  onDate: ISODate = today(),
): { scheduledHours: number; projectedHours: number; projectionSource: MonthSummary["projectionSource"] } {
  const end = lastOfMonth(month);
  const start = addDays(onDate, 1) > firstOfMonth(month) ? addDays(onDate, 1) : firstOfMonth(month);
  if (start > end) return { scheduledHours: 0, projectedHours: 0, projectionSource: "none" };

  const planned = schedule.filter((d) => d.clientId === clientId && d.date >= start && d.date <= end);
  const scheduled = planned.reduce((sum, d) => sum + toHundredths(d.hours), 0);
  const lastPlanned = planned.map((d) => d.date).sort().at(-1);

  let pace = 0;
  if (monthOf(onDate) === month) {
    const lookback = settings.projectionLookbackDays;
    const from = addDays(onDate, -(lookback - 1));
    const recent = visits
      .filter((v) => v.clientId === clientId && v.date >= from && v.date <= onDate)
      .reduce((sum, v) => sum + toHundredths(v.hours), 0);
    const unplannedDays = daysBetween(lastPlanned ? addDays(lastPlanned, 1) : start, end) + 1;
    pace = Math.max(0, Math.round((recent / lookback) * unplannedDays));
  }

  return {
    scheduledHours: fromHundredths(scheduled),
    projectedHours: fromHundredths(scheduled + pace),
    projectionSource: scheduled && pace ? "schedule+pace" : scheduled ? "schedule" : pace ? "pace" : "none",
  };
}

export type Repeat = "none" | "14-days" | "end-of-month";

/** The days a Repeat choice in Add hours covers, starting from `date`. */
export function repeatDates(date: ISODate, repeat: Repeat): ISODate[] {
  const count =
    repeat === "14-days" ? 14 : repeat === "end-of-month" ? daysInMonth(monthOf(date)) - Number(date.slice(8, 10)) + 1 : 1;
  return Array.from({ length: count }, (_, i) => addDays(date, i));
}

/** The goal is to use every approved hour without going over. */
export function statusFor(approvedHours: number, usedHours: number, projectedTotal: number): ClientStatus {
  if (usedHours > approvedHours) return "over";
  if (projectedTotal > approvedHours) return "will-go-over";
  if (projectedTotal >= approvedHours * settings.unusedShare) return "on-track";
  return "unused";
}

/**
 * Approved, used and projected hours for one client in one month.
 * Unused hours do not carry over: each month starts fresh.
 */
export function monthSummary(
  approvals: Approval[],
  visits: Visit[],
  clientId: string,
  month: YearMonth,
  schedule: ScheduledDay[] = [],
  onDate: ISODate = today(),
): MonthSummary {
  const { approvedHours, bankedHours } = monthlyAllowance(approvals, clientId, month);
  const usedHours = hoursUsed(visits, clientId, month);
  const projection = projectedHours(visits, schedule, clientId, month, onDate);
  const minus = (a: number, b: number) => fromHundredths(toHundredths(a) - toHundredths(b));
  const projectedTotal = fromHundredths(toHundredths(usedHours) + toHundredths(projection.projectedHours));
  return {
    clientId,
    month,
    approvedHours,
    usedHours,
    leftHours: minus(approvedHours, usedHours),
    billedHours: hoursUsed(visits.filter(v => v.submitted), clientId, month),
    unbilledHours: hoursUsed(visits.filter(v => !v.submitted), clientId, month),
    bankedHours,
    ...projection,
    projectedTotal,
    projectedLeft: minus(approvedHours, projectedTotal),
    status: statusFor(approvedHours, usedHours, projectedTotal),
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
    return { visitId: services[0].id, visitIds: services.map(v => v.id), services: services.map(v => ({ id: v.id, hours: v.hours, version: v.version })), date, hours, costCents: costCents(hours) };
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

/** Deadline work is independent of whichever month is open in the allowance view. */
export function unbilledQueue(visits: Visit[], onDate: ISODate = today()) {
  return visits.filter(v=>!v.submitted).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))
    .map(v=>({visit:v,status:deadlineStatus(v.date,onDate),daysLeft:daysLeftToBill(v.date,onDate)}));
}

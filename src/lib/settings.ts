import { demoDateFromEnvironment } from "./clockConfig";
// Values New Day staff may need to change. Keep business numbers here, never in screen code.

export const settings = {
  /** Unverified demo hourly rate; no historical rate schedule has been provided. */
  hourlyRateCents: 3503,
  /** Most lines (days) the portal accepts in one claim. */
  maxLinesPerClaim: 10,
  /** Lines (days) per claim when splitting a period, so daily care for two weeks becomes 7 + 7. */
  linesPerClaim: 7,
  /** Split each two-week billing period into one claim per week. TO CONFIRM with Scott. */
  splitClaimsByWeek: true,
  /** Billing runs every 14 days starting from this date. TO CONFIRM the real anchor date. */
  billingAnchor: "2026-11-01",
  billingPeriodDays: 14,
  /** Days after the service date by which a line must be billed. TO CONFIRM it counts from the service date. */
  billingDeadlineDays: 60,
  deadlineSoonDays: 45,
  deadlineUrgentDays: 55,
  /** "Hours left unused" when used + projected is below this share of approved hours (the goal is to use them all). */
  unusedShare: 0.9,
  /** How far ahead care can be scheduled. */
  maxScheduleDaysAhead: 62,
  /** Optional demo clock. Rebuild when changing this public environment variable. */
  demoToday: demoDateFromEnvironment(process.env.NEXT_PUBLIC_HOMECARE_DEMO_DATE),
};

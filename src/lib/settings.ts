// Values New Day staff may need to change. Keep business numbers here, never in screen code.

export const settings = {
  /** CDHCI hourly rate, confirmed by Scott. */
  hourlyRateCents: 3503,
  /** Most lines (days) the portal accepts in one claim. */
  maxLinesPerClaim: 10,
  /** Split each two-week billing period into one claim per week. TO CONFIRM with Scott. */
  splitClaimsByWeek: true,
  /** Billing runs every 14 days starting from this date. TO CONFIRM the real anchor date. */
  billingAnchor: "2026-11-01",
  billingPeriodDays: 14,
  /** Days after the service date by which a line must be billed. TO CONFIRM it counts from the service date. */
  billingDeadlineDays: 60,
  deadlineSoonDays: 45,
  deadlineUrgentDays: 55,
  /** A client is "running low" when fewer than this share of approved hours are left. */
  lowShare: 0.15,
  /** Fixed "today" so the demo always looks the same. Set to null to use the real date. */
  demoToday: "2026-11-07" as string | null,
};

// Shared data types. Agree on these as a team before changing them:
// every screen and the calculation engine depend on them.

/** A calendar date as "YYYY-MM-DD". Always treated as a plain date (no time zone). */
export type ISODate = string;

/** A month as "YYYY-MM". */
export type YearMonth = string;

export interface Client {
  id: string;
  lastName: string;
  firstName: string;
  /** The client's ID number entered in the billing portal. Sample data uses fake IDs. */
  portalId: string;
}

/**
 * Approved hours for a client, as set by an AHS assessment.
 * A new approval replaces the previous one from `effectiveFrom` onward.
 */
export interface Approval {
  id: string;
  clientId: string;
  /** Approved hours per month. */
  monthlyHours: number;
  /** First day these hours apply. Can be in the past (a backdated change). */
  effectiveFrom: ISODate;
  /** Day the change was entered into the dashboard. Used to work out banked hours. */
  recordedOn: ISODate;
  note?: string;
}

/** One day of care for one client. Billing uses one portal line per day. */
export interface Visit {
  id: string;
  clientId: string;
  date: ISODate;
  /** Hours of care that day, to two decimals (e.g. 5.25). */
  hours: number;
  /** True once the line has been submitted in the portal. */
  submitted: boolean;
}

export type ClientStatus = "ok" | "low" | "over";

export interface MonthSummary {
  clientId: string;
  month: YearMonth;
  approvedHours: number;
  usedHours: number;
  leftHours: number;
  /** Part of approvedHours that came from a backdated increase. */
  bankedHours: number;
  status: ClientStatus;
}

export interface ClaimLine {
  visitId: string;
  date: ISODate;
  hours: number;
  costCents: number;
}

export interface Claim {
  clientId: string;
  periodStart: ISODate;
  /** 1-based number of this claim within the client's billing period. */
  claimNumber: number;
  ofClaims: number;
  lines: ClaimLine[];
  totalHours: number;
  totalCents: number;
}

export type DeadlineStatus = "ok" | "soon" | "urgent" | "expired";

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

/** One completed service. Claims aggregate unbilled services by date. */
export interface Visit {
  id: string;
  clientId: string;
  date: ISODate;
  /** Hours of care that day, to two decimals (e.g. 5.25). */
  hours: number;
  /** True once the line has been submitted in the portal. */
  submitted: boolean;
  note?: string;
  batchId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

/** Care planned for a day that hasn't happened yet. Counts toward projected hours, never billed. */
export interface ScheduledDay {
  /** Stable identity and revision supplied by persistent storage. */
  id?: string;
  version?: number;
  clientId: string;
  date: ISODate;
  hours: number;
}

/**
 * over          already used more than approved
 * will-go-over  used + projected is more than approved
 * on-track      expected to use most of the approved hours, without going over
 * unused        expected to leave a good share of approved hours unused
 */
export type ClientStatus = "over" | "will-go-over" | "on-track" | "unused";

export interface MonthSummary {
  clientId: string;
  month: YearMonth;
  approvedHours: number;
  /** Hours of completed care recorded in the month. */
  usedHours: number;
  /** approvedHours - usedHours */
  leftHours: number;
  billedHours: number;
  unbilledHours: number;
  /** Part of approvedHours that came from a backdated increase. */
  bankedHours: number;
  /** Hours scheduled after today in the month. */
  scheduledHours: number;
  /** Compatibility field: explicitly scheduled hours after today; no historical estimate. */
  projectedHours: number;
  projectionSource: "schedule" | "none";
  /** usedHours + projectedHours */
  projectedTotal: number;
  /** approvedHours - projectedTotal (negative = expected to go over) */
  projectedLeft: number;
  status: ClientStatus;
}

export interface ClaimLine {
  visitId: string;
  visitIds: string[];
  services: { id: string; hours: number; version?: number }[];
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

export interface BillingBatch {
  id: string; clientId: string; reference: string; submittedOn: string;
  status: "submitted" | "paid" | "returned"; rateCents: number;
  visits: { id: string; date: string; hours: number; note?: string }[];
  createdAt: string; updatedAt: string; note: string;
  voidedVisitIds?: string[];
}
export interface AuditEvent {
  id: string; clientId: string; action: string; targetId: string; at: string;
  actor: string; beforeJson: string | null; afterJson: string | null;
}

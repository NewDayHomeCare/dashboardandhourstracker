import { afterEach, describe, expect, it } from "vitest";
import {
  buildClaims,
  costCents,
  deadlineStatus,
  monthSummary,
  monthlyAllowance,
  periodStartFor,
} from "./engine";
import { settings } from "./settings";
import type { Approval, Visit } from "./types";

const approval = (p: Partial<Approval>): Approval => ({
  id: p.id ?? Math.random().toString(36),
  clientId: "c1",
  monthlyHours: 30,
  effectiveFrom: "2026-10-01",
  recordedOn: "2026-10-01",
  ...p,
});

const visit = (date: string, hours: number, p: Partial<Visit> = {}): Visit => ({
  id: `${p.clientId ?? "c1"}-${date}`,
  clientId: "c1",
  date,
  hours,
  submitted: false,
  ...p,
});

describe("cost", () => {
  it("multiplies hours by $35.03 and rounds to the cent", () => {
    expect(costCents(2)).toBe(7006);
    expect(costCents(5.25)).toBe(18391); // 183.9075 -> 183.91
    expect(costCents(1.5)).toBe(5255); // 52.545 -> 52.55
  });
});

describe("approved hours", () => {
  it("gives the full monthly amount when nothing changes", () => {
    const r = monthlyAllowance([approval({})], "c1", "2026-11");
    expect(r).toEqual({ approvedHours: 30, bankedHours: 0 });
  });

  it("splits the month by day when hours change mid-month", () => {
    const a = [
      approval({ id: "a1" }),
      approval({ id: "a2", monthlyHours: 60, effectiveFrom: "2026-11-16", recordedOn: "2026-11-16" }),
    ];
    // 15 days at 30 h/month + 15 days at 60 h/month (November has 30 days)
    expect(monthlyAllowance(a, "c1", "2026-11")).toEqual({ approvedHours: 45, bankedHours: 0 });
  });

  it("banks the extra hours for days already past when an increase is backdated", () => {
    const a = [
      approval({ id: "a1" }),
      approval({ id: "a2", monthlyHours: 60, effectiveFrom: "2026-11-01", recordedOn: "2026-11-07" }),
    ];
    // Nov 1-6 had passed when the change was entered: 6 days x 1 extra hour per day
    expect(monthlyAllowance(a, "c1", "2026-11")).toEqual({ approvedHours: 60, bankedHours: 6 });
  });

  it("does not bank anything for a backdated decrease", () => {
    const a = [
      approval({ id: "a1", monthlyHours: 60 }),
      approval({ id: "a2", monthlyHours: 30, effectiveFrom: "2026-11-01", recordedOn: "2026-11-07" }),
    ];
    expect(monthlyAllowance(a, "c1", "2026-11")).toEqual({ approvedHours: 30, bankedHours: 0 });
  });
});

describe("hours left", () => {
  it("flags a client who has gone over", () => {
    const visits = [visit("2026-11-02", 30), visit("2026-11-03", 1.5)];
    const s = monthSummary([approval({})], visits, "c1", "2026-11");
    expect(s.leftHours).toBe(-1.5);
    expect(s.status).toBe("over");
  });

  it("flags a client running low", () => {
    const visits = [visit("2026-11-02", 36)];
    const s = monthSummary([approval({ monthlyHours: 40 })], visits, "c1", "2026-11");
    expect(s.leftHours).toBe(4);
    expect(s.status).toBe("low");
  });

  it("does not carry unused hours into the next month", () => {
    const visits = [visit("2026-10-05", 2), visit("2026-11-02", 5.25)];
    const s = monthSummary([approval({})], visits, "c1", "2026-11");
    expect(s.usedHours).toBe(5.25);
    expect(s.leftHours).toBe(24.75);
  });
});

describe("billing periods and claims", () => {
  const original = { ...settings };
  afterEach(() => Object.assign(settings, original));

  it("finds the two-week period a date falls in", () => {
    expect(periodStartFor("2026-11-14")).toBe("2026-11-01");
    expect(periodStartFor("2026-11-15")).toBe("2026-11-15");
    expect(periodStartFor("2026-10-31")).toBe("2026-10-18");
  });

  const fourteenDays = Array.from({ length: 14 }, (_, i) =>
    visit(`2026-11-${String(i + 1).padStart(2, "0")}`, 2),
  );

  it("makes one claim per week by default (7 + 7)", () => {
    const claims = buildClaims(fourteenDays, "c1", "2026-11-01");
    expect(claims.map((c) => c.lines.length)).toEqual([7, 7]);
    expect(claims[0]).toMatchObject({ claimNumber: 1, ofClaims: 2, totalHours: 14, totalCents: 49042 });
  });

  it("splits into batches of 7 even without the weekly split", () => {
    settings.splitClaimsByWeek = false;
    const claims = buildClaims(fourteenDays, "c1", "2026-11-01");
    expect(claims.map((c) => c.lines.length)).toEqual([7, 7]);
  });

  it("never puts more than 10 lines in a claim", () => {
    settings.splitClaimsByWeek = false;
    settings.linesPerClaim = 14;
    const claims = buildClaims(fourteenDays, "c1", "2026-11-01");
    expect(claims.map((c) => c.lines.length)).toEqual([10, 4]);
  });

  it("leaves out days already submitted", () => {
    const visits = fourteenDays.map((v, i) => ({ ...v, submitted: i < 3 }));
    const claims = buildClaims(visits, "c1", "2026-11-01");
    expect(claims.map((c) => c.lines.length)).toEqual([4, 7]);
  });
});

describe("60-day billing limit", () => {
  it("warns as a service date gets old", () => {
    expect(deadlineStatus("2026-10-20", "2026-11-07")).toBe("ok"); // 18 days
    expect(deadlineStatus("2026-09-20", "2026-11-07")).toBe("soon"); // 48 days
    expect(deadlineStatus("2026-09-12", "2026-11-07")).toBe("urgent"); // 56 days
    expect(deadlineStatus("2026-09-01", "2026-11-07")).toBe("expired"); // 67 days
  });
});

describe("monthly billing totals", () => {
  it("counts billed and unbilled services in usage, without mixing months", () => {
    const visits = [visit("2026-11-01", 2.5, { submitted: true }), visit("2026-11-02", 5.25), visit("2026-10-01", 9)];
    const summary = monthSummary([approval({ monthlyHours: 100 })], visits, "c1", "2026-11");
    expect(summary).toMatchObject({ billedHours: 2.5, unbilledHours: 5.25, usedHours: 7.75, leftHours: 92.25 });
    const billed = monthSummary([approval({ monthlyHours: 100 })], visits.map(v => ({ ...v, submitted: true })), "c1", "2026-11");
    expect(billed).toMatchObject({ billedHours: 7.75, unbilledHours: 0, usedHours: 7.75, leftHours: 92.25 });
  });
});

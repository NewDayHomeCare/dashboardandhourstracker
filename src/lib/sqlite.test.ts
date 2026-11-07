import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openHoursDatabase } from "./sqlite";
import { monthSummary } from "./engine";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.reverse()) cleanup(); cleanups.length = 0; });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "homecare-test-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "hours.sqlite");
  let current: ReturnType<typeof openHoursDatabase> | undefined;
  const open = () => { current = openHoursDatabase(path); return current; };
  const close = () => { current?.close(); current = undefined; };
  cleanups.push(close);
  return { open, close };
}

describe("local database", () => {
  it("preserves decimal hours, approval changes and submission status when reopened", () => {
    const f = fixture(); let db = f.open();
    expect(db.getClients()).toHaveLength(40);
    expect(Object.getPrototypeOf(db.getClients()[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(db.getClient("c04"))).toBe(Object.prototype);
    expect(db.setVisitHours("c04", "2026-11-07", 2.5)).toMatchObject({ ok: true });
    const approval = db.addApproval({ clientId: "c04", monthlyHours: 100, effectiveFrom: "2026-11-01", note: "Persistence test" });
    const visit = db.getVisits().find(v => v.clientId === "c04" && v.date === "2026-11-07")!;
    const before = monthSummary(db.getApprovals(), db.getVisits(), "c04", "2026-11");
    expect(db.markClaimSubmitted([visit.id, visit.id])).toBe(1);
    expect(monthSummary(db.getApprovals(), db.getVisits(), "c04", "2026-11")).toEqual({ ...before, billedHours: before.billedHours + 2.5, unbilledHours: before.unbilledHours - 2.5 });
    f.close(); db = f.open();
    expect(db.getClients()).toHaveLength(40);
    expect(Object.getPrototypeOf(db.getClients()[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(db.getClient("c04"))).toBe(Object.prototype);
    expect(db.getVisits().find(v => v.id === visit.id)).toMatchObject({ hours: 2.5, submitted: true });
    expect(db.getApprovals().find(a => a.id === approval.id)).toMatchObject({ monthlyHours: 100, note: "Persistence test" });
    expect(monthSummary(db.getApprovals(), db.getVisits(), "c04", "2026-11")).toEqual({ ...before, billedHours: before.billedHours + 2.5, unbilledHours: before.unbilledHours - 2.5 });
    expect(db.setVisitHours("c04", "2026-11-07", 0).ok).toBe(false);
    expect(db.deleteVisit("c04", "2026-11-07").ok).toBe(false);
  });
  it("rejects invalid inputs without changing existing records; explicit deletion persists", () => {
    const f = fixture(); let db = f.open(); const before = db.getVisits();
    for (const value of [NaN, 0, -1, 25, 2.555]) expect(db.setVisitHours("c04", "2026-11-07", value).ok).toBe(false);
    expect(db.setVisitHours("missing", "2026-11-07", 2).ok).toBe(false);
    expect(db.setVisitHours("c04", "2026-02-30", 2).ok).toBe(false);
    expect(db.getVisits()).toEqual(before);
    expect(db.deleteVisit("c04", "2026-11-07").ok).toBe(true);
    f.close(); db = f.open();
    expect(db.getVisits().some(v => v.clientId === "c04" && v.date === "2026-11-07")).toBe(false);
  });
  it("adds backdated completed hours, while editing replaces the total", () => {
    const f = fixture(); const db = f.open();
    const before = monthSummary(db.getApprovals(), db.getVisits(), "c12", "2026-11");
    const previous = db.getVisits().find(v => v.clientId === "c12" && v.date === "2026-11-06")?.hours ?? 0;
    expect(db.setVisitHours("c12", "2026-11-06", 10, "add").ok).toBe(true);
    expect(db.getVisits().find(v => v.clientId === "c12" && v.date === "2026-11-06")).toMatchObject({ hours: previous + 10, submitted: false });
    const after = monthSummary(db.getApprovals(), db.getVisits(), "c12", "2026-11");
    expect(after.leftHours).toBe(before.leftHours - 10);
    expect(after.unbilledHours).toBe(before.unbilledHours + 10);
    expect(db.setVisitHours("c12", "2026-11-06", 20, "add").ok).toBe(false);
    expect(db.setVisitHours("c12", "2026-11-06", 6, "replace").ok).toBe(true);
    expect(db.getVisits().find(v => v.clientId === "c12" && v.date === "2026-11-06")?.hours).toBe(6);
  });
  it("does not reseed an intentionally empty database", () => {
    const dir = mkdtempSync(join(tmpdir(), "homecare-empty-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, "hours.sqlite");
    const db = openHoursDatabase(path, () => ({ clients: [], approvals: [], visits: [] })); db.close();
    const reopened = openHoursDatabase(path); cleanups.push(() => reopened.close());
    expect(reopened.getClients()).toEqual([]);
  });
});


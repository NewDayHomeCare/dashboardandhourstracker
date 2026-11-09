import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { openHoursDatabase, type ReviewInput } from "./sqlite";
import { buildClaims, monthSummary } from "./engine";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.reverse().forEach(f => f()); cleanup.length = 0; });
function fixture(existingService = false) {
  const dir = mkdtempSync(join(tmpdir(), "schedule-review-"));
  const path = join(dir, "test.sqlite");
  const seed = () => ({ clients: [{ id: "c", firstName: "Test", lastName: "Person", portalId: "DEMO" }], approvals: [{ id: "a", clientId: "c", monthlyHours: 100, effectiveFrom: "2026-10-01", recordedOn: "2026-10-01" }], visits: existingService ? [{ id: "manual", clientId: "c", date: "2026-11-06", hours: 5, submitted: false }] : [], schedule: [{ clientId: "c", date: "2026-11-06", hours: 6 }] });
  let db = openHoursDatabase(path, seed);
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  cleanup.push(() => db.close());
  return { get db() { return db; }, dir, path, reopen() { db.close(); db = openHoursDatabase(path, seed); return db; } };
}
function request(db: ReturnType<typeof openHoursDatabase>, extra: Partial<ReviewInput> = {}): ReviewInput {
  const d = db.getSchedule()[0];
  return { scheduleId: d.id!, expectedVersion: d.version!, outcome: "completed", hours: 5, requestId: randomUUID(), ...extra };
}

describe("schedule to completed care", () => {
  it("confirms actual hours once, removes the pending plan and prepares billing", () => {
    const f = fixture(), db = f.db, input = request(db);
    expect(db.reviewSchedule(input).ok).toBe(true);
    expect(db.reviewSchedule(input).ok).toBe(true);
    expect(db.reviewSchedule({ ...input, requestId: randomUUID() }).ok).toBe(false);
    expect(db.getSchedule()).toHaveLength(0);
    expect(db.getVisits()).toHaveLength(1);
    expect(db.getVisits()[0]).toMatchObject({ hours: 5, submitted: false, date: "2026-11-06" });
    expect(monthSummary(db.getApprovals(), db.getVisits(), "c", "2026-11").leftHours).toBe(95);
    expect(buildClaims(db.getVisits(), "c", "2026-11-01")[0].totalHours).toBe(5);
    expect(db.getAudit()[0]).toMatchObject({ action: "schedule_completed", targetId: input.scheduleId });
    expect(JSON.parse(db.getAudit()[0].beforeJson!)).toMatchObject({ hoursHundredths: 600 });
    expect(f.reopen().getVisits()).toHaveLength(1);
    expect(f.db.getSchedule()).toHaveLength(0);
  });
  it("keeps unresolved old plans across restarts", () => {
    const f = fixture(); const id = f.db.getSchedule()[0].id;
    expect(f.reopen().getSchedule()[0]).toMatchObject({ id, date: "2026-11-06" });
    expect(f.db.getVisits()).toHaveLength(0);
  });
  it("dismisses with a reason without creating completed or billable care", () => {
    const db = fixture().db;
    expect(db.reviewSchedule(request(db, { outcome: "cancelled", hours: undefined })).ok).toBe(false);
    expect(db.reviewSchedule(request(db, { outcome: "cancelled", hours: undefined, note: "Family cancelled" })).ok).toBe(true);
    expect(db.getSchedule()).toHaveLength(0);
    expect(db.getVisits()).toHaveLength(0);
    expect(db.getAudit()[0].action).toBe("schedule_cancelled");
  });
  it("rejects invalid hours and future confirmations without removing plans", () => {
    const db = fixture().db;
    for (const hours of [0, -1, 24.01, NaN, 1.234]) expect(db.reviewSchedule(request(db, { hours })).ok).toBe(false);
    db.scheduleCare({ clientId: "c", dates: ["2026-11-08"], hours: 3 });
    const future = db.getSchedule().find(d => d.date === "2026-11-08")!;
    expect(db.reviewSchedule(request(db, { scheduleId: future.id!, expectedVersion: future.version! })).ok).toBe(false);
    expect(db.getSchedule()).toHaveLength(2);
    expect(db.getVisits()).toHaveLength(0);
  });
  it("rejects stale reviews even when hours are changed back to the original value", () => {
    const db = fixture().db;
    db.scheduleCare({ clientId: "c", dates: ["2026-11-07"], hours: 3 });
    const old = db.getSchedule().find(d => d.date === "2026-11-07")!;
    db.scheduleCare({ clientId: "c", dates: [old.date], hours: 4 });
    db.scheduleCare({ clientId: "c", dates: [old.date], hours: 3 });
    expect(db.reviewSchedule(request(db, { scheduleId: old.id!, expectedVersion: old.version! })).ok).toBe(false);
    expect(db.getVisits()).toHaveLength(0);
  });
  it("prevents duplicate manual records in both directions", () => {
    const db = fixture(true).db;
    expect(db.reviewSchedule(request(db)).ok).toBe(false);
    expect(db.getVisits()).toHaveLength(1);
    expect(db.addService({ clientId: "c", date: "2026-11-06", hours: 1, requestId: randomUUID(), confirmDuplicate: true }).ok).toBe(false);
    expect(db.getSchedule()).toHaveLength(1);
  });
  it("rolls back service creation if saving the review fails", () => {
    const f = fixture();
    const raw = new DatabaseSync(f.path);
    raw.exec("CREATE TRIGGER fail_review BEFORE INSERT ON schedule_reviews BEGIN SELECT RAISE(ABORT, 'test failure'); END;"); raw.close();
    expect(() => f.db.reviewSchedule(request(f.db))).toThrow();
    expect(f.db.getVisits()).toHaveLength(0);
    expect(f.db.getSchedule()).toHaveLength(1);
    expect(f.db.getAudit()).toHaveLength(0);
  });
  it("backs up a legacy schedule before adding stable identities", () => {
    const f = fixture();
    const raw = new DatabaseSync(f.path);
    raw.exec("DROP INDEX schedule_id; ALTER TABLE scheduled_care DROP COLUMN id; ALTER TABLE scheduled_care DROP COLUMN version;"); raw.close();
    const db = f.reopen();
    expect(db.getSchedule()[0]).toMatchObject({ hours: 6, version: 1, id: expect.any(String) });
    expect(readdirSync(join(f.dir, "backups"))).toHaveLength(1);
  });
});

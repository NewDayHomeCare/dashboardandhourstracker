// Single place screens and actions get or change data. (Programmer 1 owns this file.)
//
// For now data lives in server memory, seeded with sample data. Changes last until the
// server restarts. TODO: save to a JSON file (or a database) so changes survive restarts;
// keep these function names so screens and actions don't need to change.

import type { Approval, Visit } from "./types";
import { makeSampleData } from "./sampleData";
import { today } from "./dates";

type Store = ReturnType<typeof makeSampleData>;

// Kept on globalThis so the dev server's hot reload doesn't wipe changes.
const g = globalThis as unknown as { __hoursStore?: Store };
const store: Store = (g.__hoursStore ??= makeSampleData());

let nextId = 1;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${nextId++}`;

// ---------- Reads ----------

export const getClients = () => store.clients;
export const getClient = (id: string) => store.clients.find((c) => c.id === id);
export const getApprovals = () => store.approvals;
export const getVisits = () => store.visits;

// ---------- Changes ----------

export type ChangeResult = { ok: true } | { ok: false; error: string };

/** Records a reassessment. recordedOn is today, so a past effectiveFrom banks hours. */
export function addApproval(input: {
  clientId: string;
  monthlyHours: number;
  effectiveFrom: string;
  note?: string;
}): Approval {
  const approval: Approval = { id: newId("appr"), recordedOn: today(), ...input };
  store.approvals.push(approval);
  return approval;
}

/** Sets the hours for one client on one day. 0 removes the day. Submitted days can't change. */
export function setVisitHours(clientId: string, date: string, hours: number): ChangeResult {
  const i = store.visits.findIndex((v) => v.clientId === clientId && v.date === date);
  const existing = store.visits[i];
  if (existing?.submitted) {
    return { ok: false, error: "That day is already submitted in the portal, so it can't be changed here." };
  }
  if (hours === 0) {
    if (existing) store.visits.splice(i, 1);
    return { ok: true };
  }
  if (existing) existing.hours = hours;
  else store.visits.push({ id: newId(clientId), clientId, date, hours, submitted: false } satisfies Visit);
  return { ok: true };
}

export function markClaimSubmitted(visitIds: string[]): number {
  let count = 0;
  for (const v of store.visits) {
    if (visitIds.includes(v.id) && !v.submitted) {
      v.submitted = true;
      count++;
    }
  }
  return count;
}

/** TODO (Programmer 2): CSV import. Each row = one client's hours on one day. */
export function importVisits(rows: { clientId: string; date: string; hours: number }[]) {
  const errors: string[] = [];
  let imported = 0;
  rows.forEach((r, n) => {
    const res = setVisitHours(r.clientId, r.date, r.hours);
    if (res.ok) imported++;
    else errors.push(`Row ${n + 1}: ${res.error}`);
  });
  return { imported, errors };
}

"use server";

// Server actions called by the dialogs and buttons. They check input, change data
// through src/lib/data.ts, then refresh every page. (Programmer 2 owns this file.)

import { revalidatePath } from "next/cache";
import { addApproval, getClient, markClaimSubmitted, setVisitHours, unmarkSubmitted } from "@/lib/data";
import { today } from "@/lib/dates";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

export async function saveDayHours(input: { clientId: string; date: string; hours: number }): Promise<ActionResult> {
  const client = getClient(input.clientId);
  if (!client) return { ok: false, error: "Choose a client." };
  if (!DATE_RE.test(input.date)) return { ok: false, error: "Choose the date of service." };
  if (input.date > today()) return { ok: false, error: "The date of service can't be in the future." };
  const h = input.hours;
  if (!Number.isFinite(h) || h < 0 || h > 24 || !hasAtMostTwoDecimals(h)) {
    return { ok: false, error: "Enter hours between 0 and 24, up to two decimals (for example 5.25)." };
  }

  const res = setVisitHours(input.clientId, input.date, h);
  if (!res.ok) return res;
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: h === 0 ? `Removed ${input.date} for ${client.firstName} ${client.lastName}` : `Saved ${h.toFixed(2)} h for ${client.firstName} ${client.lastName}`,
  };
}

export async function saveApproval(input: {
  clientId: string;
  monthlyHours: number;
  effectiveFrom: string;
  note?: string;
}): Promise<ActionResult> {
  const client = getClient(input.clientId);
  if (!client) return { ok: false, error: "Choose a client." };
  const h = input.monthlyHours;
  if (!Number.isFinite(h) || h < 0 || h > 744 || !hasAtMostTwoDecimals(h)) {
    return { ok: false, error: "Enter approved hours per month between 0 and 744." };
  }
  if (!DATE_RE.test(input.effectiveFrom)) return { ok: false, error: "Choose the date the new hours take effect." };

  addApproval({ ...input, note: input.note?.trim() || "Reassessment" });
  revalidatePath("/", "layout");
  return { ok: true, message: `Approved hours updated for ${client.firstName} ${client.lastName}` };
}

export async function submitClaim(visitIds: string[]): Promise<ActionResult> {
  const n = markClaimSubmitted(visitIds);
  revalidatePath("/", "layout");
  return n > 0 ? { ok: true, message: `Marked ${n} line${n === 1 ? "" : "s"} submitted` } : { ok: false, error: "Nothing to mark." };
}

export async function undoSubmitted(visitIds: string[]): Promise<ActionResult> {
  const n = unmarkSubmitted(visitIds);
  revalidatePath("/", "layout");
  return n > 0 ? { ok: true, message: `Moved ${n} line${n === 1 ? "" : "s"} back to billing` } : { ok: false, error: "Nothing to undo." };
}

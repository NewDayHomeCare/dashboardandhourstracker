"use client";

// Enter a reassessment: new monthly hours and the date they take effect.
// Shows a live preview using the same engine as the rest of the app.
// TODO (Person C): save the new approval once storage exists (see src/lib/data.ts).

import { useState } from "react";
import type { Approval, Visit, YearMonth } from "@/lib/types";
import { formatHours, monthSummary } from "@/lib/engine";
import { today } from "@/lib/dates";

export function EditHoursForm(props: {
  clientId: string;
  month: YearMonth;
  approvals: Approval[];
  visits: Visit[];
}) {
  const [hours, setHours] = useState("");
  const [from, setFrom] = useState(today());
  const [error, setError] = useState("");

  const value = Number(hours);
  const valid = hours !== "" && Number.isFinite(value) && value >= 0;

  const preview = valid
    ? monthSummary(
        [
          ...props.approvals,
          { id: "preview", clientId: props.clientId, monthlyHours: value, effectiveFrom: from, recordedOn: today() },
        ],
        props.visits,
        props.clientId,
        props.month,
      )
    : null;

  return (
    <form
      className="flex flex-col gap-3 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(valid ? "" : "Enter the new approved hours per month.");
      }}
    >
      <h3 className="font-bold">Enter a reassessment</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor="hours" className="text-sm font-semibold">New approved hours per month</label>
        <input
          id="hours"
          inputMode="decimal"
          value={hours}
          onChange={(e) => { setHours(e.target.value); setError(""); }}
          className="min-h-11 rounded-lg border border-line px-3"
        />
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="from" className="text-sm font-semibold">Takes effect from</label>
        <input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="min-h-11 rounded-lg border border-line px-3"
        />
      </div>

      {preview && (
        <div className="rounded-lg bg-brand-soft p-3 text-sm text-brand-dark" aria-live="polite">
          This month becomes {formatHours(preview.approvedHours)} h approved, {formatHours(preview.leftHours)} h left
          {preview.bankedHours > 0 && <>, including {formatHours(preview.bankedHours)} h banked from backdating</>}.
        </div>
      )}

      <button type="submit" className="min-h-11 rounded-lg bg-brand px-4 font-semibold text-white">
        Save new hours
      </button>
    </form>
  );
}

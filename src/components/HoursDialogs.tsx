"use client";

// "Add hours" and "Edit approved hours" from the Figma Make design, now saving through
// server actions and previewing with the same engine as the rest of the app.

import { useState, useTransition } from "react";
import type { Approval, Client, Visit } from "@/lib/types";
import { formatHours, monthSummary } from "@/lib/engine";
import { monthOf, today } from "@/lib/dates";
import { saveApproval, saveDayHours } from "@/app/actions";
import { Icon } from "./Icon";
import { Modal, Toast, fieldClass, labelClass, primaryButton, secondaryButton } from "./Modal";

type Shared = {
  clients: Pick<Client, "id" | "firstName" | "lastName">[];
  approvals: Approval[];
  visits: Visit[];
  defaultClientId?: string;
};

function useToast() {
  const [message, setMessage] = useState("");
  return {
    message,
    show: (m: string) => {
      setMessage(m);
      window.setTimeout(() => setMessage(""), 2800);
    },
  };
}

function ClientSelect({ clients, value, onChange }: { clients: Shared["clients"]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="client" className={labelClass}>Client</label>
      <select id="client" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>
        ))}
      </select>
    </div>
  );
}

export function AddHoursButton(props: Shared & { primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(props.defaultClientId ?? props.clients[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState("2");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const existing = props.visits.find((v) => v.clientId === clientId && v.date === date);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={props.primary === false ? secondaryButton : primaryButton}>
        <Icon name="plus" size={18} /> Add hours
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add client hours" description="Record the hours of care for one client on one day. Each day becomes one line in the portal.">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveDayHours({ clientId, date, hours: Number(hours) });
              if (!res.ok) return setError(res.error);
              setError("");
              setOpen(false);
              toast.show(res.message);
            });
          }}
        >
          <ClientSelect clients={props.clients} value={clientId} onChange={(v) => { setClientId(v); setError(""); }} />
          <div>
            <label htmlFor="date" className={labelClass}>Date of service</label>
            <input id="date" type="date" max={today()} value={date} onChange={(e) => { setDate(e.target.value); setError(""); }} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="hours" className={labelClass}>Hours that day</label>
            <div className="relative">
              <input
                id="hours"
                type="number"
                step="0.01"
                min="0"
                max="24"
                inputMode="decimal"
                value={hours}
                onChange={(e) => { setHours(e.target.value); setError(""); }}
                aria-describedby="hours-help"
                className={`${fieldClass} pr-14`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">hours</span>
            </div>
            <p id="hours-help" className="mt-2 text-sm text-muted">
              {existing
                ? existing.submitted
                  ? "This day is already submitted in the portal."
                  : `Currently ${formatHours(existing.hours)} h on this day. Saving replaces it; enter 0 to remove it.`
                : "Decimals are fine, for example 5.25."}
            </p>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Saving…" : "Save hours"}</button>
          </div>
        </form>
      </Modal>
      <Toast message={toast.message} />
    </>
  );
}

export function EditApprovalButton(props: Shared) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(props.defaultClientId ?? props.clients[0]?.id ?? "");
  const [hours, setHours] = useState("");
  const [from, setFrom] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const month = monthOf(today());
  const mine = props.approvals.filter((a) => a.clientId === clientId);
  const current = monthSummary(mine, props.visits, clientId, month);
  const value = Number(hours);
  const preview =
    hours !== "" && Number.isFinite(value) && value >= 0
      ? monthSummary(
          [...mine, { id: "preview", clientId, monthlyHours: value, effectiveFrom: from, recordedOn: today() }],
          props.visits,
          clientId,
          month,
        )
      : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondaryButton}>
        <Icon name="edit" size={17} /> Edit approved hours
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enter a reassessment" description="New approved hours per month and the date they take effect. A past date banks the extra hours.">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (hours === "") return setError("Enter the new approved hours per month.");
            start(async () => {
              const res = await saveApproval({ clientId, monthlyHours: value, effectiveFrom: from, note });
              if (!res.ok) return setError(res.error);
              setError("");
              setHours("");
              setNote("");
              setOpen(false);
              toast.show(res.message);
            });
          }}
        >
          <ClientSelect clients={props.clients} value={clientId} onChange={(v) => { setClientId(v); setError(""); }} />
          <p className="text-sm text-muted">This month now: {formatHours(current.approvedHours)} h approved, {formatHours(current.leftHours)} h left.</p>
          <div>
            <label htmlFor="monthly" className={labelClass}>New approved hours per month</label>
            <input id="monthly" type="number" step="0.01" min="0" max="744" inputMode="decimal" value={hours} onChange={(e) => { setHours(e.target.value); setError(""); }} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="from" className={labelClass}>Takes effect from</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="note" className={labelClass}>Note (optional)</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. AHS reassessment" className={fieldClass} />
          </div>
          {preview && (
            <div aria-live="polite" className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">
              This month becomes {formatHours(preview.approvedHours)} h approved, {formatHours(preview.leftHours)} h left
              {preview.bankedHours > 0 && <>, including {formatHours(preview.bankedHours)} h banked from backdating</>}.
            </div>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Saving…" : "Save new hours"}</button>
          </div>
        </form>
      </Modal>
      <Toast message={toast.message} />
    </>
  );
}

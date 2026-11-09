"use client";

// "Add hours" and "Edit approved hours" from the Figma Make design, now saving through
// server actions and previewing with the same engine as the rest of the app.

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Approval, Client, MonthSummary, ScheduledDay, Visit } from "@/lib/types";
import { formatHours, monthSummary } from "@/lib/engine";
import { formatMonth, monthOf, today } from "@/lib/dates";
import { saveApproval, saveDayHours } from "@/app/actions";
import { Icon } from "./Icon";
import { Modal, Toast, fieldClass, labelClass, primaryButton, secondaryButton } from "./Modal";

type Shared = {
  clients: Pick<Client, "id" | "firstName" | "lastName">[];
  approvals: Approval[];
  visits: Visit[];
  schedule?: ScheduledDay[];
  defaultClientId?: string;
  month?: string;
  defaultDate?: string;
  defaultHours?: number;
  serviceId?: string;
  expectedVersion?: number;
  buttonLabel?: string;
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

/** "used → used", for the before/after previews. */
function Change({ label, from, to, bad }: { label: string; from: number; to: number; bad?: boolean }) {
  return <p>{label}: {formatHours(from)} → <span className={bad ? "font-bold text-bad" : "font-semibold"}>{formatHours(to)} h</span></p>;
}

function projectionNote(s: MonthSummary) {
  if (s.status === "over" || s.status === "will-go-over") return <p className="font-semibold text-bad">Completed + upcoming scheduled hours would be {formatHours(-s.projectedLeft)} h over approved.</p>;
  if (s.status === "unused") return <p className="text-warn">{formatHours(s.projectedLeft)} h would remain after upcoming scheduled care.</p>;
  return null;
}

function ClientSelect({ clients, value, onChange, disabled }: { clients: Shared["clients"]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor="client" className={labelClass}>Client</label>
      <select disabled={disabled} id="client" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>
        ))}
      </select>
    </div>
  );
}

export function AddHoursButton(props: Shared & { primary?: boolean }) {
  const router = useRouter(); const path = usePathname();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(props.defaultClientId ?? props.clients[0]?.id ?? "");
  const [date, setDate] = useState(props.defaultDate ?? (props.month && props.month < monthOf(today()) ? `${props.month}-01` : today()));
  const [hours, setHours] = useState(props.defaultHours?.toString() ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const [requestId, setRequestId] = useState("");
  const [note, setNote] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const schedule = props.schedule ?? [];
  const editing = props.defaultHours !== undefined;
  const existing = props.visits.find(v => v.id === props.serviceId);

  const h = Number(hours);
  const validHours = hours.trim() !== "" && Number.isFinite(h) && h > 0;

  // What the month looks like before and after saving, using the same engine as the dashboard.
  const preview = (() => {
    if (!validHours || existing?.submitted || !clientId || !date || date > today()) return null;
    const visits = editing ? props.visits.map(v => v.id === props.serviceId ? { ...v, hours: h } : v) : [...props.visits, { id: "preview", clientId, date, hours: h, submitted: false }];
    const planned = schedule;
    const month = monthOf(date);
    return { month, before: monthSummary(props.approvals, props.visits, clientId, month, schedule), after: monthSummary(props.approvals, visits, clientId, month, planned) };
  })();

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setRequestId(crypto.randomUUID()); setHours(props.defaultHours?.toString() ?? ""); setNote(existing?.note ?? ""); setDuplicate(false); setConfirmDuplicate(false); setError(""); }} className={props.primary === false ? secondaryButton : primaryButton}>
        <Icon name="plus" size={18} /> {props.buttonLabel ?? "Record completed care"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit service hours" : "Record completed care"} description={editing ? "Edit this service only. Other services on the same date are unchanged." : "Use this for care that already happened and has no pending schedule. To confirm a planned day, use Review care."}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const value = hours.trim() === "" ? Number.NaN : Number(hours);
              const res = await saveDayHours({ clientId, date, hours: value, serviceId: props.serviceId, expectedHours: props.defaultHours, expectedVersion: props.expectedVersion, requestId, note, confirmDuplicate });
              if (!res.ok) { setDuplicate(res.code === "duplicate"); return setError(res.error); }
              setError("");
              setOpen(false);
              setHours("");
              toast.show(res.message);
              if (props.month && monthOf(date) !== props.month) router.push(`${path}?month=${monthOf(date)}`);
            });
          }}
        >
          <ClientSelect disabled={Boolean(props.defaultClientId)} clients={props.clients} value={clientId} onChange={(v) => { setClientId(v); setError(""); setConfirmDuplicate(false); }} />
          <div>
            <label htmlFor="date" className={labelClass}>Date of service</label>
            <input disabled={editing} id="date" type="date" required max={today()} value={date} onChange={(e) => { setDate(e.target.value); setError(""); setConfirmDuplicate(false); }} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="hours" className={labelClass}>{editing ? "Hours for this service" : "Completed service hours"}</label>
            <div className="relative">
              <input
                id="hours"
                type="number"
                step="0.01"
                min="0.01"
                max="24"
                inputMode="decimal"
                value={hours}
                onChange={(e) => { setHours(e.target.value); setError(""); setConfirmDuplicate(false); }}
                aria-describedby="hours-help"
                className={`${fieldClass} pr-14`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">hours</span>
            </div>
            <p id="hours-help" className="mt-2 text-sm text-muted">
              {existing
                ? existing.submitted
                  ? "This day is marked submitted. If that was a mistake, undo it on the Billing page first."
                  : `Already recorded: ${formatHours(existing.hours)} h on ${date}. ${editing ? "Saving changes this service only." : "A separate service record will be created."}`
                : "Decimals are fine, for example 5.25."}
            </p>
          </div>
          {preview && (
            <div className="rounded-xl bg-brand-soft p-3 text-sm" aria-label="Save preview" aria-live="polite">
              <p className="font-semibold">{formatMonth(preview.month)}</p>
              <Change label="Completed hours" from={preview.before.usedHours} to={preview.after.usedHours} />
              <Change label="Remaining now" from={preview.before.leftHours} to={preview.after.leftHours} bad={preview.after.leftHours < 0} />
              <Change label="Upcoming scheduled" from={preview.before.projectedHours} to={preview.after.projectedHours} />
              <Change label="Remaining after upcoming care" from={preview.before.projectedLeft} to={preview.after.projectedLeft} bad={preview.after.projectedLeft < 0} />
              {projectionNote(preview.after)}
              <p className="mt-1 text-muted">Completed hours reduce Remaining now. They are not yet submitted for billing.</p>
            </div>
          )}
          {<label className={labelClass}>Service note (optional)<input aria-label="Service note" className={fieldClass} value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/></label>}
          {duplicate && <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmDuplicate} onChange={e=>setConfirmDuplicate(e.target.checked)}/>This is a separate service, not a duplicate entry.</label>}
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Saving…" : "Save completed hours"}</button>
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
  const [from, setFrom] = useState(props.defaultDate ?? (props.month && props.month !== monthOf(today()) ? `${props.month}-01` : today()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const month = props.month ?? monthOf(today());
  const mine = props.approvals.filter((a) => a.clientId === clientId);
  const current = monthSummary(mine, props.visits, clientId, month, props.schedule);
  const value = Number(hours);
  const preview =
    hours !== "" && Number.isFinite(value) && value >= 0
      ? monthSummary(
          [...mine, { id: "preview", clientId, monthlyHours: value, effectiveFrom: from, recordedOn: today() }],
          props.visits,
          clientId,
          month,
          props.schedule,
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
              setHours("");
              toast.show(res.message);

            });
          }}
        >
          <ClientSelect disabled={Boolean(props.defaultClientId)} clients={props.clients} value={clientId} onChange={(v) => { setClientId(v); setError(""); }} />
          <p className="text-sm text-muted">Selected month now: {formatHours(current.approvedHours)} h approved, {formatHours(current.usedHours)} h used, {formatHours(current.projectedHours)} h upcoming scheduled.</p>
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
              Selected month becomes {formatHours(preview.approvedHours)} h approved
              {preview.bankedHours > 0 && <> (including {formatHours(preview.bankedHours)} h banked from backdating)</>}. With{" "}
              {formatHours(preview.usedHours)} h used and {formatHours(preview.projectedHours)} h upcoming scheduled,{" "}
              {preview.projectedLeft < 0 ? <strong className="text-bad">that&apos;s {formatHours(-preview.projectedLeft)} h over.</strong> : `${formatHours(preview.projectedLeft)} h would be left.`}
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

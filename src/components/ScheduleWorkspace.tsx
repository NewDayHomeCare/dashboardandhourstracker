"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Client, ScheduledDay } from "@/lib/types";
import { formatHours, repeatDates, type Repeat } from "@/lib/engine";
import { reviewScheduledCare, savePlannedCare } from "@/app/actions";
import { Modal, fieldClass, labelClass, primaryButton, secondaryButton } from "./Modal";

export function PlanCareButton({ clients, schedule, currentDate }: { clients: Client[]; schedule: ScheduledDay[]; currentDate: string }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClient] = useState(clients[0]?.id ?? "");
  const [date, setDate] = useState(currentDate);
  const [hours, setHours] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const replacements = date ? schedule.filter(d => d.clientId === clientId && repeatDates(date, repeat).includes(d.date)).length : 0;
  return <>
    <button className={primaryButton} disabled={!clients.length} onClick={() => { setOpen(true); setError(""); setMessage(""); }}>Schedule care</button>
    {message && <p role="status" className="text-sm text-brand">{message}</p>}
    <Modal open={open} onClose={() => !pending && setOpen(false)} title="Schedule care" description="Enter planned daily hours. They do not become completed hours or a claim until staff confirm the care happened.">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); start(async () => {
        const result = await savePlannedCare({ clientId, date, hours: Number(hours), repeat });
        if (!result.ok) { setError(result.error); return; }
        setOpen(false); setMessage(result.message); router.refresh();
      }); }}>
        <label className={labelClass}>Client<select aria-label="Client" className={fieldClass} value={clientId} onChange={e => setClient(e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>)}</select></label>
        <label className={labelClass}>First service date<input required className={fieldClass} type="date" min={currentDate} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className={labelClass}>Planned hours per day<input required className={fieldClass} type="number" min="0.01" max="24" step="0.01" value={hours} onChange={e => setHours(e.target.value)} /></label>
        <label className={labelClass}>Repeat<select className={fieldClass} value={repeat} onChange={e => setRepeat(e.target.value as Repeat)}><option value="none">Just this day</option><option value="14-days">Daily for 14 days</option><option value="end-of-month">Daily until this month ends</option></select></label>
        {replacements > 0 && <p className="text-sm text-amber-800">Saving replaces the daily planned hours on {replacements} existing scheduled day(s). Completed records are unchanged.</p>}
        {error && <p role="alert" className="text-bad">{error}</p>}
        <button className={primaryButton} disabled={pending}>{pending ? "Saving…" : "Save schedule"}</button>
      </form>
    </Modal>
  </>;
}

export function ScheduleWorkspace({ clients, schedule, review }: { clients: Client[]; schedule: ScheduledDay[]; review: boolean }) {
  const [clientId, setClient] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<ScheduledDay | null>(null);
  const [outcome, setOutcome] = useState<"completed" | "cancelled">("completed");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const visible = schedule.filter(d => (!clientId || d.clientId === clientId) && (!from || d.date >= from) && (!to || d.date <= to));
  const name = (id: string) => { const c = clients.find(c => c.id === id); return c ? `${c.lastName}, ${c.firstName}` : id; };
  function choose(day: ScheduledDay, action: "completed" | "cancelled") {
    setSelected(day); setOutcome(action); setHours(String(day.hours)); setNote(""); setRequestId(crypto.randomUUID()); setError("");
  }
  return <section className="mt-6 rounded-2xl border border-line bg-white p-5">
    <div className="mb-5 flex flex-wrap gap-3">
      <label className="text-sm font-semibold">Client<select aria-label="Client" className={fieldClass} value={clientId} onChange={e => setClient(e.target.value)}><option value="">All clients</option>{clients.map(c => <option key={c.id} value={c.id}>{name(c.id)}</option>)}</select></label>
      <label className="text-sm font-semibold">From<input className={fieldClass} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="text-sm font-semibold">Through<input className={fieldClass} type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button className={secondaryButton} onClick={() => { setClient(""); setFrom(""); setTo(""); }}>Show all dates</button>
    </div>
    {message && <div role="status" className="mb-4 rounded-xl bg-brand-soft p-3">{message} {billingDate && <Link className="font-bold underline" href={`/billing?period=${billingDate}`}>Go to this billing period</Link>}</div>}
    <p className="mb-3 text-sm text-muted">{visible.length} scheduled day(s). One row is the total planned care for a client on that date.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-line"><th className="py-3">Date</th><th>Client</th><th>Planned hours</th><th>Next action</th></tr></thead>
      <tbody>{visible.map(d => <tr className="border-b border-line" key={d.id ?? `${d.clientId}-${d.date}`}><td className="py-4">{d.date}</td><td><Link className="font-semibold text-brand underline" href={`/clients/${d.clientId}?month=${d.date.slice(0,7)}`}>{name(d.clientId)}</Link></td><td>{formatHours(d.hours)} h</td><td className="py-3"><div className="flex flex-wrap gap-2">
        {review && <button className={primaryButton} onClick={() => choose(d, "completed")}>Confirm / adjust hours</button>}
        <button className={secondaryButton} onClick={() => choose(d, "cancelled")}>{review ? "Did not happen / already recorded" : "Cancel planned care"}</button>
      </div></td></tr>)}</tbody></table></div>
    {!visible.length && <p className="py-8 text-muted">{schedule.length ? "No records match these filters. Try Show all dates." : review ? "No scheduled care is waiting for confirmation. Upcoming care appears here when its date arrives." : "No upcoming care entered. Use Schedule care to get started."}</p>}
    <Modal open={selected !== null} onClose={() => !pending && setSelected(null)} title={outcome === "completed" ? "Confirm completed care" : "Dismiss planned care"} description={selected ? `${name(selected.clientId)} · ${selected.date} · planned ${formatHours(selected.hours)} h` : ""}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!selected) return; start(async () => {
        const result = await reviewScheduledCare({ scheduleId: selected.id ?? "", expectedVersion: selected.version ?? 0, outcome, hours: outcome === "completed" ? Number(hours) : undefined, note, requestId });
        if (!result.ok) { setError(result.error); return; }
        setMessage(result.message); setBillingDate(outcome === "completed" ? selected.date : ""); setSelected(null); router.refresh();
      }); }}>
        {outcome === "completed" && <><label className={labelClass}>Actual hours completed<input required className={fieldClass} type="number" min="0.01" max="24" step="0.01" value={hours} onChange={e => setHours(e.target.value)} /></label><p className="text-sm text-muted">If these hours are correct, save them. Otherwise enter the actual hours. Only confirm after care has finished. This creates a service ready for billing; it does not submit a claim.</p></>}
        <label className={labelClass}>{outcome === "completed" ? "Note (optional)" : "Reason (required)"}<textarea required={outcome === "cancelled"} className={fieldClass} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
        {outcome === "cancelled" && <p className="text-sm text-muted">No completed hours will be added. Existing completed services stay unchanged. The reason is saved in change history.</p>}
        {error && <p role="alert" className="text-bad">{error}</p>}
        <button disabled={pending} className={primaryButton}>{pending ? "Saving…" : outcome === "completed" ? "Save completed hours" : "Dismiss schedule"}</button>
      </form>
    </Modal>
  </section>;
}

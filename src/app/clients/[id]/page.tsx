import { BillingHistory } from "@/components/BillingHistory";
import { MonthPicker } from "@/components/MonthPicker";
import { ServiceActions } from "@/components/ServiceActions";
// Client detail: calendar of daily hours and approved-hours history.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovals, getClient, getClients, getVisits, getAudit, getBatches } from "@/lib/data";
import { formatHours, monthSummary } from "@/lib/engine";
import { addDays, daysInMonth, firstOfMonth, formatDate, formatMonth, selectedMonth, today } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Icon";
import { AddHoursButton, EditApprovalButton } from "@/components/HoursDialogs";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const month = selectedMonth((await searchParams).month);
  const allApprovals = getApprovals();
  const allVisits = getVisits();
  const approvals = allApprovals.filter((a) => a.clientId === id);
  const visits = allVisits.filter((v) => v.clientId === id);
  const s = monthSummary(approvals, visits, id, month);
  const pick = getClients().map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }));

  const first = firstOfMonth(month);
  const leadingBlanks = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = addDays(first, i);
    const onDay = visits.filter(v => v.date === date);
    return { date, day: i + 1, hours: onDay.length ? onDay.reduce((sum,v)=>sum+Math.round(v.hours*100),0)/100 : undefined, submitted: onDay.length > 0 && onDay.every(v=>v.submitted), future: date > today() };
  });
  const name = `${client.firstName} ${client.lastName}`;

  return (
    <>
      <Link href={`/?month=${month}`} className="text-sm font-semibold text-brand underline-offset-2 hover:underline">← Hours overview</Link>

      <section className="mb-8 mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Avatar name={name} seed={client.id} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">{client.lastName}, {client.firstName}</h1>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1 text-sm text-muted">Portal ID {client.portalId}</p>
          </div>
        </div>
        <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
          <MonthPicker month={month} />
          <EditApprovalButton key={`approval-${month}`} month={month} clients={pick} approvals={allApprovals} visits={allVisits} defaultClientId={id} />
          <AddHoursButton key={`hours-${month}`} month={month} clients={pick} approvals={allApprovals} visits={allVisits} defaultClientId={id} />
        </div>
      </section>

      <section aria-label="Selected month" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Approved" value={s.approvedHours} />
        <Stat label="Used" value={s.usedHours} />
        <Stat label="Remaining" value={s.leftHours} bad={s.leftHours < 0} />
        <Stat label="Billed" value={s.billedHours} />
        <Stat label="Unbilled" value={s.unbilledHours} />
      </section>

      <section aria-label="Service records" className="mb-6 overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-bold">Service records - {formatMonth(month)}</h2>
        <p className="mt-2 mb-4 text-sm text-muted">Used = billed + unbilled. Billed means submitted in the portal, not paid. Each row is one service. Multiple services on the same date can have different billing states.</p>
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead><tr className="border-b border-line"><th className="py-3">Service date</th><th>Hours</th><th>Billing status / note</th><th>Actions</th></tr></thead>
          <tbody>{visits.filter(v => v.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)).map(v => (
            <tr key={v.id} className="border-b border-line"><td className="py-3">{v.date}</td><td>{formatHours(v.hours)} h</td>
              <td>{v.submitted ? "Billed" : "Unbilled"}<p className="max-w-xs text-xs text-muted break-words">{v.note}</p></td>
              <td><div className="flex flex-wrap items-center gap-2">
                {!v.submitted && <AddHoursButton key={`${v.id}-${v.hours}`} clients={pick} approvals={allApprovals} visits={allVisits}
                  defaultClientId={id} month={month} defaultDate={v.date} defaultHours={v.hours} serviceId={v.id} buttonLabel="Edit" primary={false} />}
                <ServiceActions visit={v} />
              </div></td>
            </tr>
          ))}</tbody>
        </table>
        {!visits.some(v => v.date.startsWith(month)) && <p className="py-6 text-muted">No service records for this month.</p>}
      </section>
      <BillingHistory batches={getBatches().filter(b=>b.clientId===id)} />
      <section className="mb-6 rounded-2xl border border-line bg-white p-5"><h2 className="font-bold">Change history</h2><p className="my-2 text-xs text-muted">Local operator is not authenticated. Historical changes before this upgrade are unavailable.</p><ul className="max-h-72 overflow-y-auto space-y-2">{getAudit(id).slice(0,100).map(event=><li className="border-b py-2 text-sm" key={event.id}><p>{event.at} · {event.action.replaceAll("_"," ")}</p><details className="text-xs text-muted"><summary>Before / after</summary><pre className="overflow-x-auto whitespace-pre-wrap">{event.beforeJson ?? "—"}{"\n→\n"}{event.afterJson ?? "—"}</pre></details></li>)}</ul></section>
      <div className="flex flex-wrap gap-6">
        <section aria-labelledby="cal-title" className="min-w-0 flex-[999_1_480px] rounded-2xl border border-line bg-white p-5">
          <h2 id="cal-title" className="mb-4 text-base font-bold text-slate-900">{formatMonth(month)}</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}
            {days.map((d) => (
              <div
                key={d.date}
                className={`flex min-h-16 flex-col rounded-lg border p-1.5 text-xs ${
                  d.hours ? (d.submitted ? "border-slate-300 bg-slate-50" : "border-brand bg-brand-soft") : "border-line"
                } ${d.future ? "opacity-50" : ""}`}
              >
                <span className="text-muted">{d.day}</span>
                {d.hours !== undefined && (
                  <span className={`mt-auto text-sm font-semibold ${d.submitted ? "text-slate-600" : "text-brand-dark"}`}>
                    {formatHours(d.hours)} h
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Blue = not billed yet. Grey = submitted in the portal.</p>
        </section>

        <section aria-labelledby="hist-title" className="flex flex-[1_1_300px] flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h2 id="hist-title" className="text-base font-bold text-slate-900">Approved hours history</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {[...approvals].reverse().map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3">
                <div className="font-semibold text-slate-800">{formatHours(a.monthlyHours)} h / month from {formatDate(a.effectiveFrom)}</div>
                <div className="text-muted">Entered {formatDate(a.recordedOn)}{a.note ? ` · ${a.note}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${bad ? "text-bad" : "text-slate-900"}`}>{formatHours(value)} h</p>
    </div>
  );
}

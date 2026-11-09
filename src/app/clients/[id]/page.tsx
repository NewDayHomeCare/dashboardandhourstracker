import { requireStaffPage } from "@/lib/auth/staffSession";
import { BillingHistory } from "@/components/BillingHistory";
import { MonthPicker } from "@/components/MonthPicker";
import { ServiceActions } from "@/components/ServiceActions";
// Client detail: calendar of daily hours and approved-hours history.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovals, getClient, getClients, getVisits, getAudit, getBatches, getSchedule } from "@/lib/data";
import { formatHours, monthSummary } from "@/lib/engine";
import { addDays, daysInMonth, firstOfMonth, formatDate, formatMonth, selectedMonth, today } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { HoursBar } from "@/components/HoursBar";
import { Avatar } from "@/components/Icon";
import { AddHoursButton, EditApprovalButton } from "@/components/HoursDialogs";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const month = selectedMonth((await searchParams).month);
  const allApprovals = await getApprovals();
  const allVisits = await getVisits();
  const approvals = allApprovals.filter((a) => a.clientId === id);
  const visits = allVisits.filter((v) => v.clientId === id);
  const [clients,batches,audit,allSchedule] = await Promise.all([getClients(),getBatches(),getAudit(id),getSchedule()]);
  const schedule = allSchedule.filter((d) => d.clientId === id);
  const s = monthSummary(approvals, visits, id, month, schedule);
  const upcoming = schedule.filter((d) => d.date.startsWith(month) && d.date > today());
  const pick = clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }));

  const first = firstOfMonth(month);
  const leadingBlanks = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = addDays(first, i);
    const onDay = visits.filter(v => v.date === date);
    const future = date > today();
    const planned = future ? schedule.find(d => d.date === date)?.hours : undefined;
    return { date, day: i + 1, hours: onDay.length ? onDay.reduce((sum,v)=>sum+Math.round(v.hours*100),0)/100 : planned, submitted: onDay.length > 0 && onDay.every(v=>v.submitted), scheduled: !onDay.length && planned !== undefined, future };
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
          <EditApprovalButton key={`approval-${month}`} month={month} clients={pick} approvals={allApprovals} visits={allVisits} schedule={allSchedule} defaultClientId={id} />
          <AddHoursButton key={`hours-${month}`} month={month} clients={pick} approvals={allApprovals} visits={allVisits} schedule={allSchedule} defaultClientId={id} />
        </div>
      </section>

      <section aria-label="Selected month" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Monthly allowance" value={s.approvedHours} sub={s.bankedHours > 0 ? `includes ${formatHours(s.bankedHours)} h banked` : undefined} />
        <Stat label="Completed hours" value={s.usedHours} sub={`${formatHours(s.billedHours)} submitted · ${formatHours(s.unbilledHours)} not submitted`} />
        <Stat label="Remaining now" value={s.leftHours} bad={s.leftHours < 0} sub="allowance − completed hours" />
        <Stat label="Upcoming scheduled" value={s.projectedHours} sub="Entered care after today; no estimates" />
        <Stat label={s.projectedLeft < 0 ? "Over after upcoming care" : "Remaining after upcoming care"} value={Math.abs(s.projectedLeft)} bad={s.projectedLeft < 0} />
      </section>
      <div className="mb-6 rounded-2xl border border-line bg-white p-5">
        <HoursBar s={s} width="w-full" />
        <p className="mt-2 text-sm text-muted">
          {formatHours(s.usedHours)} h completed + {formatHours(s.projectedHours)} h upcoming scheduled = {formatHours(s.projectedTotal)} h of {formatHours(s.approvedHours)} h approved
        </p>
      </div>

      <section aria-label="Service records" className="mb-6 overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-bold">Service records - {formatMonth(month)}</h2>
        <p className="mt-2 mb-4 text-sm text-muted">Completed hours include both submitted and not submitted services. Submitted does not mean paid. Each row is one service. Multiple services on the same date can have different billing states.</p>
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead><tr className="border-b border-line"><th className="py-3">Service date</th><th>Hours</th><th>Billing status / note</th><th>Actions</th></tr></thead>
          <tbody>{visits.filter(v => v.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)).map(v => (
            <tr key={v.id} className="border-b border-line"><td className="py-3">{v.date}</td><td>{formatHours(v.hours)} h</td>
              <td>{v.submitted ? "Submitted" : "Not submitted"}<p className="max-w-xs text-xs text-muted break-words">{v.note}</p></td>
              <td><div className="flex flex-wrap items-center gap-2">
                {!v.submitted && <AddHoursButton key={`${v.id}-${v.hours}`} clients={pick} approvals={allApprovals} visits={allVisits} schedule={allSchedule}
                  defaultClientId={id} month={month} defaultDate={v.date} defaultHours={v.hours} serviceId={v.id} expectedVersion={v.version} buttonLabel="Edit" primary={false} />}
                <ServiceActions visit={v} />
              </div></td>
            </tr>
          ))}</tbody>
        </table>
        {!visits.some(v => v.date.startsWith(month)) && <p className="py-6 text-muted">No service records for this month.</p>}
      </section>
      <section aria-label="Scheduled care" className="mb-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-bold">Scheduled care - {formatMonth(month)}</h2>
        <p className="mt-2 mb-4 text-sm text-muted">Days after today. Arrange care on the Schedule page; confirm actual hours on Review care.</p>
        <p className="mb-4 flex gap-4"><Link className="font-semibold text-brand underline" href="/schedule">Schedule care</Link><Link className="font-semibold text-brand underline" href="/review">Review due care ({schedule.filter(d => d.date <= today()).length})</Link></p>
        {upcoming.length ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {upcoming.map((d) => (
              <li key={d.date} className="flex items-center gap-1 rounded-lg border border-dashed border-brand py-1 pl-3 pr-1">
                <span>{formatDate(d.date)} · {formatHours(d.hours)} h</span>
                <Link href="/schedule" className="px-2 text-brand underline">Manage</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing scheduled after today this month.</p>
        )}
      </section>
      <BillingHistory batches={batches.filter(b=>b.clientId===id)} />
      <section className="mb-6 rounded-2xl border border-line bg-white p-5"><h2 className="font-bold">Change history</h2><p className="my-2 text-xs text-muted">New changes identify the authenticated staff account. Older records may show an unauthenticated local operator.</p><ul className="max-h-72 overflow-y-auto space-y-2">{audit.slice(0,100).map(event=><li className="border-b py-2 text-sm" key={event.id}><p>{event.at} · {event.action.replaceAll("_"," ")}</p><details className="text-xs text-muted"><summary>Before / after</summary><pre className="overflow-x-auto whitespace-pre-wrap">{event.beforeJson ?? "—"}{"\n→\n"}{event.afterJson ?? "—"}</pre></details></li>)}</ul></section>
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
                  d.hours === undefined
                    ? "border-line"
                    : d.scheduled
                    ? "border-dashed border-brand bg-white"
                    : d.submitted
                    ? "border-slate-300 bg-slate-50"
                    : "border-brand bg-brand-soft"
                }`}
              >
                <span className="text-muted">{d.day}</span>
                {d.hours !== undefined && (
                  <span className={`mt-auto text-sm font-semibold ${d.submitted ? "text-slate-600" : "text-brand-dark"}`}>
                    {formatHours(d.hours)} h{d.scheduled && <span className="block text-[11px] font-normal text-muted">scheduled</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Green = completed, not submitted yet. Grey = submitted in the portal. Dashed = scheduled.</p>
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

function Stat({ label, value, bad, sub }: { label: string; value: number; bad?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${bad ? "text-bad" : "text-slate-900"}`}>{formatHours(value)} h</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

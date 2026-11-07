// Client detail: calendar of daily hours and approved-hours history.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovals, getClient, getClients, getVisits } from "@/lib/data";
import { formatHours, monthSummary } from "@/lib/engine";
import { addDays, daysInMonth, firstOfMonth, formatDate, formatMonth, monthOf, today } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Icon";
import { AddHoursButton, EditApprovalButton } from "@/components/HoursDialogs";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const month = monthOf(today());
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
    const v = visits.find((x) => x.date === date);
    return { date, day: i + 1, hours: v?.hours, submitted: v?.submitted, future: date > today() };
  });
  const name = `${client.firstName} ${client.lastName}`;

  return (
    <>
      <Link href="/" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">← Hours overview</Link>

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
        <div className="flex flex-col gap-3 sm:flex-row">
          <EditApprovalButton clients={pick} approvals={allApprovals} visits={allVisits} defaultClientId={id} />
          <AddHoursButton clients={pick} approvals={allApprovals} visits={allVisits} defaultClientId={id} />
        </div>
      </section>

      <section aria-label="This month" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Approved this month" value={s.approvedHours} />
        <Stat label="Used" value={s.usedHours} />
        <Stat label="Remaining" value={s.leftHours} bad={s.leftHours < 0} />
        <Stat label="Banked from backdated change" value={s.bankedHours} />
      </section>

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

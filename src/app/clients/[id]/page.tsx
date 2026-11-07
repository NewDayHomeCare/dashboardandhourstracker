// Client detail: calendar of daily hours, approval history, editing approved hours. (Person C.)

import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovals, getClient, getVisits } from "@/lib/data";
import { formatHours, monthSummary } from "@/lib/engine";
import { addDays, daysInMonth, firstOfMonth, formatDate, formatMonth, monthOf, today } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { EditHoursForm } from "@/components/EditHoursForm";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const month = monthOf(today());
  const approvals = getApprovals().filter((a) => a.clientId === id);
  const visits = getVisits().filter((v) => v.clientId === id);
  const s = monthSummary(approvals, visits, id, month);

  const first = firstOfMonth(month);
  const leadingBlanks = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = addDays(first, i);
    const v = visits.find((x) => x.date === date);
    return { date, day: i + 1, hours: v?.hours, submitted: v?.submitted, future: date > today() };
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-brand underline">← All clients</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{client.lastName}, {client.firstName}</h1>
        <StatusBadge status={s.status} />
        <span className="text-sm text-muted">Portal ID {client.portalId}</span>
      </div>

      <section aria-label="This month" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Approved this month" value={s.approvedHours} />
        <Stat label="Used" value={s.usedHours} />
        <Stat label="Left" value={s.leftHours} bad={s.leftHours < 0} />
        <Stat label="Banked from backdated change" value={s.bankedHours} />
      </section>

      <div className="flex flex-wrap gap-6">
        <section aria-label="Daily hours" className="min-w-0 flex-[999_1_480px] rounded-xl border border-line bg-white p-4">
          <h2 className="mb-3 text-lg font-bold">{formatMonth(month)}</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}
            {days.map((d) => (
              <div
                key={d.date}
                className={`flex min-h-16 flex-col rounded-md border p-1.5 text-xs ${
                  d.hours ? "border-brand bg-brand-soft" : "border-line"
                } ${d.future ? "opacity-50" : ""}`}
              >
                <span className="text-muted">{d.day}</span>
                {d.hours !== undefined && (
                  <span className="mt-auto text-sm font-semibold text-brand-dark">{formatHours(d.hours)} h</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Approved hours history" className="flex flex-[1_1_300px] flex-col gap-3 rounded-xl border border-line bg-white p-4">
          <h2 className="text-lg font-bold">Approved hours history</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {[...approvals].reverse().map((a) => (
              <li key={a.id} className="rounded-lg border border-line p-3">
                <div className="font-semibold">{a.monthlyHours} h / month from {formatDate(a.effectiveFrom)}</div>
                <div className="text-muted">Entered {formatDate(a.recordedOn)}{a.note ? ` · ${a.note}` : ""}</div>
              </li>
            ))}
          </ul>
          <EditHoursForm clientId={id} month={month} approvals={approvals} visits={visits} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className={`text-2xl font-bold tabular-nums ${bad ? "text-bad" : "text-brand-dark"}`}>{formatHours(value)}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

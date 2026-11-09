import { requireStaffPage } from "@/lib/auth/staffSession";
import Link from "next/link";
import { MonthPicker } from "@/components/MonthPicker";
import { UnbilledQueue } from "@/components/UnbilledQueue";
// Hours overview: every client's hours this month. Design from the Figma Make prototype.

import { getApprovals, getClients, getSchedule, getVisits } from "@/lib/data";
import { daysLeftToBill, deadlineStatus, formatHours, monthSummary, oldestUnsubmitted } from "@/lib/engine";
import { formatMonth, selectedMonth, today } from "@/lib/dates";
import { ClientTable, type ClientRow } from "@/components/ClientTable";
import { EditApprovalButton } from "@/components/HoursDialogs";

export const dynamic = "force-dynamic";

export default async function Overview({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireStaffPage();
  const month = selectedMonth((await searchParams).month);
  const clients = await getClients();
  const approvals = await getApprovals();
  const visits = await getVisits();
  const schedule = await getSchedule();

  const rows: ClientRow[] = clients.map((c) => {
    const oldest = oldestUnsubmitted(visits, c.id);
    return {
      client: c,
      lastServiceDate: visits.filter(v => v.clientId === c.id && v.date.startsWith(month)).map(v => v.date).sort().at(-1) ?? null,
      summary: monthSummary(approvals, visits, c.id, month, schedule),
      deadline: oldest ? { status: deadlineStatus(oldest.date), daysLeft: daysLeftToBill(oldest.date) } : null,
    };
  });

  const used = rows.reduce((t, r) => t + r.summary.usedHours, 0);
  const projected = rows.reduce((t, r) => t + r.summary.projectedHours, 0);
  const approved = rows.reduce((t, r) => t + r.summary.approvedHours, 0);
  const goingOver = rows.filter((r) => r.summary.status === "over" || r.summary.status === "will-go-over");
  const unused = rows.filter((r) => r.summary.projectedLeft > 0);
  const unusedHours = unused.reduce((t, r) => t + Math.max(r.summary.projectedLeft, 0), 0);
  const billingRisk = rows.filter((r) => r.deadline && r.deadline.status !== "ok").length;
  const pick = clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }));

  return (
    <>
      <section className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div className="min-w-0 xl:max-w-[540px]">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-brand">Client management</p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-[34px]">Hours overview</h1>
          <p className="mt-2 text-sm text-muted">
            {formatMonth(month)} · track completed care and upcoming scheduled hours. Unused hours don&apos;t carry over.
          </p>
        </div>
        <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
          <MonthPicker month={month} />
          <EditApprovalButton key={`approval-${month}`} month={month} clients={pick} approvals={approvals} visits={visits} schedule={schedule} />
        </div>
      </section>

      <nav aria-label="Next tasks" className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-line bg-white p-5">
        <Link href="/review" className="font-bold text-brand underline">Review {schedule.filter(d => d.date <= today()).length} scheduled day(s)</Link>
        <Link href="/billing" className="font-bold text-brand underline">Prepare billing</Link>
        <Link href="/schedule" className="font-bold text-brand underline">Arrange upcoming care</Link>
      </nav>
      <section aria-label="Summary" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Completed hours this month" value={formatHours(used)} sub={`+ ${formatHours(projected)} h upcoming scheduled, of ${formatHours(approved)} h approved · ${clients.length} clients`} />
        <Tile label="Over allowance / at risk" value={String(goingOver.length)} sub="clients whose completed or scheduled care exceeds their allowance" tone={goingOver.length ? "bad" : undefined} />
        <Tile label="Hours available after upcoming care" value={formatHours(unusedHours)} sub={`across ${unused.length} clients`} />
        <Tile label="Billing deadlines (all months)" value={String(billingRisk)} sub="clients with urgent, approaching or expired deadlines" tone={billingRisk ? "bad" : undefined} />
      </section>

      <p className="mb-3 text-sm text-muted">Remaining now = monthly allowance − completed hours. Upcoming scheduled care is shown separately and includes only dates after today. No historical estimates. Submitting a claim does not deduct hours again.</p>

      <UnbilledQueue visits={visits} clients={clients} />
      <ClientTable rows={rows} month={month} />
    </>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "bad" }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
        {sub && <p className="text-xs font-medium text-muted">{sub}</p>}
      </div>
    </div>
  );
}

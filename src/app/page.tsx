import { MonthPicker } from "@/components/MonthPicker";
// Hours overview: every client's hours this month. Design from the Figma Make prototype.

import { getApprovals, getClients, getVisits } from "@/lib/data";
import { daysLeftToBill, deadlineStatus, formatHours, monthSummary, oldestUnsubmitted } from "@/lib/engine";
import { formatMonth, selectedMonth } from "@/lib/dates";
import { ClientTable, type ClientRow } from "@/components/ClientTable";
import { AddHoursButton, EditApprovalButton } from "@/components/HoursDialogs";

export const dynamic = "force-dynamic";

export default async function Overview({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = selectedMonth((await searchParams).month);
  const clients = getClients();
  const approvals = getApprovals();
  const visits = getVisits();

  const rows: ClientRow[] = clients.map((c) => {
    const oldest = oldestUnsubmitted(visits.filter(v => v.date.startsWith(month)), c.id);
    return {
      client: c,
      lastServiceDate: visits.filter(v => v.clientId === c.id && v.date.startsWith(month)).map(v => v.date).sort().at(-1) ?? null,
      summary: monthSummary(approvals, visits, c.id, month),
      deadline: oldest ? { status: deadlineStatus(oldest.date), daysLeft: daysLeftToBill(oldest.date) } : null,
    };
  });

  const used = rows.reduce((s, r) => s + r.summary.usedHours, 0);
  const approved = rows.reduce((s, r) => s + r.summary.approvedHours, 0);
  const needAttention = rows.filter((r) => r.summary.status !== "ok").length;
  const billingRisk = rows.filter((r) => r.deadline && r.deadline.status !== "ok").length;
  const pick = clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }));

  return (
    <>
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-brand">Client management</p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-[34px]">Hours overview</h1>
          <p className="mt-2 text-sm text-muted">
            {formatMonth(month)} · unused hours don&apos;t carry over to next month.
          </p>
        </div>
        <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
          <MonthPicker month={month} />
          <EditApprovalButton key={`approval-${month}`} month={month} clients={pick} approvals={approvals} visits={visits} />
          <AddHoursButton key={`hours-${month}`} month={month} clients={pick} approvals={approvals} visits={visits} />
        </div>
      </section>

      <section aria-label="Summary" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Active clients" value={String(clients.length)} />
        <Tile label="Hours used this month" value={formatHours(used)} sub={`of ${formatHours(approved)} h approved`} />
        <Tile label="Clients needing attention" value={String(needAttention)} sub="over approved or running low" tone={needAttention ? "warn" : undefined} />
        <Tile label="Near the 60-day billing limit" value={String(billingRisk)} sub="bill these first" tone={billingRisk ? "bad" : undefined} />
      </section>

      <p className="mb-3 text-sm text-muted">Used = billed + unbilled. Remaining = approved - used. Billed means submitted, not paid.</p>
      <ClientTable rows={rows} month={month} />
    </>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "bad" }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
        {sub && <p className="text-xs font-medium text-muted">{sub}</p>}
      </div>
    </div>
  );
}

// Overview: every client's hours for the current month. (Person B owns this screen.)

import { getApprovals, getClients, getVisits } from "@/lib/data";
import { daysLeftToBill, deadlineStatus, monthSummary, oldestUnsubmitted } from "@/lib/engine";
import { formatMonth, monthOf, today } from "@/lib/dates";
import { ClientTable, type ClientRow } from "@/components/ClientTable";

export default function Overview() {
  const month = monthOf(today());
  const approvals = getApprovals();
  const visits = getVisits();

  const rows: ClientRow[] = getClients().map((c) => {
    const oldest = oldestUnsubmitted(visits, c.id);
    return {
      client: c,
      summary: monthSummary(approvals, visits, c.id, month),
      deadline: oldest
        ? { status: deadlineStatus(oldest.date), daysLeft: daysLeftToBill(oldest.date) }
        : null,
    };
  });

  const count = (s: string) => rows.filter((r) => r.summary.status === s).length;
  const billingRisk = rows.filter((r) => r.deadline && r.deadline.status !== "ok").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Client hours · {formatMonth(month)}</h1>
        <p className="text-muted">Unused hours do not carry over to next month.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="On track" value={count("ok")} />
        <Tile label="Running low" value={count("low")} tone="warn" />
        <Tile label="Over approved" value={count("over")} tone="bad" />
        <Tile label="Near 60-day limit" value={billingRisk} tone={billingRisk ? "bad" : undefined} />
      </section>

      <ClientTable rows={rows} />
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-brand-dark";
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { Client, ClientStatus, DeadlineStatus, MonthSummary } from "@/lib/types";
import { formatHours } from "@/lib/engine";
import { DeadlineBadge, StatusBadge } from "./StatusBadge";

export interface ClientRow {
  client: Client;
  summary: MonthSummary;
  deadline: { status: DeadlineStatus; daysLeft: number } | null;
}

const FILTERS: { key: ClientStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "over", label: "Over approved" },
  { key: "low", label: "Running low" },
  { key: "ok", label: "On track" },
];

const ORDER: Record<ClientStatus, number> = { over: 0, low: 1, ok: 2 };

export function ClientTable({ rows }: { rows: ClientRow[] }) {
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const shown = rows
    .filter((r) => filter === "all" || r.summary.status === filter)
    .sort(
      (a, b) =>
        ORDER[a.summary.status] - ORDER[b.summary.status] ||
        a.summary.leftHours - b.summary.leftHours,
    );

  return (
    <section aria-label="Clients" className="flex flex-col gap-3">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`min-h-11 rounded-lg border px-4 text-sm ${
              filter === f.key ? "border-brand bg-brand text-white" : "border-line bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="border-b border-line p-3">Client</th>
              <th className="border-b border-line p-3 text-right">Approved (h)</th>
              <th className="border-b border-line p-3 text-right">Used (h)</th>
              <th className="border-b border-line p-3 text-right">Left (h)</th>
              <th className="border-b border-line p-3 text-right">Banked (h)</th>
              <th className="border-b border-line p-3">Status</th>
              <th className="border-b border-line p-3">Oldest unbilled day</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ client, summary, deadline }) => (
              <tr key={client.id} className="border-b border-line last:border-0">
                <td className="p-3">
                  <Link href={`/clients/${client.id}`} className="font-semibold text-brand underline">
                    {client.lastName}, {client.firstName}
                  </Link>
                </td>
                <td className="p-3 text-right tabular-nums">{formatHours(summary.approvedHours)}</td>
                <td className="p-3 text-right tabular-nums">{formatHours(summary.usedHours)}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${summary.leftHours < 0 ? "text-bad" : ""}`}>
                  {formatHours(summary.leftHours)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {summary.bankedHours ? formatHours(summary.bankedHours) : "—"}
                </td>
                <td className="p-3"><StatusBadge status={summary.status} /></td>
                <td className="p-3">
                  {deadline ? <DeadlineBadge status={deadline.status} daysLeft={deadline.daysLeft} /> : "All billed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

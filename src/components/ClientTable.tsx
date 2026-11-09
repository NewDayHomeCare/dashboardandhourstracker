"use client";

// Client hour tracking table from the Figma Make design: used + projected against approved.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Client, ClientStatus, DeadlineStatus, MonthSummary } from "@/lib/types";
import { formatHours } from "@/lib/engine";
import { DeadlineBadge, STATUS_LABEL, StatusBadge } from "./StatusBadge";
import { HoursBar } from "./HoursBar";
import { Avatar, Icon } from "./Icon";

export interface ClientRow {
  client: Client;
  lastServiceDate: string | null;
  summary: MonthSummary;
  deadline: { status: DeadlineStatus; daysLeft: number } | null;
}

const FILTERS: (ClientStatus | "all")[] = ["all", "over", "will-go-over", "unused", "on-track"];
const ORDER: Record<ClientStatus, number> = { over: 0, "will-go-over": 1, unused: 2, "on-track": 3 };
const SOURCE: Record<MonthSummary["projectionSource"], string> = {
  schedule: "scheduled",
  none: "—",
};

export function ClientTable({ rows, month }: { rows: ClientRow[]; month: string }) {
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || r.summary.status === filter)
      .filter((r) => `${r.client.firstName} ${r.client.lastName} ${r.client.portalId}`.toLowerCase().includes(q))
      .sort((a, b) => ORDER[a.summary.status] - ORDER[b.summary.status] || a.summary.projectedLeft - b.summary.projectedLeft);
  }, [rows, filter, search]);

  return (
    <section aria-labelledby="table-title" className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_3px_16px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-4 border-b border-line p-5 xl:flex-row xl:items-center sm:px-6">
        <div>
          <h2 id="table-title" className="text-base font-bold text-slate-900">Client hour tracking</h2>
          <p className="mt-1 text-sm text-muted">See what remains now and how upcoming care changes the balance.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold ${
                  filter === f ? "border-brand bg-brand text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? "All" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="relative sm:w-[240px]">
            <label htmlFor="search" className="sr-only">Search clients</label>
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or ID"
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-500 focus:border-brand focus:bg-white focus:ring-3 focus:ring-brand-soft"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              <th className="px-6 py-4">Client</th>
              <th className="px-4 py-4">Last service</th>
              <th className="px-4 py-4 text-right">Monthly allowance</th>
              <th className="px-4 py-4 text-right">Completed hours</th>
              <th className="px-4 py-4 text-right">Upcoming scheduled</th>
              <th className="px-4 py-4">
                Remaining now
                <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal">Allowance − completed hours</span>
              </th>
              <th className="px-4 py-4">Billing deadline (all months)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map(({ client, summary: s, deadline, lastServiceDate }) => {
              const name = `${client.firstName} ${client.lastName}`;
              const overBy = -s.leftHours;
              return (
                <tr key={client.id} className="transition-colors hover:bg-brand-soft/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} seed={client.id} />
                      <div>
                        <Link href={`/clients/${client.id}?month=${month}`} className="whitespace-nowrap text-sm font-bold text-slate-800 underline-offset-2 hover:text-brand hover:underline">
                          {client.lastName}, {client.firstName}
                        </Link>
                        <p className="whitespace-nowrap text-xs text-muted">{client.portalId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-muted">{lastServiceDate ?? "No service"}</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold tabular-nums text-slate-700">{formatHours(s.approvedHours)} h</td>
                  <td className="px-4 py-4 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-700">{formatHours(s.usedHours)} h</span>
                    <span className="block whitespace-nowrap text-xs text-muted">{formatHours(s.billedHours)} submitted · {formatHours(s.unbilledHours)} not submitted</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-brand-dark">{formatHours(s.projectedHours)} h</span>
                    <span className="block whitespace-nowrap text-xs text-muted">{s.projectionSource === "none" ? "No upcoming care entered" : SOURCE[s.projectionSource]}</span>
                  </td>
                  <td className="w-[220px] px-4 py-4">
                    <span className={`block text-sm font-bold tabular-nums ${overBy > 0 ? "text-bad" : "text-slate-800"}`}>
                      {overBy > 0 ? `${formatHours(overBy)} h over` : `${formatHours(s.leftHours)} h left`}
                    </span>
                    <p className={`mt-1 text-xs ${s.projectedLeft < 0 ? "text-bad" : "text-muted"}`}>After upcoming care: {s.projectedLeft < 0 ? `${formatHours(-s.projectedLeft)} h over allowance` : `${formatHours(s.projectedLeft)} h left`}</p>
                    <div className="mt-2"><HoursBar s={s} width="w-36" /></div>
                    <div className="mt-2"><StatusBadge status={s.status} /></div>
                  </td>
                  <td className="px-4 py-4">
                    {deadline ? <DeadlineBadge status={deadline.status} daysLeft={deadline.daysLeft} /> : <span className="text-sm text-muted">No pending claims</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div className="grid place-items-center px-6 py-16 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-muted"><Icon name="search" /></div>
            <p className="mt-3 text-sm font-bold text-slate-700">No clients found</p>
            <p className="mt-1 text-sm text-muted">Try a different name, ID or filter.</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 text-sm text-muted">
        <p>Showing {shown.length} of {rows.length} clients</p>
        <p className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-4 rounded-full bg-brand" /> Completed</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-4 rounded-full bg-brand-light" /> Upcoming scheduled</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-4 rounded-full bg-bad" /> Over approved</span>
        </p>
      </div>
    </section>
  );
}

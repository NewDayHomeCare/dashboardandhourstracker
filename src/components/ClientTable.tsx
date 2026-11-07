"use client";

// Client hour tracking table from the Figma Make design, fed by the engine.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Client, ClientStatus, DeadlineStatus, MonthSummary } from "@/lib/types";
import { formatHours } from "@/lib/engine";
import { DeadlineBadge, StatusBadge } from "./StatusBadge";
import { Avatar, Icon } from "./Icon";

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
const BAR: Record<ClientStatus, string> = { over: "bg-bad", low: "bg-amber-500", ok: "bg-brand" };

export function ClientTable({ rows }: { rows: ClientRow[] }) {
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || r.summary.status === filter)
      .filter((r) => `${r.client.firstName} ${r.client.lastName} ${r.client.portalId}`.toLowerCase().includes(q))
      .sort((a, b) => ORDER[a.summary.status] - ORDER[b.summary.status] || a.summary.leftHours - b.summary.leftHours);
  }, [rows, filter, search]);

  return (
    <section aria-labelledby="table-title" className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-line p-5 lg:flex-row lg:items-center sm:px-6">
        <div>
          <h2 id="table-title" className="text-base font-bold text-slate-900">Client hour tracking</h2>
          <p className="mt-1 text-sm text-muted">Most urgent first</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold ${
                  filter === f.key ? "border-brand bg-brand text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-[260px]">
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
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              <th className="px-6 py-4">Client</th>
              <th className="px-5 py-4 text-right">Approved</th>
              <th className="px-5 py-4">Hours used</th>
              <th className="px-5 py-4 text-right">Remaining</th>
              <th className="px-5 py-4 text-right">Banked</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Oldest unbilled day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map(({ client, summary, deadline }) => {
              const name = `${client.firstName} ${client.lastName}`;
              const progress = summary.approvedHours > 0 ? Math.min((summary.usedHours / summary.approvedHours) * 100, 100) : 100;
              return (
                <tr key={client.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} seed={client.id} />
                      <div>
                        <Link href={`/clients/${client.id}`} className="whitespace-nowrap text-sm font-bold text-slate-800 underline-offset-2 hover:text-brand hover:underline">
                          {client.lastName}, {client.firstName}
                        </Link>
                        <p className="whitespace-nowrap text-xs text-muted">{client.portalId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-700">{formatHours(summary.approvedHours)} h</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-sm font-semibold tabular-nums text-slate-700">{formatHours(summary.usedHours)} h</span>
                      <span aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <span className={`block h-full rounded-full ${BAR[summary.status]}`} style={{ width: `${progress}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className={`px-5 py-4 text-right text-sm font-bold tabular-nums ${summary.leftHours < 0 ? "text-bad" : "text-slate-800"}`}>
                    {formatHours(summary.leftHours)} h
                  </td>
                  <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-700">
                    {summary.bankedHours ? `${formatHours(summary.bankedHours)} h` : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={summary.status} /></td>
                  <td className="px-5 py-4">
                    {deadline ? <DeadlineBadge status={deadline.status} daysLeft={deadline.daysLeft} /> : <span className="text-sm text-muted">All billed</span>}
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
      <div className="border-t border-line px-6 py-4">
        <p className="text-sm text-muted">Showing {shown.length} of {rows.length} clients</p>
      </div>
    </section>
  );
}
